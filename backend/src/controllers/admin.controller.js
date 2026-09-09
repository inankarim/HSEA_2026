import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";
import { ApiError } from "../middleware/error.middleware.js";
import {
  signAdminToken,
  ADMIN_COOKIE_NAME,
} from "../middleware/adminAuth.middleware.js";
import {
  loginAdmin,
  changeAdminPassword,
  listSubmissions,
  getSubmissionFull,
  streamApplicantZip,
  logAdminAction,
  updateSubmissionStatus,
} from "../services/admin.service.js";

import { env } from "../config/env.js";

const adminCookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: "strict",
  path: "/",
};

export const login = asyncHandler(async (req, res) => {
  const admin = await loginAdmin(req.body);
  const token = signAdminToken(admin);

  res.cookie(ADMIN_COOKIE_NAME, token, {
    ...adminCookieOptions,
    maxAge: 8 * 60 * 60 * 1000, // 8h, matches the JWT's own expiresIn
  });

  return ok(res, { admin }, "Logged in.");
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie(ADMIN_COOKIE_NAME, { path: "/" });
  return ok(res, {}, "Logged out.");
});

export const me = asyncHandler(async (req, res) => {
  // requireAdmin already verified the token and attached req.admin —
  // this just confirms to the frontend "yes, your session is still valid"
  // on page load/refresh, same role auth.controller.js's `me` plays.
  return ok(res, { admin: req.admin });
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(10, "Password must be at least 10 characters."),
  })
  .strict();

export const changePassword = asyncHandler(async (req, res) => {
  const parsed = changePasswordSchema.parse(req.body);
  await changeAdminPassword(req.admin.id, parsed);
  return ok(res, {}, "Password changed.");
});

export const list = asyncHandler(async (req, res) => {
  const { status, search, applicantType, page, pageSize } = req.query;
  const result = await listSubmissions({
    status: typeof status === "string" ? status : undefined,
    search: typeof search === "string" ? search : undefined,
    applicantType:
      typeof applicantType === "string" ? applicantType : undefined,
    page: Number(page) || 1,
    pageSize: Number(pageSize) || 25,
  });
  return ok(res, result);
});

export const detail = asyncHandler(async (req, res) => {
  const data = await getSubmissionFull(req.params.applicationId);
  await logAdminAction(
    req.admin.id,
    "VIEW_SUBMISSION",
    req.params.applicationId,
  );
  return ok(res, data);
});

export const downloadZip = asyncHandler(async (req, res) => {
  await logAdminAction(req.admin.id, "DOWNLOAD_ZIP", req.params.applicationId);
  await streamApplicantZip(req.params.applicationId, res);
});
const updateStatusSchema = z
  .object({
    status: z.enum([
      "SUBMITTED",
      "UNDER_REVIEW",
      "SHORTLISTED",
      "FINALIST",
      "WINNER",
      "REJECTED",
    ]),
  })
  .strict();

export const updateStatus = asyncHandler(async (req, res) => {
  const { status } = updateStatusSchema.parse(req.body);
  const result = await updateSubmissionStatus(
    req.params.applicationId,
    status,
    req.admin.id,
  );
  return ok(res, result, "Status updated.");
});
