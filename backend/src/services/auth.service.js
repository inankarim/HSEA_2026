import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../config/database.js";
import { env } from "../config/env.js";
import { ApiError } from "../middleware/error.middleware.js";
import { logger } from "../utils/logger.js";

const BCRYPT_ROUNDS = 12;
const GENERIC_AUTH_FAILURE = "Invalid email or password.";

// `sv` (session_version) is bumped server-side on login/logout/password
// change. Every token embeds the value current at signing time; requests
// compare it against the live DB value (auth.middleware.js) so a token
// from a since-superseded session stops working immediately, regardless
// of its own expiry — fixes "multiple concurrent sessions allowed" (VAPT 3.5).
function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, sv: user.session_version },
    env.JWT_SECRET,
    { expiresIn: env.JWT_ACCESS_TOKEN_TTL },
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, type: "refresh", sv: user.session_version },
    env.JWT_SECRET,
    { expiresIn: env.JWT_REFRESH_TOKEN_TTL },
  );
}

function toPublicUser(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    organization: row.organization,
    designation: row.designation,
    applicantType: row.applicant_type,
    // Null until the user uploads a photo via POST /api/profile/photo.
    // Always the sanitized, re-encoded URL served from /uploads/images —
    // never a path derived from anything the client sent directly.
    profilePhotoUrl: row.profile_photo_url || null,
    createdAt: row.created_at,
  };
}

export async function registerUser(input) {
  const email = input.email.toLowerCase();

  const existing = await pool.query(
    "SELECT id FROM users WHERE LOWER(email) = $1",
    [email],
  );

  // Generic message regardless of whether the email exists, to reduce
  // account enumeration — but we still need a distinct code path so the
  // client can prompt "log in instead" without confirming the account.
  if (existing.rowCount > 0) {
    throw new ApiError("Unable to register with the provided details.", 409);
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  const result = await pool.query(
    `INSERT INTO users (
       full_name, email, phone, password_hash, organization, designation,
       applicant_type, iab_membership_number, university_name, university_email
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      input.fullName,
      email,
      input.phone || null,
      passwordHash,
      input.organization || null,
      input.designation || null,
      input.applicantType,
      input.applicantType === "IAB_MEMBER" ? input.iabMembershipNumber : null,
      input.applicantType === "STUDENT" ? input.universityName : null,
      input.applicantType === "STUDENT" ? input.universityEmail : null,
    ],
  );

  const user = result.rows[0];
  logger.info("User registered", { userId: user.id });

  return {
    user: toPublicUser(user),
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  };
}

export async function loginUser({ email, password }) {
  const result = await pool.query(
    "SELECT * FROM users WHERE LOWER(email) = $1",
    [email.toLowerCase()],
  );

  // Always perform a bcrypt comparison even on a missing user, using a
  // static dummy hash, so response timing doesn't reveal whether the
  // email exists (defense against timing-based enumeration).
  const row = result.rows[0];
  const hashToCompare =
    row?.password_hash ||
    "$2b$12$CwTycUXWue0Thq9StjUM0uJ8i8Jm3q3q3q3q3q3q3q3q3q3q3q3q3";

  const passwordMatches = await bcrypt.compare(password, hashToCompare);

  if (!row || !passwordMatches) {
    throw new ApiError(GENERIC_AUTH_FAILURE, 401);
  }

  // Bump session_version so any token from a previous session (e.g. a
  // still-open browser elsewhere) stops working as soon as this new
  // login's tokens are issued — single-session enforcement. Also resets
  // last_active_at so the fresh session gets a full idle window.
  const bumped = await pool.query(
    "UPDATE users SET session_version = session_version + 1, last_active_at = now() WHERE id = $1 RETURNING *",
    [row.id],
  );
  const user = bumped.rows[0];

  logger.info("User logged in", { userId: user.id });

  return {
    user: toPublicUser(user),
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  };
}

export async function getUserById(userId) {
  const result = await pool.query("SELECT * FROM users WHERE id = $1", [
    userId,
  ]);
  if (result.rowCount === 0) {
    throw new ApiError("User not found.", 404);
  }
  return toPublicUser(result.rows[0]);
}

export function verifyRefreshToken(token) {
  const payload = jwt.verify(token, env.JWT_SECRET);
  if (payload.type !== "refresh") {
    throw new ApiError("Invalid refresh token.", 401);
  }
  return payload;
}

export async function refreshAccessToken(refreshToken) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(
      "Refresh token expired or invalid. Please log in again.",
      401,
    );
  }

  const result = await pool.query("SELECT * FROM users WHERE id = $1", [
    payload.sub,
  ]);
  if (result.rowCount === 0) {
    throw new ApiError("User not found.", 404);
  }

  const user = result.rows[0];
  if (payload.sv !== user.session_version) {
    throw new ApiError(
      "Refresh token expired or invalid. Please log in again.",
      401,
    );
  }

  // A refresh token is valid for up to 30 days regardless of activity —
  // without this check, a dormant one could silently resurrect a session
  // well past the idle timeout that would otherwise apply to it.
  const idleMs = Date.now() - new Date(user.last_active_at).getTime();
  if (idleMs > env.SESSION_IDLE_TIMEOUT_MS) {
    throw new ApiError(
      "Your session has expired due to inactivity. Please log in again.",
      401,
    );
  }

  await pool.query("UPDATE users SET last_active_at = now() WHERE id = $1", [
    user.id,
  ]);

  return {
    user: toPublicUser(user),
    accessToken: signAccessToken(user),
  };
}

/**
 * Bumps session_version so the access/refresh token pair just cleared
 * client-side also stops being independently usable — logout previously
 * only cleared the cookie, leaving a copied/stolen token valid until its
 * own expiry (15min access / 30 days refresh).
 */
export async function logoutUser(userId) {
  await pool.query(
    "UPDATE users SET session_version = session_version + 1 WHERE id = $1",
    [userId],
  );
}

export { signAccessToken, signRefreshToken, toPublicUser };
