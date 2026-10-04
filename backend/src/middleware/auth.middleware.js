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
 * only relying on natural expiry (see auth.service.js) — and enforces a
 * real idle timeout (env.SESSION_IDLE_TIMEOUT_MS), distinct from the
 * token's own absolute TTL: a session idle longer than that is rejected
 * even if its token hasn't expired yet.
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

async function checkSession(userId, sessionVersion) {
  const result = await pool.query(
    "SELECT session_version, last_active_at FROM users WHERE id = $1",
    [userId],
  );
  const row = result.rows[0];
  if (!row || row.session_version !== sessionVersion) {
    return { ok: false, reason: "superseded" };
  }
  const idleMs = Date.now() - new Date(row.last_active_at).getTime();
  if (idleMs > env.SESSION_IDLE_TIMEOUT_MS) {
    return { ok: false, reason: "idle" };
  }
  // Sliding renewal. Advisory/best-effort freshness tracking — not worth
  // blocking the request on, so this doesn't await.
  pool
    .query("UPDATE users SET last_active_at = now() WHERE id = $1", [userId])
    .catch(() => {});
  return { ok: true };
}

const SUPERSEDED_MESSAGE =
  "This session has been signed out (e.g. a newer login elsewhere). Please log in again.";
const IDLE_MESSAGE =
  "Your session has expired due to inactivity. Please log in again.";

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

/** Requires a valid, authenticated, still-current, not-idle session. */
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
  const session = await checkSession(payload.sub, payload.sv);
  if (!session.ok) {
    throw new ApiError(
      session.reason === "idle" ? IDLE_MESSAGE : SUPERSEDED_MESSAGE,
      401,
    );
  }
  req.user = { id: payload.sub, email: payload.email };
  next();
});

/** Attaches `req.user` if a valid, still-current, not-idle token is present, but never rejects. */
export const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    const session = await checkSession(payload.sub, payload.sv);
    if (session.ok) {
      req.user = { id: payload.sub, email: payload.email };
    }
  } catch {
    // Ignore invalid/expired tokens on optional routes — treat as guest.
  }
  next();
});

export { ACCESS_COOKIE_NAME };
