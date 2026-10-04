import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { pool } from "../config/database.js";
import { ApiError } from "./error.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const ACCESS_COOKIE_NAME = "hsea_access_token";

/**
 * Verifies the access token from the HTTP-only cookie (preferred) or the
 * Authorization header (fallback, for non-browser API clients) and attaches
 * `req.user = { id, email }`.
 *
 * Also checks the token's embedded session_version (`sv`) against the
 * live value on the user's row — a single indexed primary-key lookup, not
 * a full session store, but enough to make logout/new-login/password-
 * change immediately revoke every other outstanding token instead of
 * only relying on natural expiry (see auth.service.js).
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

async function isSessionCurrent(userId, sessionVersion) {
  const result = await pool.query(
    "SELECT session_version FROM users WHERE id = $1",
    [userId],
  );
  return result.rows[0]?.session_version === sessionVersion;
}

function extractToken(req) {
  if (req.cookies?.[ACCESS_COOKIE_NAME]) {
    return req.cookies[ACCESS_COOKIE_NAME];
  }
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length);
  }
  return null;
}

/** Requires a valid, authenticated, still-current session. */
export const requireAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    throw new ApiError("Authentication required.", 401);
  }
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new ApiError("Session expired or invalid. Please log in again.", 401);
  }
  if (!(await isSessionCurrent(payload.sub, payload.sv))) {
    throw new ApiError(
      "This session has been signed out (e.g. a newer login elsewhere). Please log in again.",
      401,
    );
  }
  req.user = { id: payload.sub, email: payload.email };
  next();
});

/** Attaches `req.user` if a valid, still-current token is present, but never rejects. */
export const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    if (await isSessionCurrent(payload.sub, payload.sv)) {
      req.user = { id: payload.sub, email: payload.email };
    }
  } catch {
    // Ignore invalid/expired tokens on optional routes — treat as guest.
  }
  next();
});

export { ACCESS_COOKIE_NAME };
