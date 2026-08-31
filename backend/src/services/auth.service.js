import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../config/database.js";
import { env } from "../config/env.js";
import { ApiError } from "../middleware/error.middleware.js";
import { logger } from "../utils/logger.js";

const BCRYPT_ROUNDS = 12;
const GENERIC_AUTH_FAILURE = "Invalid email or password.";

function signAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_TOKEN_TTL,
  });
}

function signRefreshToken(user) {
  return jwt.sign({ sub: user.id, type: "refresh" }, env.JWT_SECRET, {
    expiresIn: env.JWT_REFRESH_TOKEN_TTL,
  });
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

  logger.info("User logged in", { userId: row.id });

  return {
    user: toPublicUser(row),
    accessToken: signAccessToken(row),
    refreshToken: signRefreshToken(row),
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
  return {
    user: toPublicUser(user),
    accessToken: signAccessToken(user),
  };
}

export { signAccessToken, signRefreshToken, toPublicUser };
