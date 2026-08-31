import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { profilePhotoUploadLimiter } from "../middleware/rateLimit.middleware.js";
import { uploadProfilePhoto } from "../controllers/profile.controller.js";

const router = Router();

// requireAuth: only a signed-in owner may set their own profile photo —
// there is no guest-token equivalent for this endpoint.
router.post(
  "/photo",
  requireAuth,
  profilePhotoUploadLimiter,
  uploadProfilePhoto,
);

export default router;
