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
  list,
  detail,
  downloadZip,
  kpis,
  listUsersHandler,
  userDetailHandler,
  resetUserPasswordHandler,
  deleteUserHandler,
  listAdminsHandler,
  deleteAdminHandler,
} from "../controllers/admin.controller.js";

import { isValidApplicationIdFormat } from "../utils/applicationId.js";

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
router.get("/kpis", requireAdmin, kpis);

const userIdParamSchema = z
  .object({ userId: z.string().uuid("Invalid user ID.") })
  .passthrough();
const adminIdParamSchema = z
  .object({ adminId: z.string().uuid("Invalid admin ID.") })
  .passthrough();

const destructiveActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    fail(res, "Too many attempts. Please wait and try again.", 429),
});

router.get("/users", requireAdmin, listUsersHandler);
router.get(
  "/users/:userId",
  requireAdmin,
  validate(userIdParamSchema, "params"),
  userDetailHandler,
);
router.post(
  "/users/:userId/reset-password",
  requireAdmin,
  validate(userIdParamSchema, "params"),
  resetUserPasswordHandler,
);
router.delete(
  "/users/:userId",
  requireAdmin,
  destructiveActionLimiter,
  validate(userIdParamSchema, "params"),
  deleteUserHandler,
);

router.get("/admins", requireAdmin, listAdminsHandler);
router.delete(
  "/admins/:adminId",
  requireAdmin,
  destructiveActionLimiter,
  validate(adminIdParamSchema, "params"),
  deleteAdminHandler,
);

export default router;
