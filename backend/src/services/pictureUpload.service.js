import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ApiError } from "../middleware/error.middleware.js";
import { logger } from "../utils/logger.js";

/**
 * Generic, reusable image upload + verification service (profile photos
 * today; usable for any future "picture" upload — e.g. an engineer's
 * photograph on a submission — via the `purpose` namespace).
 *
 * Accepts JPEG, PNG, and WebP input. Regardless of input format, the
 * stored output is always re-encoded to JPEG — this keeps avatar file
 * sizes small and predictable and means every downstream consumer only
 * ever has to handle one output format.
 *
 * Security model (defense in depth):
 *   1. Route-level rate limiting (see `profilePhotoUploadLimiter` in
 *      middleware/rateLimit.middleware.js).
 *   2. multer rejects anything outside the JPEG/PNG/WebP allowlist and
 *      anything over 2MB before the body is fully buffered.
 *   3. This service re-checks size and magic bytes on the raw buffer —
 *      a client-supplied mimetype is never trusted alone.
 *   4. The buffer is fully DECODED and RE-ENCODED through sharp. This is
 *      the important step: it proves the bytes are a genuine, decodable
 *      image (not just something with a matching signature glued on the
 *      front — a classic polyglot/steganography trick), and the output
 *      file is freshly generated, so nothing from the original byte
 *      stream survives into what's stored on disk.
 *   5. `withMetadata(false)` strips all EXIF/ICC/XMP data — this removes
 *      embedded GPS location and device info (a real privacy leak for a
 *      public-facing avatar), along with the most common metadata-based
 *      exploit surface.
 *   6. Dimensions are bounded on both ends to avoid decompression-bomb
 *      style inputs and degenerate 1x1 images. Animated WebP/PNG is
 *      collapsed to its first frame by the resize/re-encode step.
 *   7. Files are stored under a random UUID name — never the client's
 *      original filename — eliminating path traversal / overwrite risk.
 */

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB — re-checked here on purpose.
const MAX_DIMENSION = 4096;
const MIN_DIMENSION = 64;
const OUTPUT_DIMENSION = 512; // square avatar; generous for any UI size
const OUTPUT_QUALITY = 85;

// Magic-byte signatures, checked against the raw buffer — never the
// client-supplied Content-Type/mimetype, which is only a hint.
const SIGNATURES = [
  {
    format: "jpeg",
    mimeTypes: ["image/jpeg", "image/jpg"],
    test: (b) => b.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
  },
  {
    format: "png",
    mimeTypes: ["image/png"],
    test: (b) =>
      b
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    format: "webp",
    mimeTypes: ["image/webp"],
    test: (b) =>
      b.length >= 12 &&
      b.subarray(0, 4).toString("ascii") === "RIFF" &&
      b.subarray(8, 12).toString("ascii") === "WEBP",
  },
];

const ALLOWED_MIME_TYPES = SIGNATURES.flatMap((s) => s.mimeTypes);

const UPLOAD_ROOT =
  process.env.PICTURE_UPLOAD_DIR ||
  path.resolve(process.cwd(), "uploads", "images");

const PUBLIC_URL_PREFIX =
  process.env.PICTURE_PUBLIC_PREFIX || "/uploads/images";

async function ensureUploadDir(purpose) {
  const dir = path.join(UPLOAD_ROOT, purpose);
  await fs.mkdir(dir, { recursive: true, mode: 0o750 });
  return dir;
}

/** Identifies the image format from magic bytes alone. Throws if none match. */
function detectFormat(buffer) {
  if (!buffer || buffer.length === 0) {
    throw new ApiError("The uploaded file is empty.", 422);
  }
  if (buffer.length > MAX_SIZE_BYTES) {
    throw new ApiError("File is too large. Maximum size is 2MB.", 413);
  }
  const match = SIGNATURES.find((s) => s.test(buffer));
  if (!match) {
    throw new ApiError(
      "The uploaded file is not a valid JPEG, PNG, or WebP image (unexpected file signature).",
      422,
    );
  }
  return match.format;
}

/**
 * Validates, sanitizes, and persists an in-memory JPEG/PNG/WebP upload
 * (from multer's memoryStorage). Returns metadata the caller stores
 * against whatever record the photo belongs to.
 */
export async function storeImageUpload(
  file,
  { ownerId, purpose = "profile-photos" } = {},
) {
  if (!file || !file.buffer) {
    throw new ApiError("No photo was uploaded.", 422);
  }
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new ApiError("Only JPEG, PNG, or WebP photos are accepted.", 422);
  }

  const detectedFormat = detectFormat(file.buffer);

  const probe = sharp(file.buffer, {
    failOn: "error",
    limitInputPixels: 268402689, // sharp's safe default (~16k x 16k pixels)
  });

  let metadata;
  try {
    metadata = await probe.metadata();
  } catch {
    throw new ApiError(
      "The uploaded file could not be read as a valid image.",
      422,
    );
  }

  // sharp's own format detection must agree with our magic-byte check —
  // catches edge cases (e.g. a mislabeled or corrupted container) that a
  // signature match alone wouldn't.
  if (metadata.format !== detectedFormat) {
    throw new ApiError(
      "The uploaded file's contents don't match its format.",
      422,
    );
  }
  if (!metadata.width || !metadata.height) {
    throw new ApiError("The uploaded image is missing dimension data.", 422);
  }
  if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
    throw new ApiError(
      `Image dimensions must not exceed ${MAX_DIMENSION}px.`,
      422,
    );
  }
  if (metadata.width < MIN_DIMENSION || metadata.height < MIN_DIMENSION) {
    throw new ApiError(
      `Image must be at least ${MIN_DIMENSION}px on each side.`,
      422,
    );
  }

  // Decode + re-encode from scratch — see module doc comment above for
  // why. Output is always JPEG regardless of input format, so every
  // consumer of stored photos only ever deals with one format.
  const outputBuffer = await sharp(file.buffer)
    .rotate() // bake in EXIF orientation (JPEG) before we strip metadata entirely
    .resize(OUTPUT_DIMENSION, OUTPUT_DIMENSION, { fit: "cover" })
    .flatten({ background: "#ffffff" }) // PNG/WebP transparency -> solid background (JPEG has no alpha)
    .jpeg({ quality: OUTPUT_QUALITY, progressive: true, mozjpeg: true })
    .withMetadata(false)
    .toBuffer();

  if (outputBuffer.length > MAX_SIZE_BYTES) {
    // Practically unreachable after a resize to 512px, but never assume.
    throw new ApiError(
      "Processed image is too large. Please try a smaller photo.",
      413,
    );
  }

  const dir = await ensureUploadDir(purpose);
  const checksum = crypto
    .createHash("sha256")
    .update(outputBuffer)
    .digest("hex");
  const storedFileName = `${crypto.randomUUID()}.jpg`;
  const storedPath = path.join(dir, storedFileName);

  await fs.writeFile(storedPath, outputBuffer, { mode: 0o640 });

  logger.info("Image upload stored", {
    ownerId: ownerId || null,
    purpose,
    sourceFormat: detectedFormat,
    storedFileName,
    sizeBytes: outputBuffer.length,
    checksum,
  });

  return {
    storedFileName,
    purpose,
    path: storedPath,
    url: `${PUBLIC_URL_PREFIX}/${purpose}/${storedFileName}`,
    mimeType: "image/jpeg",
    sizeBytes: outputBuffer.length,
    checksum,
  };
}

/** Best-effort delete; never throws — callers should not fail a request over cleanup. */
export async function deleteImageUpload(
  storedFileName,
  { purpose = "profile-photos" } = {},
) {
  if (!storedFileName) return;
  const safeName = path.basename(storedFileName);
  try {
    await fs.unlink(path.join(UPLOAD_ROOT, purpose, safeName));
  } catch (err) {
    if (err.code !== "ENOENT") {
      logger.error("Failed to delete image upload", {
        storedFileName,
        purpose,
        error: err.message,
      });
    }
  }
}

export {
  MAX_SIZE_BYTES as PICTURE_MAX_SIZE_BYTES,
  ALLOWED_MIME_TYPES as PICTURE_ALLOWED_MIME_TYPES,
};
