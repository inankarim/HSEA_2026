import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { ApiError } from "../middleware/error.middleware.js";
import { logger } from "../utils/logger.js";

/**
 * Generic, reusable PDF upload + verification service. Not tied to any one
 * feature (submission documents, NID/passport uploads, etc.) — callers pass
 * a `purpose` used only to namespace where files land on disk, plus an
 * `ownerId` used only for logging/auditing.
 *
 * Security model (defense in depth — every layer assumes the one before it
 * may have been bypassed):
 *   1. Route-level rate limiting (see middleware/rateLimit.middleware.js —
 *      `pdfUploadLimiter`) caps how often any one user/IP can call this.
 *   2. multer (middleware/upload.middleware.js) rejects non-"application/pdf"
 *      Content-Type and anything over 2MB before the body is even buffered.
 *   3. This service re-validates size AND inspects the actual bytes: a
 *      client-supplied mimetype/extension is never trusted on its own.
 *   4. The file is never written to disk under a client-supplied name —
 *      we always generate a random UUID filename, eliminating path
 *      traversal and overwrite risks entirely.
 *   5. A small heuristic scan blocks the crudest active-content PDFs
 *      (embedded JavaScript, auto-launch actions). This is NOT a
 *      substitute for real antivirus/CDR scanning — treat it as a cheap
 *      first filter, not a guarantee.
 */

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB — re-checked here on purpose.

const PDF_MAGIC = Buffer.from("%PDF-", "ascii");

const SUSPICIOUS_TOKENS = [
  Buffer.from("/JavaScript"),
  Buffer.from("/JS "),
  Buffer.from("/OpenAction"),
  Buffer.from("/Launch"),
  Buffer.from("/EmbeddedFile"),
];

const UPLOAD_ROOT =
  process.env.PDF_UPLOAD_DIR || path.resolve(process.cwd(), "uploads", "pdf");

async function ensureUploadDir(purpose) {
  const dir = path.join(UPLOAD_ROOT, purpose);
  await fs.mkdir(dir, { recursive: true, mode: 0o750 });
  return dir;
}

function assertValidPdfBuffer(buffer) {
  if (!buffer || buffer.length === 0) {
    throw new ApiError("The uploaded file is empty.", 422);
  }
  if (buffer.length > MAX_SIZE_BYTES) {
    throw new ApiError("File is too large. Maximum size is 2MB.", 413);
  }
  if (!buffer.subarray(0, 5).equals(PDF_MAGIC)) {
    throw new ApiError(
      "The uploaded file is not a valid PDF (unexpected file signature).",
      422,
    );
  }

  // A well-formed PDF ends with an %%EOF marker near the tail of the file.
  const tail = buffer
    .subarray(Math.max(0, buffer.length - 2048))
    .toString("latin1");
  if (!tail.includes("%%EOF")) {
    throw new ApiError(
      "The uploaded file does not look like a complete PDF.",
      422,
    );
  }

  for (const token of SUSPICIOUS_TOKENS) {
    if (buffer.includes(token)) {
      logger.warn("Rejected PDF upload containing an active-content marker", {
        marker: token.toString("latin1"),
      });
      throw new ApiError(
        "This PDF contains embedded active content (scripts, auto-launch actions, or embedded files) and cannot be accepted. Please export a flattened, static PDF.",
        422,
      );
    }
  }
}

/**
 * Validates and persists an in-memory PDF buffer (as produced by multer's
 * memoryStorage). Returns metadata the caller stores against whatever
 * record the PDF belongs to.
 */
export async function storePdfUpload(
  file,
  { ownerId, purpose = "documents" } = {},
) {
  if (!file || !file.buffer) {
    throw new ApiError("No file was uploaded.", 422);
  }
  if (file.mimetype !== "application/pdf") {
    throw new ApiError("Only PDF files are accepted.", 422);
  }

  assertValidPdfBuffer(file.buffer);

  const dir = await ensureUploadDir(purpose);
  const checksum = crypto
    .createHash("sha256")
    .update(file.buffer)
    .digest("hex");
  const storedFileName = `${crypto.randomUUID()}.pdf`;
  const storedPath = path.join(dir, storedFileName);

  await fs.writeFile(storedPath, file.buffer, { mode: 0o640 });

  logger.info("PDF upload stored", {
    ownerId: ownerId || null,
    purpose,
    storedFileName,
    sizeBytes: file.buffer.length,
    checksum,
  });

  return {
    storedFileName,
    purpose,
    path: storedPath,
    mimeType: "application/pdf",
    sizeBytes: file.buffer.length,
    checksum,
  };
}

/** Best-effort delete; never throws — callers should not fail a request over cleanup. */
export async function deletePdfUpload(
  storedFileName,
  { purpose = "documents" } = {},
) {
  if (!storedFileName) return;
  const safeName = path.basename(storedFileName); // strips any path traversal
  try {
    await fs.unlink(path.join(UPLOAD_ROOT, purpose, safeName));
  } catch (err) {
    if (err.code !== "ENOENT") {
      logger.error("Failed to delete PDF upload", {
        storedFileName,
        purpose,
        error: err.message,
      });
    }
  }
}

export { MAX_SIZE_BYTES as PDF_MAX_SIZE_BYTES };
