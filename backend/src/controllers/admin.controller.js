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
  logoutAdmin,
  changeAdminPassword,
  listSubmissions,
  getSubmissionFull,
  streamApplicantZip,
  logAdminAction,
  updateSubmissionStatus,
  listUsers,
  getUserDetail,
  resetUserPassword,
  deleteUser,
  listAdmins,
  deleteAdminAccount,
} from "../services/admin.service.js";

import { env } from "../config/env.js";
import { getKpis } from "../services/admin.service.js";

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
  await logoutAdmin(req.admin.id);
  res.clearCookie(ADMIN_COOKIE_NAME, { path: "/" });
  return ok(res, {}, "Logged out.");
});

export const me = asyncHandler(async (req, res) => {
  // requireAdmin already verified the token and attached req.admin —
  // this just confirms to the frontend "yes, your session is still valid"
  // on page load/refresh, same role auth.controller.js's `me` plays.
  return ok(res, { admin: req.admin });
});

export const changePassword = asyncHandler(async (req, res) => {
  // req.body already validated by changePasswordSchema via the shared
  // validate() middleware (admin.routes.js) — no need to re-parse here.
  // changeAdminPassword() bumps session_version (invalidating other
  // sessions), so this admin's own cookie needs a freshly re-signed
  // token with the new version or their very next request would also
  // get rejected as stale.
  const admin = await changeAdminPassword(req.admin.id, req.body);
  const token = signAdminToken(admin);
  res.cookie(ADMIN_COOKIE_NAME, token, {
    ...adminCookieOptions,
    maxAge: 8 * 60 * 60 * 1000,
  });
  return ok(res, {}, "Password changed.");
});

export const list = asyncHandler(async (req, res) => {
  // req.query has already been validated + coerced/clamped by
  // listSubmissionsQuerySchema (admin.routes.js) — page/pageSize are
  // guaranteed integers within bounds, status/applicantType are already
  // restricted to valid enum values.
  const { status, search, applicantType, page, pageSize } = req.query;
  const result = await listSubmissions({
    status,
    search,
    applicantType,
    page,
    pageSize,
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

export const kpis = asyncHandler(async (req, res) => {
  const data = await getKpis();
  return ok(res, data);
});

export const listUsersHandler = asyncHandler(async (req, res) => {
  // Validated + coerced/clamped by listUsersQuerySchema (admin.routes.js).
  const { search, page, pageSize } = req.query;
  const result = await listUsers({ search, page, pageSize });
  return ok(res, result);
});

export const userDetailHandler = asyncHandler(async (req, res) => {
  const user = await getUserDetail(req.params.userId);
  return ok(res, { user });
});

export const resetUserPasswordHandler = asyncHandler(async (req, res) => {
  const result = await resetUserPassword(req.params.userId, req.admin.id, req.body.code);
  return ok(
    res,
    result,
    "Password reset. Share this temporary password with the user securely — it will not be shown again.",
  );
});

export const deleteUserHandler = asyncHandler(async (req, res) => {
  // req.body already validated by deleteCodeSchema via the shared
  // validate() middleware (admin.routes.js) — a malformed/missing code
  // now returns a proper 422 instead of an unhandled ZodError -> 500.
  const { code } = req.body;
  await deleteUser(req.params.userId, req.admin.id, code);
  return ok(res, {}, "User account deleted.");
});

export const listAdminsHandler = asyncHandler(async (req, res) => {
  const admins = await listAdmins();
  return ok(res, { admins });
});

export const deleteAdminHandler = asyncHandler(async (req, res) => {
  const { code } = req.body;
  await deleteAdminAccount(req.params.adminId, req.admin.id, code);
  return ok(res, {}, "Admin account deleted.");
});
