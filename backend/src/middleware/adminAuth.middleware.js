import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { pool } from "../config/database.js";
import { ApiError } from "./error.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Deliberately a DIFFERENT cookie name than the applicant session
// (hsea_access_token) so an applicant's cookie can never be mistaken for
// an admin's, and so clearing one never clears the other.
export const ADMIN_COOKIE_NAME = "hsea_admin_token";

// `sv` (session_version) is bumped server-side on login/logout/password
// change (admin.service.js) so a token from a since-superseded admin
// session stops working immediately — fixes "multiple concurrent
// sessions allowed" (VAPT 3.5), which the report specifically
// demonstrated against the admin panel.
export function signAdminToken(admin) {
  return jwt.sign(
    { sub: admin.id, email: admin.email, role: "admin", sv: admin.sessionVersion },
    env.JWT_SECRET,
    { expiresIn: "8h" }, // short-lived — admins re-login daily, not persistent like applicants
  );
}

export const requireAdmin = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[ADMIN_COOKIE_NAME];
  if (!token) {
    throw new ApiError("Admin authentication required.", 401);
  }
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
    if (payload.role !== "admin") {
      throw new Error("token does not carry admin role");
    }
  } catch {
    throw new ApiError(
      "Admin session expired or invalid. Please log in again.",
      401,
    );
  }

  const result = await pool.query(
    "SELECT session_version FROM admin_users WHERE id = $1",
    [payload.sub],
  );
  if (result.rows[0]?.session_version !== payload.sv) {
    throw new ApiError(
      "This session has been signed out (e.g. a newer login elsewhere). Please log in again.",
      401,
    );
  }

  req.admin = { id: payload.sub, email: payload.email };
  next();
});
