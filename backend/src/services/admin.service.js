import bcrypt from "bcrypt";
import { pool } from "../config/database.js";
import { ApiError } from "../middleware/error.middleware.js";
import { logger } from "../utils/logger.js";
import { storage } from "../storage/index.js";
import archiver from "archiver";
import { getAnalyticsSummary } from "./analytics.service.js";
import crypto from "node:crypto";
import path from "node:path";
import { env } from "../config/env.js";
import { deleteImageUpload } from "./pictureUpload.service.js";
const BCRYPT_ROUNDS = 12;

function toPublicAdmin(row) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    mustChangePassword: row.must_change_password,
  };
}

const VALID_STATUS_TRANSITIONS = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "FINALIST",
  "WINNER",
  "REJECTED",
];

export async function loginAdmin({ email, password }) {
  const result = await pool.query(
    "SELECT * FROM admin_users WHERE LOWER(email) = $1",
    [email.toLowerCase()],
  );

  // Same timing-safe pattern as auth.service.js's loginUser — always run
  // bcrypt.compare even when no row matched, so response time doesn't
  // reveal whether the email exists.
  const row = result.rows[0];
  const hashToCompare =
    row?.password_hash ||
    "$2b$12$CwTycUXWue0Thq9StjUM0uJ8i8Jm3q3q3q3q3q3q3q3q3q3q3q3q3";

  const passwordMatches = await bcrypt.compare(password, hashToCompare);

  if (!row || !passwordMatches) {
    throw new ApiError("Invalid credentials.", 401);
  }

  await logAdminAction(row.id, "LOGIN");
  logger.info("Admin logged in", { adminId: row.id, email: row.email });

  return toPublicAdmin(row);
}

export async function changeAdminPassword(
  adminId,
  { currentPassword, newPassword },
) {
  const result = await pool.query("SELECT * FROM admin_users WHERE id = $1", [
    adminId,
  ]);
  if (result.rowCount === 0) {
    throw new ApiError("Admin account not found.", 404);
  }
  const row = result.rows[0];

  const matches = await bcrypt.compare(currentPassword, row.password_hash);
  if (!matches) {
    throw new ApiError("Current password is incorrect.", 401);
  }

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await pool.query(
    `UPDATE admin_users
        SET password_hash = $1, must_change_password = FALSE, updated_at = now()
      WHERE id = $2`,
    [newHash, adminId],
  );

  logger.info("Admin changed password", { adminId });
}
export async function listSubmissions({
  status,
  search,
  applicantType,
  page = 1,
  pageSize = 25,
}) {
  const conditions = [];
  const values = [];
  let i = 1;

  if (status) {
    conditions.push(`s.status = $${i++}`);
    values.push(status);
  }
  if (applicantType) {
    conditions.push(`s.applicant_type = $${i++}`);
    values.push(applicantType);
  }
  if (search) {
    conditions.push(
      `(s.application_id ILIKE $${i} OR s.full_name ILIKE $${i} OR s.email ILIKE $${i} OR s.project_name ILIKE $${i})`,
    );
    values.push(`%${search}%`);
    i += 1;
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const limitParam = i++;
  const offsetParam = i++;
  const offset = (page - 1) * pageSize;

  // document_count / member_count via correlated subqueries, so the list
  // view can show completeness at a glance without a second round trip.
  const rows = await pool.query(
    `SELECT
        s.application_id, s.status, s.applicant_type, s.full_name, s.email,
        s.project_name, s.project_category, s.created_at, s.updated_at, s.submitted_at,
        (SELECT COUNT(*)::int FROM submission_documents d
          WHERE d.application_id = s.application_id AND d.upload_status = 'UPLOADED') AS document_count,
        (SELECT COUNT(*)::int FROM submission_members m
          WHERE m.application_id = s.application_id) AS member_count
      FROM submissions s
      ${where}
      ORDER BY s.created_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}`,
    [...values, pageSize, offset],
  );

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS count FROM submissions s ${where}`,
    values,
  );

  return { rows: rows.rows, total: countResult.rows[0].count, page, pageSize };
}

// --- detail -----------------------------------------------------------

function toAdminDocumentView(row) {
  return {
    id: row.id,
    documentType: row.document_type,
    memberId: row.submission_member_id || undefined,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    uploadStatus: row.upload_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // storage_path intentionally omitted — admin only ever gets the
    // whole-folder zip, never a path to an individual file.
  };
}

export async function getSubmissionFull(applicationId) {
  const subResult = await pool.query(
    "SELECT * FROM submissions WHERE application_id = $1",
    [applicationId],
  );
  if (subResult.rowCount === 0) {
    throw new ApiError("Submission not found.", 404);
  }

  const [members, documents, memberDocs] = await Promise.all([
    pool.query(
      "SELECT * FROM submission_members WHERE application_id = $1 ORDER BY is_team_leader DESC, display_order ASC",
      [applicationId],
    ),
    pool.query(
      "SELECT * FROM submission_documents WHERE application_id = $1 AND submission_member_id IS NULL",
      [applicationId],
    ),
    pool.query(
      "SELECT * FROM submission_documents WHERE application_id = $1 AND submission_member_id IS NOT NULL",
      [applicationId],
    ),
  ]);

  return {
    submission: subResult.rows[0],
    members: members.rows,
    documents: documents.rows.map(toAdminDocumentView),
    memberDocuments: memberDocs.rows.map(toAdminDocumentView),
  };
}

// --- zip download -------------------------------------------------------

function buildTextSummary(s, members) {
  const lines = [
    `Application ID: ${s.application_id}`,
    `Status: ${s.status}`,
    `Applicant: ${s.full_name} <${s.email}> (${s.phone || "no phone"})`,
    `Applicant Type: ${s.applicant_type}`,
    s.applicant_type === "IAB_MEMBER"
      ? `IEB Membership: ${s.iab_membership_number || "—"} (${s.iab_verification_status})`
      : `University: ${s.university_name || "—"} <${s.university_email || "—"}> (${s.university_verification_status})`,
    `Applicant is Team Leader: ${s.applicant_is_team_leader ? "Yes" : "No"}`,
    "",
    `Project: ${s.project_name} (${s.project_category})`,
    `Location: ${s.project_location || "—"}   Status: ${s.project_status || "—"}`,
    `Lead Engineer: ${s.lead_engineer || "—"}   Completion Year: ${s.completion_year || "—"}`,
    "",
    "--- Client Information ---",
    `Name: ${s.client_name || "—"}`,
    `Address: ${s.client_address || "—"}`,
    `Contact: ${s.client_contact_number || "—"}   Email: ${s.client_email || "—"}`,
    `(Legacy Client/Owner field: ${s.client_owner || "—"})`,
    "",
    "--- Executive Summary ---",
    s.executive_summary || "(none — see uploaded PDF/image if provided)",
    "",
    "--- Project Description ---",
    s.project_description || "(none — see uploaded PDF if provided)",
    "",
    "--- Design Demonstration ---",
    s.design_demonstration || "(none — see uploaded PDF if provided)",
    "",
    "--- Material Specifications ---",
    s.material_specifications || "(none)",
    "",
    "--- Construction Technology ---",
    s.construction_technology || "(none)",
    "",
    "--- Costing ---",
    s.costing || "(none — see uploaded PDF if provided)",
    "",
    "--- Covering Letter ---",
    s.covering_letter || "(none — see uploaded PDF if provided)",
    "",
    `Google Drive Folder: ${s.google_drive_url || "—"}`,
    "",
    "--- Declarations ---",
    `Information Confirmed: ${s.information_confirmed}`,
    `Files Uploaded Confirmed: ${s.files_uploaded_confirmed}`,
    `Naming Convention Confirmed: ${s.naming_convention_confirmed}`,
    `Authenticity Confirmed: ${s.authenticity_confirmed}`,
    `Terms Accepted: ${s.terms_accepted}`,
    "",
    `Created: ${s.created_at}   Submitted: ${s.submitted_at || "not yet submitted (DRAFT)"}`,
    "",
    "--- Team Members ---",
    ...(members.length
      ? members.map(
          (m) =>
            `- ${m.full_name}${m.is_team_leader ? " (Team Leader)" : ""} — ${m.email || "no email"} — ${
              m.applicant_type === "IAB_MEMBER"
                ? `IEB: ${m.iab_membership_number || "—"} (${m.iab_verification_status})`
                : `Univ: ${m.university_name || "—"} (${m.university_verification_status})`
            }`,
        )
      : ["(no additional team members)"]),
  ];
  return lines.join("\n");
}

export async function streamApplicantZip(applicationId, res) {
  // Reuse the same query as detail — but we need the RAW rows here
  // (with storage_path) since this function, unlike the detail endpoint,
  // is the one place allowed to touch actual file bytes.
  const subResult = await pool.query(
    "SELECT * FROM submissions WHERE application_id = $1",
    [applicationId],
  );
  if (subResult.rowCount === 0) {
    throw new ApiError("Submission not found.", 404);
  }
  const submission = subResult.rows[0];

  const [membersResult, documentsResult, memberDocsResult] = await Promise.all([
    pool.query(
      "SELECT * FROM submission_members WHERE application_id = $1 ORDER BY is_team_leader DESC, display_order ASC",
      [applicationId],
    ),
    pool.query(
      "SELECT * FROM submission_documents WHERE application_id = $1 AND submission_member_id IS NULL",
      [applicationId],
    ),
    pool.query(
      "SELECT * FROM submission_documents WHERE application_id = $1 AND submission_member_id IS NOT NULL",
      [applicationId],
    ),
  ]);

  const members = membersResult.rows;
  const documents = documentsResult.rows;
  const memberDocuments = memberDocsResult.rows;

  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${applicationId}.zip"`,
  );

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (err) => {
    logger.error("Archiver error while building applicant zip", {
      applicationId,
      error: err.message,
    });
    if (!res.headersSent) {
      res.status(500).end();
    } else {
      res.destroy(err);
    }
  });
  archive.pipe(res);

  for (const doc of documents) {
    if (doc.upload_status !== "UPLOADED") continue;
    if (!(await storage.exists(doc.storage_path))) continue;
    const ext = doc.original_filename.match(/\.[^.]+$/)?.[0] || "";
    archive.append(storage.createReadStream(doc.storage_path), {
      name: `${doc.document_type}${ext}`,
    });
  }

  const memberById = new Map(members.map((m) => [m.id, m]));
  for (const doc of memberDocuments) {
    if (doc.upload_status !== "UPLOADED") continue;
    if (!(await storage.exists(doc.storage_path))) continue;
    const member = memberById.get(doc.submission_member_id);
    const label = member
      ? `${member.display_order ?? ""}_${member.full_name}`
          .replace(/[^\w\- ]/g, "")
          .trim()
      : doc.submission_member_id;
    const ext = doc.original_filename.match(/\.[^.]+$/)?.[0] || "";
    archive.append(storage.createReadStream(doc.storage_path), {
      name: `members/${label}/${doc.document_type}${ext}`,
    });
  }

  const summary = buildTextSummary(submission, members);
  archive.append(Buffer.from(summary, "utf8"), { name: "SUBMISSION_INFO.txt" });

  await archive.finalize();

  logger.info("Admin downloaded applicant zip", { applicationId });
}

// Admins can only move a submission between post-submission states — DRAFT
// is applicant-owned and never admin-settable; going back TO draft would
// also reopen editing/upload routes for the applicant, which is not
// something a status change from the admin panel should ever trigger.

export async function updateSubmissionStatus(
  applicationId,
  newStatus,
  adminId,
) {
  if (!VALID_STATUS_TRANSITIONS.includes(newStatus)) {
    throw new ApiError("Invalid status value.", 422);
  }

  const result = await pool.query(
    `UPDATE submissions
        SET status = $1, updated_at = now()
      WHERE application_id = $2 AND status != 'DRAFT'
      RETURNING application_id, status`,
    [newStatus, applicationId],
  );

  if (result.rowCount === 0) {
    // Either the applicationId doesn't exist, or it's still a DRAFT —
    // distinguish the two for a clearer error message.
    const check = await pool.query(
      "SELECT status FROM submissions WHERE application_id = $1",
      [applicationId],
    );
    if (check.rowCount === 0) {
      throw new ApiError("Submission not found.", 404);
    }
    throw new ApiError(
      "Cannot change status of a submission still in DRAFT.",
      409,
    );
  }

  await logAdminAction(adminId, "UPDATE_STATUS", applicationId);
  logger.info("Admin updated submission status", {
    adminId,
    applicationId,
    newStatus,
  });

  return result.rows[0];
}

export async function getKpis() {
  const [applicantsResult, submittedResult, usersResult, analytics] =
    await Promise.all([
      pool.query("SELECT COUNT(*)::int AS count FROM submissions"),
      pool.query(
        "SELECT COUNT(*)::int AS count FROM submissions WHERE status != 'DRAFT'",
      ),
      pool.query("SELECT COUNT(*)::int AS count FROM users"),
      getAnalyticsSummary(),
    ]);

  return {
    totalApplicants: applicantsResult.rows[0].count,
    totalSubmitted: submittedResult.rows[0].count,
    totalUsers: usersResult.rows[0].count,
    totalViews: analytics.totalViews,
    totalVisitors: analytics.totalVisitors,
  };
}

export async function logAdminAction(adminId, action, context = null) {
  const {
    applicationId = null,
    targetType = null,
    targetId = null,
  } = typeof context === "string" ? { applicationId: context } : context || {};
  try {
    await pool.query(
      `INSERT INTO admin_audit_log (admin_id, action, application_id, target_type, target_id)
       VALUES ($1,$2,$3,$4,$5)`,
      [adminId, action, applicationId, targetType, targetId],
    );
  } catch (err) {
    logger.error("Failed to write admin audit log", {
      adminId,
      action,
      applicationId,
      targetType,
      targetId,
      error: err.message,
    });
  }
}

function assertValidDeleteCode(code) {
  if (!env.ADMIN_DELETE_CODE) {
    throw new ApiError(
      "Destructive actions are not configured on this server. Set ADMIN_DELETE_CODE.",
      500,
    );
  }
  if (!code || typeof code !== "string") {
    throw new ApiError("A confirmation code is required for this action.", 422);
  }
  const expected = Buffer.from(env.ADMIN_DELETE_CODE);
  const actual = Buffer.from(code);
  const matches =
    expected.length === actual.length &&
    crypto.timingSafeEqual(expected, actual);
  if (!matches) {
    throw new ApiError("Incorrect confirmation code.", 403);
  }
}

function toAdminUserView(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    organization: row.organization,
    designation: row.designation,
    applicantType: row.applicant_type,
    iabMembershipNumber: row.iab_membership_number,
    universityName: row.university_name,
    universityEmail: row.university_email,
    profilePhotoUrl: row.profile_photo_url || null,
    createdAt: row.created_at,
    // password_hash intentionally never included, same rule as documents'
    // storage_path never appearing in admin API responses.
  };
}

export async function listUsers({ search, page = 1, pageSize = 25 }) {
  const conditions = [];
  const values = [];
  let i = 1;

  if (search) {
    conditions.push(
      `(full_name ILIKE $${i} OR email ILIKE $${i} OR iab_membership_number ILIKE $${i} OR university_name ILIKE $${i})`,
    );
    values.push(`%${search}%`);
    i += 1;
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const limitParam = i++;
  const offsetParam = i++;
  const offset = (page - 1) * pageSize;

  const rows = await pool.query(
    `SELECT * FROM users ${where} ORDER BY created_at DESC LIMIT $${limitParam} OFFSET $${offsetParam}`,
    [...values, pageSize, offset],
  );
  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS count FROM users ${where}`,
    values,
  );

  return {
    rows: rows.rows.map(toAdminUserView),
    total: countResult.rows[0].count,
    page,
    pageSize,
  };
}

export async function getUserDetail(userId) {
  const result = await pool.query("SELECT * FROM users WHERE id = $1", [
    userId,
  ]);
  if (result.rowCount === 0) throw new ApiError("User not found.", 404);
  return toAdminUserView(result.rows[0]);
}

function generateTemporaryPassword() {
  const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(14);
  let out = "";
  for (let i = 0; i < 14; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export async function resetUserPassword(userId, adminId) {
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);

  const result = await pool.query(
    "UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2 RETURNING id",
    [passwordHash, userId],
  );
  if (result.rowCount === 0) throw new ApiError("User not found.", 404);

  await logAdminAction(adminId, "RESET_USER_PASSWORD", {
    targetType: "USER",
    targetId: userId,
  });
  logger.info("Admin reset a user's password", { adminId, userId });

  // Returned once, in-memory only — never logged or stored anywhere.
  return { temporaryPassword };
}

export async function deleteUser(userId, adminId, code) {
  assertValidDeleteCode(code);

  const existing = await pool.query(
    "SELECT profile_photo_path FROM users WHERE id = $1",
    [userId],
  );
  if (existing.rowCount === 0) throw new ApiError("User not found.", 404);

  await pool.query("DELETE FROM users WHERE id = $1", [userId]);

  const photoPath = existing.rows[0].profile_photo_path;
  if (photoPath) {
    deleteImageUpload(path.basename(photoPath), {
      purpose: "profile-photos",
    }).catch(() => {});
  }

  await logAdminAction(adminId, "DELETE_USER", {
    targetType: "USER",
    targetId: userId,
  });
  logger.info("Admin deleted a user account", { adminId, userId });
}

export async function listAdmins() {
  const result = await pool.query(
    "SELECT id, email, full_name, must_change_password, created_at FROM admin_users ORDER BY created_at ASC",
  );
  return result.rows.map((r) => ({
    id: r.id,
    email: r.email,
    fullName: r.full_name,
    mustChangePassword: r.must_change_password,
    createdAt: r.created_at,
  }));
}

export async function deleteAdminAccount(targetAdminId, currentAdminId, code) {
  assertValidDeleteCode(code);

  if (targetAdminId === currentAdminId) {
    throw new ApiError(
      "You cannot delete your own admin account while logged in.",
      422,
    );
  }

  const result = await pool.query("DELETE FROM admin_users WHERE id = $1", [
    targetAdminId,
  ]);
  if (result.rowCount === 0)
    throw new ApiError("Admin account not found.", 404);

  await logAdminAction(currentAdminId, "DELETE_ADMIN", {
    targetType: "ADMIN",
    targetId: targetAdminId,
  });
  logger.info("Admin deleted another admin account", {
    currentAdminId,
    targetAdminId,
  });
}
