import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { validate } from "../middleware/validation.middleware.js";
import { requireAdmin } from "../middleware/adminAuth.middleware.js";
import { fail } from "../utils/apiResponse.js";
import {
  login,
  logout,
  me,
  changePassword,
  updateStatus,
} from "../controllers/admin.controller.js";

import { isValidApplicationIdFormat } from "../utils/applicationId.js";
import { list, detail, downloadZip } from "../controllers/admin.controller.js";

const router = Router();
const applicationIdParamSchema = z
  .object({
    applicationId: z
      .string()
      .refine(isValidApplicationIdFormat, "Invalid Application ID format."),
  })
  .passthrough();
// Deliberately tight and separate from the applicant loginLimiter —
// this endpoint guards access to every applicant's PII and documents.
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    fail(res, "Too many login attempts. Please wait and try again.", 429),
});

const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1),
  })
  .strict();

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(10, "Password must be at least 10 characters."),
  })
  .strict();

// ... after the existing login/logout/me/password routes:

router.get("/submissions", requireAdmin, list);

router.get(
  "/submissions/:applicationId",
  requireAdmin,
  validate(applicationIdParamSchema, "params"),
  detail,
);

router.get(
  "/submissions/:applicationId/download",
  requireAdmin,
  validate(applicationIdParamSchema, "params"),
  downloadZip,
);

router.post("/login", adminLoginLimiter, validate(loginSchema), login);
router.post("/logout", requireAdmin, logout);
router.get("/me", requireAdmin, me);
router.put(
  "/password",
  requireAdmin,
  validate(changePasswordSchema),
  changePassword,
);

router.put(
  "/submissions/:applicationId/status",
  requireAdmin,
  validate(applicationIdParamSchema, "params"),
  updateStatus,
);

router.get("/submissions", requireAdmin, list);

router.get(
  "/submissions/:applicationId",
  requireAdmin,
  validate(applicationIdParamSchema, "params"),
  detail,
);

router.get(
  "/submissions/:applicationId/download",
  requireAdmin,
  validate(applicationIdParamSchema, "params"),
  downloadZip,
);

export default router;
