import multer from "multer";
import crypto from "node:crypto";
import { env } from "../config/env.js";
import { ApiError } from "./error.middleware.js";
import { MAX_DOCUMENT_SIZE_BYTES } from "../config/documentTypes.js";

/**
 * Deliberately NOT multer.memoryStorage(). Applicant documents are
 * capped at 2MB each, but at ~1,000 concurrent applicants near the
 * deadline, memoryStorage would mean up to ~2GB of request bodies live
 * in the Node.js heap simultaneously in the worst case, plus GC pressure
 * from all those buffers. diskStorage streams the multipart body
 * straight to a temp file on STORAGE_TEMP_DIR as it arrives — Node's
 * memory footprint per upload stays a small, constant-size buffer
 * regardless of file size or concurrency.
 *
 * The destination filename is always server-generated (crypto.randomUUID())
 * — the client's original filename is stored only as metadata
 * (original_filename in submission_documents), never used to construct a
 * filesystem path.
 */
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, env.STORAGE_TEMP_DIR),
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}.part`),
});

const upload = multer({
  storage: diskStorage,
  limits: {
    fileSize: MAX_DOCUMENT_SIZE_BYTES,
    files: 1,
    fields: 5,
  },
});

/**
 * Wraps multer's single-file middleware in a promise, consistent with
 * middleware/upload.middleware.js's wrapSingle() pattern, and normalizes
 * every multer failure mode into ApiError so nothing multer-specific
 * leaks to the client. Field name: "file" (matches Documents.ts'
 * `formData.append("file", file)`).
 */
export const receiveDocumentUpload = (req, res) =>
  new Promise((resolve, reject) => {
    upload.single("file")(req, res, (err) => {
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
      return reject(new ApiError("Could not process the uploaded file.", 422));
    });
  });
