import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ApiError } from "./error.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Deliberately a DIFFERENT cookie name than the applicant session
// (hsea_access_token) so an applicant's cookie can never be mistaken for
// an admin's, and so clearing one never clears the other.
export const ADMIN_COOKIE_NAME = "hsea_admin_token";

export function signAdminToken(admin) {
  return jwt.sign(
    { sub: admin.id, email: admin.email, role: "admin" },
    env.JWT_SECRET,
    { expiresIn: "8h" }, // short-lived — admins re-login daily, not persistent like applicants
  );
}

export const requireAdmin = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[ADMIN_COOKIE_NAME];
  if (!token) {
    throw new ApiError("Admin authentication required.", 401);
  }
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (payload.role !== "admin") {
      throw new Error("token does not carry admin role");
    }
    req.admin = { id: payload.sub, email: payload.email };
    next();
  } catch {
    throw new ApiError(
      "Admin session expired or invalid. Please log in again.",
      401,
    );
  }
});
