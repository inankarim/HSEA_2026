import path from "node:path";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";
import { ApiError } from "../middleware/error.middleware.js";
import { receivePictureUpload } from "../middleware/upload.middleware.js";
import {
  storeImageUpload,
  deleteImageUpload,
} from "../services/pictureUpload.service.js";
import { pool } from "../config/database.js";
import { toPublicUser } from "../services/auth.service.js";

const PHOTO_PURPOSE = "profile-photos";

/**
 * POST /api/profile/photo
 * requireAuth + profilePhotoUploadLimiter are applied in the route.
 */
export const uploadProfilePhoto = asyncHandler(async (req, res) => {
  // Runs multer (mimetype + size gate), populating req.file. Throws
  // ApiError on anything invalid — asyncHandler forwards it to the
  // centralized error handler exactly like any other thrown ApiError.
  await receivePictureUpload(req, res);

  if (!req.file) {
    throw new ApiError("No photo was uploaded.", 422);
  }

  // Decode, re-encode, strip metadata, persist under a random filename.
  const stored = await storeImageUpload(req.file, {
    ownerId: req.user.id,
    purpose: PHOTO_PURPOSE,
  });

  const existing = await pool.query(
    "SELECT profile_photo_path FROM users WHERE id = $1",
    [req.user.id],
  );
  const previousPath = existing.rows[0]?.profile_photo_path || null;

  const result = await pool.query(
    `UPDATE users
        SET profile_photo_path       = $1,
            profile_photo_url         = $2,
            profile_photo_mime_type   = $3,
            profile_photo_size_bytes  = $4,
            profile_photo_checksum    = $5,
            profile_photo_uploaded_at = now(),
            updated_at                = now()
      WHERE id = $6
      RETURNING *`,
    [
      stored.path,
      stored.url,
      stored.mimeType,
      stored.sizeBytes,
      stored.checksum,
      req.user.id,
    ],
  );

  if (result.rowCount === 0) {
    // User row vanished mid-request — clean up the file we just wrote
    // rather than leaving an orphaned photo on disk.
    await deleteImageUpload(stored.storedFileName, { purpose: PHOTO_PURPOSE });
    throw new ApiError("User not found.", 404);
  }

  // Replace-then-clean-up: only remove the old photo after the new one is
  // safely committed, and never let cleanup failure affect the response.
  if (previousPath) {
    deleteImageUpload(path.basename(previousPath), {
      purpose: PHOTO_PURPOSE,
    }).catch(() => {});
  }

  return ok(
    res,
    { user: toPublicUser(result.rows[0]) },
    "Profile photo updated.",
  );
});
