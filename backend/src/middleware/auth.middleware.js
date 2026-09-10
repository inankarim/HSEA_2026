import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ApiError } from "./error.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const ACCESS_COOKIE_NAME = "hsea_access_token";

/**
 * Verifies the access token from the HTTP-only cookie (preferred) or the
 * Authorization header (fallback, for non-browser API clients) and attaches
 * `req.user = { id, email }`. Does not hit the database — the token itself
 * is the source of truth for the request's identity, keeping this
 * middleware fast and stateless.
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
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

/** Requires a valid, authenticated session. */
export const requireAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    throw new ApiError("Authentication required.", 401);
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    throw new ApiError("Session expired or invalid. Please log in again.", 401);
  }
});

/** Attaches `req.user` if a valid token is present, but never rejects. */
export const optionalAuth = (req, res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email };
  } catch {
    // Ignore invalid/expired tokens on optional routes — treat as guest.
  }
  next();
};

export { ACCESS_COOKIE_NAME };
