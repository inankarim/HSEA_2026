import multer from "multer";
import { ApiError } from "./error.middleware.js";

// Hard ceiling enforced at the very first layer a file passes through.
// Both upload services re-check this again on the raw buffer — never
// trust that every caller went through this exact middleware chain.
export const UPLOAD_MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

const ALLOWED_PICTURE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

function fileFilterFor(allowedMimeTypes) {
  return (req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      // Passing an ApiError here means multer surfaces it as-is via the
      // callback below, instead of a generic multer error we'd have to
      // re-interpret.
      cb(
        new ApiError(
          `Only ${allowedMimeTypes.join(", ")} files are accepted.`,
          422,
        ),
      );
      return;
    }
    cb(null, true);
  };
}

// Memory storage only: nothing touches disk until our own service has
// verified the magic bytes / re-encoded the content. Untrusted uploads
// are never written to disk under a name or path multer chose.
const pdfMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_MAX_SIZE_BYTES, files: 1, fields: 5 },
  fileFilter: fileFilterFor(["application/pdf"]),
});

const pictureMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_MAX_SIZE_BYTES, files: 1, fields: 5 },
  fileFilter: fileFilterFor(ALLOWED_PICTURE_MIME_TYPES),
});

/**
 * Wraps a multer single-file middleware in a promise so it can be awaited
 * inside an asyncHandler-style controller (consistent with the rest of the
 * codebase), and normalizes every failure mode into ApiError so nothing
 * multer-specific ever leaks to the client.
 */
function wrapSingle(multerInstance, fieldName) {
  const bound = multerInstance.single(fieldName);
  return (req, res) =>
    new Promise((resolve, reject) => {
      bound(req, res, (err) => {
        if (!err) return resolve();
        if (err instanceof ApiError) return reject(err);
        if (err.code === "LIMIT_FILE_SIZE") {
          return reject(
            new ApiError("File is too large. Maximum size is 2MB.", 413),
          );
        }
        if (
          err.code === "LIMIT_UNEXPECTED_FILE" ||
          err.code === "LIMIT_FILE_COUNT"
        ) {
          return reject(
            new ApiError("Only one file may be uploaded at a time.", 422),
          );
        }
        return reject(
          new ApiError("Could not process the uploaded file.", 422),
        );
      });
    });
}

/** Await this inside a controller, then read `req.file`. Field name: "file". */
export const receivePdfUpload = wrapSingle(pdfMulter, "file");

/** Await this inside a controller, then read `req.file`. Field name: "photo". */
export const receivePictureUpload = wrapSingle(pictureMulter, "photo");
