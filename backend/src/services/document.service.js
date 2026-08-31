import fs from "node:fs";
import fsp from "node:fs/promises";
import crypto from "node:crypto";
import { pool, withTransaction } from "../config/database.js";
import { ApiError } from "../middleware/error.middleware.js";
import { logger } from "../utils/logger.js";
import { metrics } from "../utils/metrics.js";
import { storage } from "../storage/index.js";
import {
  isValidDocumentType,
  isValidMemberDocumentType,
  DOCUMENT_TYPES,
  MEMBER_DOCUMENT_TYPES,
  allowedMimeTypesFor,
  allowedMimeTypesForMember,
} from "../config/documentTypes.js";
import {
  assertSubmissionEditable,
  getSubmissionForAccess,
} from "./submission.service.js";

const PDF_MAGIC = Buffer.from("%PDF-", "ascii");

const IMAGE_SIGNATURES = [
  {
    format: "jpeg",
    ext: ".jpg",
    mime: "image/jpeg",
    test: (b) =>
      b.length >= 3 && b.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
  },
  {
    format: "png",
    ext: ".png",
    mime: "image/png",
    test: (b) =>
      b.length >= 8 &&
      b
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    format: "webp",
    ext: ".webp",
    mime: "image/webp",
    test: (b) =>
      b.length >= 12 &&
      b.subarray(0, 4).toString("ascii") === "RIFF" &&
      b.subarray(8, 12).toString("ascii") === "WEBP",
  },
];

async function readBytes(filePath, start, length) {
  const fh = await fsp.open(filePath, "r");
  try {
    const buf = Buffer.alloc(length);
    const { bytesRead } = await fh.read(buf, 0, length, start);
    return buf.subarray(0, bytesRead);
  } finally {
    await fh.close();
  }
}

/**
 * Validates the file's ACTUAL contents against the document type's
 * allowed kind — never trusts the client-supplied mimetype or the
 * filename extension alone. Reads only small head/tail slices, never the
 * whole file, so this stays cheap even under concurrent load.
 */
async function detectAndValidateSignature(tempPath, def) {
  const head = await readBytes(tempPath, 0, 16);

  if (def.kind === "pdf" || def.kind === "pdf_or_image") {
    if (head.subarray(0, 5).equals(PDF_MAGIC)) {
      const stat = await fsp.stat(tempPath);
      const tailLen = Math.min(2048, stat.size);
      const tail = await readBytes(
        tempPath,
        Math.max(0, stat.size - tailLen),
        tailLen,
      );
      if (!tail.toString("latin1").includes("%%EOF")) {
        throw new ApiError(
          "The uploaded file does not look like a complete PDF.",
          422,
        );
      }
      return { mime: "application/pdf", ext: ".pdf" };
    }
  }

  if (def.kind === "image" || def.kind === "pdf_or_image") {
    const match = IMAGE_SIGNATURES.find((s) => s.test(head));
    if (match) {
      return { mime: match.mime, ext: match.ext };
    }
  }

  throw new ApiError(
    "The uploaded file's contents don't match an accepted format for this document (unexpected file signature).",
    422,
  );
}

/**
 * For images only: a bounded metadata probe (dimensions), NOT a full
 * decode/re-encode. This keeps CPU cost flat and small regardless of how
 * many applicants upload concurrently — unlike the profile-photo
 * pipeline (pictureUpload.service.js), these documents are never served
 * back for public display, so there's no product requirement to strip
 * EXIF or normalize format here.
 */
async function assertReadableImage(tempPath) {
  let sharp;
  try {
    ({ default: sharp } = await import("sharp"));
  } catch {
    // sharp not installed in this environment — skip the dimension probe
    // rather than hard-failing every image upload. Signature validation
    // above still applies.
    return;
  }
  try {
    const meta = await sharp(tempPath, {
      limitInputPixels: 268402689,
    }).metadata();
    if (!meta.width || !meta.height) {
      throw new Error("no-dimensions");
    }
  } catch {
    throw new ApiError(
      "The uploaded file could not be read as a valid image.",
      422,
    );
  }
}

async function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function toPublicDocument(row) {
  return {
    id: row.id,
    documentType: row.document_type,
    memberId: row.submission_member_id || undefined,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    uploadStatus: row.upload_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function safeDiscardTemp(file) {
  if (file?.path) {
    await storage.discardTemp(file.path).catch(() => {});
  }
}

/**
 * Confirms `memberId` is a real submission_members row belonging to
 * `applicationId`. Prevents member 2's upload from ever being attributed
 * to member 1 (or to a member on a different application entirely) — the
 * memberId in the URL is never trusted on its own.
 */
async function fetchMemberRow(applicationId, memberId) {
  const result = await pool.query(
    `SELECT * FROM submission_members WHERE id = $1 AND application_id = $2`,
    [memberId, applicationId],
  );
  if (result.rowCount === 0) {
    throw new ApiError("Team member not found on this submission.", 404);
  }
  return result.rows[0];
}

/**
 * Shared upload pipeline for BOTH application-wide documents and
 * per-member documents. `memberId` is null for application-wide uploads;
 * when non-null, the row is scoped to that team member via
 * submission_member_id and storage is namespaced per-member so member 1's
 * file can never collide with (or be overwritten by) member 2's.
 */
async function uploadDocumentInternal({
  applicationId,
  memberId,
  documentType,
  def,
  file,
  auth,
  allowedMimes,
}) {
  const startedAt = process.hrtime.bigint();
  metrics.activeUploads.inc();
  metrics.documentUploadAttempts.inc({ documentType });

  try {
    // Ownership + editability check BEFORE touching the file further —
    // an unauthorized or already-submitted request should not even reach
    // signature validation.
    try {
      await assertSubmissionEditable(applicationId, auth);
    } catch (err) {
      await safeDiscardTemp(file);
      throw err;
    }

    if (memberId) {
      try {
        await fetchMemberRow(applicationId, memberId);
      } catch (err) {
        await safeDiscardTemp(file);
        throw err;
      }
    }

    if (!file || !file.path) {
      throw new ApiError("No file was uploaded.", 422);
    }

    const stat = await fsp.stat(file.path);
    if (stat.size === 0) {
      await safeDiscardTemp(file);
      throw new ApiError("The uploaded file is empty.", 422);
    }
    // Also enforced by multer's `limits.fileSize`, checked again here in
    // case a caller ever constructs `file` outside that middleware.
    if (stat.size > 2 * 1024 * 1024) {
      await safeDiscardTemp(file);
      throw new ApiError("File is too large. Maximum size is 2MB.", 413);
    }

    if (!allowedMimes.includes(file.mimetype)) {
      await safeDiscardTemp(file);
      throw new ApiError(
        `Only ${allowedMimes.join(", ")} files are accepted for this document.`,
        422,
      );
    }

    let signature;
    try {
      signature = await detectAndValidateSignature(file.path, def);
    } catch (err) {
      await safeDiscardTemp(file);
      throw err;
    }

    if (
      def.kind === "image" ||
      (def.kind === "pdf_or_image" && signature.ext !== ".pdf")
    ) {
      try {
        await assertReadableImage(file.path);
      } catch (err) {
        await safeDiscardTemp(file);
        throw err;
      }
    }

    const checksum = await sha256File(file.path);

    // Storage "slot" key: for member documents this is namespaced by
    // memberId so it can never collide with the application-wide slot of
    // the same document_type, or with another member's file. We don't
    // touch LocalFileStorage.js's internals — this just reuses its
    // existing (applicationId, slotKey, ext) -> storagePath contract.
    const slotKey = memberId ? `MEMBER-${memberId}-${documentType}` : documentType;

    // Commit to final storage BEFORE the DB write. If the DB write then
    // fails, we clean up this newly-committed file in the catch below —
    // but we never delete the applicant's previous, still-valid file
    // until the new row is safely persisted.
    const committed = await storage.commit(
      file.path,
      applicationId,
      slotKey,
      signature.ext,
    );

    let previousStoragePath = null;
    try {
      const txResult = await withTransaction(async (client) => {
        const existing = await client.query(
          memberId
            ? `SELECT storage_path FROM submission_documents
                 WHERE application_id = $1 AND document_type = $2 AND submission_member_id = $3`
            : `SELECT storage_path FROM submission_documents
                 WHERE application_id = $1 AND document_type = $2 AND submission_member_id IS NULL`,
          memberId
            ? [applicationId, documentType, memberId]
            : [applicationId, documentType],
        );
        const prevPath = existing.rows[0]?.storage_path || null;

        const result = await client.query(
          `INSERT INTO submission_documents
             (application_id, document_type, submission_member_id, original_filename, stored_filename,
              mime_type, file_size, sha256_checksum, storage_path, upload_status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'UPLOADED')
           ON CONFLICT ${
             // Two DIFFERENT partial unique indexes exist (migration 012):
             //   idx_submission_documents_app_type_member  (application_id, document_type, submission_member_id) WHERE submission_member_id IS NOT NULL
             //   idx_submission_documents_app_type_global  (application_id, document_type)                       WHERE submission_member_id IS NULL
             // Postgres requires the ON CONFLICT target to match one of
             // these exactly (same columns AND same predicate) to infer
             // it, so the target itself — not just a WHERE clause — has
             // to branch on whether this is a member document.
             memberId
               ? "(application_id, document_type, submission_member_id) WHERE submission_member_id IS NOT NULL"
               : "(application_id, document_type) WHERE submission_member_id IS NULL"
           }
           DO UPDATE SET
             original_filename = EXCLUDED.original_filename,
             stored_filename   = EXCLUDED.stored_filename,
             mime_type         = EXCLUDED.mime_type,
             file_size         = EXCLUDED.file_size,
             sha256_checksum   = EXCLUDED.sha256_checksum,
             storage_path      = EXCLUDED.storage_path,
             upload_status     = 'UPLOADED',
             updated_at        = now()
           RETURNING *`,
          [
            applicationId,
            documentType,
            memberId || null,
            file.originalname || "document",
            committed.storedFilename,
            signature.mime,
            committed.sizeBytes,
            checksum,
            committed.storagePath,
          ],
        );
        return { row: result.rows[0], prevPath };
      });
      previousStoragePath = txResult.prevPath;

      // Only now, after the DB is committed, remove the old file — and
      // only if it's a different path than the one we just wrote.
      if (
        previousStoragePath &&
        previousStoragePath !== committed.storagePath
      ) {
        storage.remove(previousStoragePath).catch((err) => {
          logger.error("Failed to remove replaced document from storage", {
            applicationId,
            memberId: memberId || null,
            documentType,
            error: err.message,
          });
        });
      }

      metrics.documentUploadSuccess.inc({ documentType });
      metrics.documentUploadBytesTotal.inc(
        { documentType },
        committed.sizeBytes,
      );
      logger.info("Document uploaded", {
        applicationId,
        memberId: memberId || null,
        documentType,
        sizeBytes: committed.sizeBytes,
      });

      return toPublicDocument(txResult.row);
    } catch (err) {
      // DB write failed after we already committed the new file to disk —
      // clean up the orphan so storage doesn't accumulate untracked files.
      await storage.remove(committed.storagePath).catch(() => {});
      throw err;
    }
  } catch (err) {
    const reason = err instanceof ApiError ? String(err.status) : "internal";
    metrics.documentUploadFailure.inc({ documentType, reason });
    throw err;
  } finally {
    metrics.activeUploads.dec();
    metrics.documentUploadDurationSeconds.observe(
      { documentType },
      Number(process.hrtime.bigint() - startedAt) / 1e9,
    );
  }
}

// --- application-wide documents (existing behavior, unchanged) ---------

export async function uploadDocument(applicationId, documentType, file, auth) {
  if (!isValidDocumentType(documentType)) {
    await safeDiscardTemp(file);
    throw new ApiError("Invalid document type.", 422);
  }
  return uploadDocumentInternal({
    applicationId,
    memberId: null,
    documentType,
    def: DOCUMENT_TYPES[documentType],
    file,
    auth,
    allowedMimes: allowedMimeTypesFor(documentType),
  });
}

export { detectAndValidateSignature };

export async function listDocuments(applicationId, auth) {
  await getSubmissionForAccess(applicationId, auth);
  const result = await pool.query(
    `SELECT * FROM submission_documents
      WHERE application_id = $1 AND submission_member_id IS NULL
      ORDER BY document_type ASC`,
    [applicationId],
  );
  return result.rows.map(toPublicDocument);
}

export async function removeDocument(applicationId, documentType, auth) {
  if (!isValidDocumentType(documentType)) {
    throw new ApiError("Invalid document type.", 422);
  }
  await assertSubmissionEditable(applicationId, auth);

  const result = await pool.query(
    `DELETE FROM submission_documents
       WHERE application_id = $1 AND document_type = $2 AND submission_member_id IS NULL
       RETURNING storage_path`,
    [applicationId, documentType],
  );
  if (result.rowCount === 0) {
    throw new ApiError("Document not found.", 404);
  }

  await storage.remove(result.rows[0].storage_path);
  metrics.documentDeletionsTotal.inc({ documentType });
}

/**
 * Returns { stream, document } for an authorized, ownership-checked
 * download. Allowed regardless of DRAFT/SUBMITTED status (same rule as
 * getSubmission), unlike upload/remove which require DRAFT.
 */
export async function getDocumentStream(applicationId, documentType, auth) {
  if (!isValidDocumentType(documentType)) {
    throw new ApiError("Invalid document type.", 422);
  }
  await getSubmissionForAccess(applicationId, auth);

  const result = await pool.query(
    `SELECT * FROM submission_documents
       WHERE application_id = $1 AND document_type = $2
         AND submission_member_id IS NULL AND upload_status = 'UPLOADED'`,
    [applicationId, documentType],
  );
  const row = result.rows[0];
  if (!row) {
    throw new ApiError("Document not found.", 404);
  }
  if (!(await storage.exists(row.storage_path))) {
    logger.error("Document metadata exists but file is missing from storage", {
      applicationId,
      documentType,
      storagePath: row.storage_path,
    });
    throw new ApiError(
      "This document is temporarily unavailable. Please contact support.",
      500,
    );
  }

  metrics.documentDownloadsTotal.inc({ documentType });
  return {
    stream: storage.createReadStream(row.storage_path),
    document: toPublicDocument(row),
  };
}

// --- per-team-member documents (NEW) ------------------------------------
//
// Same validation pipeline as application-wide documents (signature
// check, size check, sha256, storage commit before DB write, old-file
// cleanup only after the new row is committed). The only difference is
// every query is additionally scoped by submission_member_id, and
// fetchMemberRow() guarantees the member actually belongs to this
// application before anything is written — member 1's NID can never be
// attributed to member 2, and a memberId from a different application can
// never be used here.

export async function uploadMemberDocument(
  applicationId,
  memberId,
  documentType,
  file,
  auth,
) {
  if (!isValidMemberDocumentType(documentType)) {
    await safeDiscardTemp(file);
    throw new ApiError("Invalid document type.", 422);
  }
  return uploadDocumentInternal({
    applicationId,
    memberId,
    documentType,
    def: MEMBER_DOCUMENT_TYPES[documentType],
    file,
    auth,
    allowedMimes: allowedMimeTypesForMember(documentType),
  });
}

export async function listMemberDocuments(applicationId, memberId, auth) {
  await getSubmissionForAccess(applicationId, auth);
  await fetchMemberRow(applicationId, memberId);
  const result = await pool.query(
    `SELECT * FROM submission_documents
      WHERE application_id = $1 AND submission_member_id = $2
      ORDER BY document_type ASC`,
    [applicationId, memberId],
  );
  return result.rows.map(toPublicDocument);
}

export async function removeMemberDocument(
  applicationId,
  memberId,
  documentType,
  auth,
) {
  if (!isValidMemberDocumentType(documentType)) {
    throw new ApiError("Invalid document type.", 422);
  }
  await assertSubmissionEditable(applicationId, auth);
  await fetchMemberRow(applicationId, memberId);

  const result = await pool.query(
    `DELETE FROM submission_documents
       WHERE application_id = $1 AND document_type = $2 AND submission_member_id = $3
       RETURNING storage_path`,
    [applicationId, documentType, memberId],
  );
  if (result.rowCount === 0) {
    throw new ApiError("Document not found.", 404);
  }

  await storage.remove(result.rows[0].storage_path);
  metrics.documentDeletionsTotal.inc({ documentType });
}

export async function getMemberDocumentStream(
  applicationId,
  memberId,
  documentType,
  auth,
) {
  if (!isValidMemberDocumentType(documentType)) {
    throw new ApiError("Invalid document type.", 422);
  }
  await getSubmissionForAccess(applicationId, auth);
  await fetchMemberRow(applicationId, memberId);

  const result = await pool.query(
    `SELECT * FROM submission_documents
       WHERE application_id = $1 AND document_type = $2
         AND submission_member_id = $3 AND upload_status = 'UPLOADED'`,
    [applicationId, documentType, memberId],
  );
  const row = result.rows[0];
  if (!row) {
    throw new ApiError("Document not found.", 404);
  }
  if (!(await storage.exists(row.storage_path))) {
    logger.error("Document metadata exists but file is missing from storage", {
      applicationId,
      memberId,
      documentType,
      storagePath: row.storage_path,
    });
    throw new ApiError(
      "This document is temporarily unavailable. Please contact support.",
      500,
    );
  }

  metrics.documentDownloadsTotal.inc({ documentType });
  return {
    stream: storage.createReadStream(row.storage_path),
    document: toPublicDocument(row),
  };
}

/**
 * Best-effort cleanup of a member's files on disk. The DB rows are
 * already gone by the time this is called (ON DELETE CASCADE on
 * submission_documents.submission_member_id — see migration 012), so this
 * only needs the storage_paths collected BEFORE the member row is
 * deleted. Called from submission.service.js removeMember().
 */
export async function removeAllMemberDocumentFiles(storagePaths) {
  await Promise.all(
    storagePaths.map((p) =>
      storage.remove(p).catch((err) => {
        logger.error("Failed to remove a team member's document from storage", {
          storagePath: p,
          error: err.message,
        });
      }),
    ),
  );
}
