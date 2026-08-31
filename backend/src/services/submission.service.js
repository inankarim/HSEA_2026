import crypto from "node:crypto";
import { pool, withTransaction } from "../config/database.js";
import { ApiError } from "../middleware/error.middleware.js";
import { generateApplicationId } from "../utils/applicationId.js";
import { countWords } from "../utils/wordCount.js";
import { verifyIabMembership } from "./iab.service.js";
import { verifyUniversityEmail } from "./university.service.js";
import { logger } from "../utils/logger.js";
// Required-document registry, used only by the final-submit check near the
// bottom of finalizeSubmission().
import {
  requiredDocumentTypes,
  conditionallyRequiredDocumentTypes,
  requiredMemberDocumentTypes,
  DOCUMENT_TYPES,
  MEMBER_DOCUMENT_TYPES,
} from "../config/documentTypes.js";

const PROJECT_DESCRIPTION_WORD_LIMIT = 500;
const MAX_APPLICATION_ID_RETRIES = 5;
const MAX_MEMBERS_PER_SUBMISSION = 5;

// --- helpers ---------------------------------------------------------

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateGuestToken() {
  return crypto.randomBytes(32).toString("base64url");
}

/** Maps a DB row (snake_case) to the public API shape (camelCase),
 *  excluding the internal `id` and any guest-token hash. */
function toPublicSubmission(row) {
  return {
    applicationId: row.application_id,
    status: row.status,

    applicantType: row.applicant_type,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    organization: row.organization,
    designation: row.designation,

    iabMembershipNumber: row.iab_membership_number,
    iabVerificationStatus: row.iab_verification_status,
    applicantIsTeamLeader: row.applicant_is_team_leader,

    universityName: row.university_name,
    universityEmail: row.university_email,
    universityVerificationStatus: row.university_verification_status,

    projectName: row.project_name,
    projectCategory: row.project_category,
    projectLocation: row.project_location,
    projectStatus: row.project_status,
    clientOwner: row.client_owner,
    clientName: row.client_name,
    clientAddress: row.client_address,
    clientContactNumber: row.client_contact_number,
    clientEmail: row.client_email,
    leadEngineer: row.lead_engineer,
    completionYear: row.completion_year,

    executiveSummary: row.executive_summary,
    projectDescription: row.project_description,
    designDemonstration: row.design_demonstration,
    materialSpecifications: row.material_specifications,
    constructionTechnology: row.construction_technology,
    costing: row.costing,
    // NEW
    coveringLetter: row.covering_letter,

    googleDriveUrl: row.google_drive_url,

    informationConfirmed: row.information_confirmed,
    filesUploadedConfirmed: row.files_uploaded_confirmed,
    namingConventionConfirmed: row.naming_convention_confirmed,
    authenticityConfirmed: row.authenticity_confirmed,
    termsAccepted: row.terms_accepted,

    createdAt: row.created_at,
    updatedAt: row.updated_at,
    submittedAt: row.submitted_at,
  };
}

function toPublicMember(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    position: row.position,
    phone: row.phone,
    email: row.email,
    applicantType: row.applicant_type,
    iabMembershipNumber: row.iab_membership_number,
    iabVerificationStatus: row.iab_verification_status,
    universityName: row.university_name,
    universityEmail: row.university_email,
    universityVerificationStatus: row.university_verification_status,
    isTeamLeader: row.is_team_leader,
  };
}

const CAMEL_TO_COLUMN = {
  applicantType: "applicant_type",
  fullName: "full_name",
  email: "email",
  phone: "phone",
  organization: "organization",
  designation: "designation",
  iabMembershipNumber: "iab_membership_number",
  applicantIsTeamLeader: "applicant_is_team_leader",
  universityName: "university_name",
  universityEmail: "university_email",
  projectName: "project_name",
  projectCategory: "project_category",
  projectLocation: "project_location",
  projectStatus: "project_status",
  clientOwner: "client_owner",
  clientName: "client_name",
  clientAddress: "client_address",
  clientContactNumber: "client_contact_number",
  clientEmail: "client_email",
  leadEngineer: "lead_engineer",
  completionYear: "completion_year",
  executiveSummary: "executive_summary",
  projectDescription: "project_description",
  designDemonstration: "design_demonstration",
  materialSpecifications: "material_specifications",
  constructionTechnology: "construction_technology",
  costing: "costing",
  // NEW
  coveringLetter: "covering_letter",
  googleDriveUrl: "google_drive_url",
  informationConfirmed: "information_confirmed",
  filesUploadedConfirmed: "files_uploaded_confirmed",
  namingConventionConfirmed: "naming_convention_confirmed",
  authenticityConfirmed: "authenticity_confirmed",
  termsAccepted: "terms_accepted",
};

// --- start submission --------------------------------------------------

/**
 * Creates a new DRAFT submission and returns its Application ID + (for
 * guests) a one-time access token used to retrieve/edit the draft later.
 * The Application ID is generated before the applicant creates their
 * Google Drive folder, per the required workflow.
 */
export async function startSubmission({ userId, guestEmail }) {
  let applicationId;
  let attempt = 0;

  // Snapshot applicant info from the account at creation time; later
  // account edits must not retroactively change historical submissions.
  let snapshot = {
    fullName: null,
    email: guestEmail || null,
    applicantType: "STUDENT",
  };
  if (userId) {
    const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [
      userId,
    ]);
    if (userResult.rowCount === 0) {
      throw new ApiError("User not found.", 404);
    }
    const u = userResult.rows[0];
    snapshot = {
      fullName: u.full_name,
      email: u.email,
      phone: u.phone,
      organization: u.organization,
      designation: u.designation,
      applicantType: u.applicant_type,
      iabMembershipNumber: u.iab_membership_number,
      universityName: u.university_name,
      universityEmail: u.university_email,
    };
  }

  let guestToken = null;
  let guestTokenHash = null;
  if (!userId) {
    guestToken = generateGuestToken();
    guestTokenHash = hashToken(guestToken);
  }

  // Retry on the astronomically rare Application ID collision.
  while (attempt < MAX_APPLICATION_ID_RETRIES) {
    applicationId = generateApplicationId();
    try {
      const result = await pool.query(
        `INSERT INTO submissions (
           application_id, user_id, guest_access_token_hash, applicant_type,
           full_name, email, phone, organization, designation,
           iab_membership_number, university_name, university_email,
           iab_verification_status, university_verification_status, status
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'DRAFT')
         RETURNING *`,
        [
          applicationId,
          userId || null,
          guestTokenHash,
          snapshot.applicantType,
          snapshot.fullName,
          snapshot.email,
          snapshot.phone || null,
          snapshot.organization || null,
          snapshot.designation || null,
          snapshot.iabMembershipNumber || null,
          snapshot.universityName || null,
          snapshot.universityEmail || null,
          snapshot.applicantType === "IAB_MEMBER"
            ? "PENDING"
            : "NOT_APPLICABLE",
          snapshot.applicantType === "STUDENT" ? "PENDING" : "NOT_APPLICABLE",
        ],
      );

      logger.info("Submission started", {
        applicationId,
        userId: userId || null,
        guest: !userId,
      });

      return {
        applicationId: result.rows[0].application_id,
        status: result.rows[0].status,
        guestAccessToken: guestToken, // null for registered users; shown once
      };
    } catch (err) {
      if (err.code === "23505") {
        attempt += 1;
        continue; // collision on application_id — regenerate and retry
      }
      throw err;
    }
  }

  throw new ApiError(
    "Could not allocate a unique Application ID. Please try again.",
    500,
  );
}

// --- retrieve / authorize ----------------------------------------------

async function fetchSubmissionRow(applicationId) {
  const result = await pool.query(
    "SELECT * FROM submissions WHERE application_id = $1",
    [applicationId],
  );
  if (result.rowCount === 0) {
    throw new ApiError("Submission not found.", 404);
  }
  return result.rows[0];
}

/**
 * Authorization: a registered owner may access their own submission by
 * session; a guest must present the access token issued at creation.
 * The Application ID alone is a public reference, never sufficient proof
 * of ownership for private draft data.
 */
function assertCanAccess(row, { userId, guestToken }) {
  if (row.user_id) {
    if (!userId || userId !== row.user_id) {
      throw new ApiError("You do not have access to this submission.", 403);
    }
    return;
  }

  // Guest-owned submission
  if (!guestToken || hashToken(guestToken) !== row.guest_access_token_hash) {
    throw new ApiError("You do not have access to this submission.", 403);
  }
}

async function assertSubmissionEditable(applicationId, { userId, guestToken }) {
  const row = await fetchSubmissionRow(applicationId);
  assertCanAccess(row, { userId, guestToken });
  if (row.status !== "DRAFT") {
    throw new ApiError(
      "This submission has already been submitted and can no longer be edited.",
      409,
    );
  }
  return row;
}

// Shared by document.controller.js (list/download) so read access to an
// applicant's documents uses the exact same ownership rule as everything
// else, regardless of DRAFT/SUBMITTED status (unlike assertSubmissionEditable,
// which additionally requires DRAFT and is used for upload/delete/edit).
async function getSubmissionForAccess(applicationId, { userId, guestToken }) {
  const row = await fetchSubmissionRow(applicationId);
  assertCanAccess(row, { userId, guestToken });
  return row;
}

export async function getSubmission(applicationId, { userId, guestToken }) {
  const row = await fetchSubmissionRow(applicationId);
  assertCanAccess(row, { userId, guestToken });
  return toPublicSubmission(row);
}

// --- update draft --------------------------------------------------------

export async function updateSubmissionDraft(
  applicationId,
  patch,
  { userId, guestToken },
) {
  const row = await fetchSubmissionRow(applicationId);
  assertCanAccess(row, { userId, guestToken });

  if (row.status !== "DRAFT") {
    throw new ApiError(
      "This submission has already been submitted and can no longer be edited.",
      409,
    );
  }

  if (
    patch.projectDescription !== undefined &&
    countWords(patch.projectDescription) > PROJECT_DESCRIPTION_WORD_LIMIT
  ) {
    throw new ApiError(
      `Project description must not exceed ${PROJECT_DESCRIPTION_WORD_LIMIT} words.`,
      422,
    );
  }

  if (patch.applicantIsTeamLeader === true) {
    const leaderCheck = await pool.query(
      "SELECT 1 FROM submission_members WHERE application_id = $1 AND is_team_leader = TRUE",
      [applicationId],
    );
    if (leaderCheck.rowCount > 0) {
      throw new ApiError(
        "A team member is already designated as team leader. Remove them first, or uncheck this.",
        422,
      );
    }
  }

  const setClauses = [];
  const values = [];
  let i = 1;

  for (const [camelKey, column] of Object.entries(CAMEL_TO_COLUMN)) {
    if (patch[camelKey] !== undefined) {
      setClauses.push(`${column} = $${i}`);
      values.push(patch[camelKey]);
      i += 1;
    }
  }

  // Re-run verification eagerly when the applicant changes their IAB
  // number or university email mid-draft, so the UI can reflect status
  // before final submission (final submission always re-verifies too).
  if (patch.iabMembershipNumber !== undefined) {
    const { verified } = await verifyIabMembership(patch.iabMembershipNumber);
    setClauses.push(`iab_verification_status = $${i}`);
    values.push(verified ? "VERIFIED" : "FAILED");
    i += 1;
  }
  if (patch.universityEmail !== undefined) {
    const { verified } = await verifyUniversityEmail(patch.universityEmail);
    setClauses.push(`university_verification_status = $${i}`);
    values.push(verified ? "VERIFIED" : "FAILED");
    i += 1;
  }

  if (setClauses.length === 0) {
    return toPublicSubmission(row);
  }

  setClauses.push(`updated_at = now()`);
  values.push(applicationId);

  const result = await pool.query(
    `UPDATE submissions SET ${setClauses.join(", ")}
      WHERE application_id = $${i} AND status = 'DRAFT'
      RETURNING *`,
    values,
  );

  if (result.rowCount === 0) {
    // Status flipped to SUBMITTED between our check and the write
    // (concurrent final submission) — surface as a conflict.
    throw new ApiError(
      "This submission has already been submitted and can no longer be edited.",
      409,
    );
  }

  return toPublicSubmission(result.rows[0]);
}

// --- team members --------------------------------------------------------
//
// One-time-add model: members are added during the draft and never edited
// in place. To change a member's details, remove and re-add. At most one
// member may be flagged as the team leader — enforced both by a partial
// unique index in the database and by the check below inside a
// transaction, so a leader can never be silently reassigned.

export async function listMembers(applicationId, auth) {
  const row = await fetchSubmissionRow(applicationId);
  assertCanAccess(row, auth);
  const result = await pool.query(
    `SELECT * FROM submission_members
      WHERE application_id = $1
      ORDER BY is_team_leader DESC, display_order ASC, created_at ASC`,
    [applicationId],
  );
  return result.rows.map(toPublicMember);
}

export async function addMember(applicationId, input, auth) {
  const submissionRow = await assertSubmissionEditable(applicationId, auth);

  if (input.isTeamLeader && submissionRow.applicant_is_team_leader) {
    throw new ApiError(
      "The applicant is already designated as team leader.",
      422,
    );
  }

  let iabStatus = "NOT_APPLICABLE";
  let universityStatus = "NOT_APPLICABLE";

  if (input.applicantType === "IAB_MEMBER") {
    const { verified } = await verifyIabMembership(input.iabMembershipNumber);
    iabStatus = verified ? "VERIFIED" : "FAILED";
    if (!verified) {
      throw new ApiError(
        "This team member's IAB membership number could not be verified. Please check the number and try again.",
        422,
      );
    }
  }

  if (input.applicantType === "STUDENT" && input.universityEmail) {
    // Verified and stored, but never blocks — same policy as the main
    // applicant's university check.
    const { verified } = await verifyUniversityEmail(input.universityEmail);
    universityStatus = verified ? "VERIFIED" : "FAILED";
  }

  return withTransaction(async (client) => {
    const countResult = await client.query(
      "SELECT COUNT(*)::int AS count FROM submission_members WHERE application_id = $1",
      [applicationId],
    );
    if (countResult.rows[0].count >= MAX_MEMBERS_PER_SUBMISSION) {
      throw new ApiError(
        `A submission can have at most ${MAX_MEMBERS_PER_SUBMISSION} team members.`,
        422,
      );
    }

    if (input.isTeamLeader) {
      const leaderCheck = await client.query(
        "SELECT 1 FROM submission_members WHERE application_id = $1 AND is_team_leader = TRUE",
        [applicationId],
      );
      if (leaderCheck.rowCount > 0) {
        throw new ApiError("This submission already has a team leader.", 422);
      }
    }

    const result = await client.query(
      `INSERT INTO submission_members
         (application_id, full_name, position, phone, email, applicant_type,
          iab_membership_number, iab_verification_status,
          university_name, university_email, university_verification_status,
          is_team_leader, display_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
         (SELECT COALESCE(MAX(display_order), -1) + 1 FROM submission_members WHERE application_id = $13))
       RETURNING *`,
      [
        applicationId,
        input.fullName,
        input.position || null,
        input.phone || null,
        input.email || null,
        input.applicantType || null,
        input.iabMembershipNumber || null,
        iabStatus,
        input.universityName || null,
        input.universityEmail || null,
        universityStatus,
        Boolean(input.isTeamLeader),
        applicationId,
      ],
    );

    return toPublicMember(result.rows[0]);
  });
}

export async function removeMember(applicationId, memberId, auth) {
  await assertSubmissionEditable(applicationId, auth);

  // Collect this member's uploaded files BEFORE deleting the row: the
  // submission_documents rows referencing this member are removed
  // automatically by the ON DELETE CASCADE FK on submission_member_id
  // (migration 012), which cleans up the DATABASE metadata, but the
  // actual files on disk are only cleaned up here, explicitly, afterward.
  const docsResult = await pool.query(
    "SELECT storage_path FROM submission_documents WHERE application_id = $1 AND submission_member_id = $2",
    [applicationId, memberId],
  );
  const storagePaths = docsResult.rows.map((r) => r.storage_path);

  const result = await pool.query(
    "DELETE FROM submission_members WHERE id = $1 AND application_id = $2",
    [memberId, applicationId],
  );
  if (result.rowCount === 0) {
    throw new ApiError("Member not found.", 404);
  }

  if (storagePaths.length > 0) {
    // Lazy import to avoid a hard circular-import dependency at module
    // load time (document.service.js also imports from this file).
    const { removeAllMemberDocumentFiles } =
      await import("./document.service.js");
    await removeAllMemberDocumentFiles(storagePaths);
  }
}

// --- required fields for final submission --------------------------------
//
// NOTE: "executive_summary" and "project_description" are DELIBERATELY
// NOT in this list. They (along with design_demonstration and costing)
// are either/or fields — satisfied by EITHER the text column OR an
// uploaded PDF — and that check is done generically in
// getMissingDocumentDescriptions() below via conditionallyRequiredDocumentTypes().
// Hard-requiring them here as well was the bug: it forced BOTH the text
// AND the upload to be present instead of either one.
const REQUIRED_COMMON_FIELDS = [
  "full_name",
  "email",
  "project_name",
  "project_category",
  "google_drive_url",
];

function validateRequiredFields(row) {
  const missing = REQUIRED_COMMON_FIELDS.filter((f) => !row[f]);

  if (
    !row.information_confirmed ||
    !row.files_uploaded_confirmed ||
    !row.naming_convention_confirmed ||
    !row.authenticity_confirmed ||
    !row.terms_accepted
  ) {
    missing.push("all declarations must be confirmed");
  }

  if (
    row.project_description &&
    countWords(row.project_description) > PROJECT_DESCRIPTION_WORD_LIMIT
  ) {
    missing.push(
      `project_description exceeds ${PROJECT_DESCRIPTION_WORD_LIMIT} words`,
    );
  }

  return missing;
}

// Required-document completeness check, run inside the same locked
// transaction as everything else in finalizeSubmission so a concurrent
// upload/delete can't race past it. Unconditionally-required application-
// wide types (DOCUMENT_TYPES[x].required === true) must have an UPLOADED
// row with submission_member_id IS NULL. Conditionally-required types
// (COSTING, PROJECT_DESCRIPTION, EXECUTIVE_SUMMARY, DESIGN_DEMONSTRATION,
// COVERING_LETTER) are satisfied by either the uploaded file OR the
// paired text column already being non-empty on `row` — never trusts a
// frontend-reported "uploaded" flag, only what's actually in
// submission_documents / the row itself.
async function getMissingDocumentDescriptions(client, applicationId, row) {
  const result = await client.query(
    `SELECT document_type FROM submission_documents
      WHERE application_id = $1 AND submission_member_id IS NULL AND upload_status = 'UPLOADED'`,
    [applicationId],
  );
  const uploadedTypes = new Set(result.rows.map((r) => r.document_type));

  const missing = [];

  for (const type of requiredDocumentTypes()) {
    if (!uploadedTypes.has(type)) {
      missing.push(`${DOCUMENT_TYPES[type].label} must be uploaded`);
    }
  }

  for (const type of conditionallyRequiredDocumentTypes()) {
    const def = DOCUMENT_TYPES[type];
    const textColumn = CAMEL_TO_COLUMN[def.orTextField] || def.orTextField;
    const textSatisfied = Boolean(row[textColumn]);
    if (!uploadedTypes.has(type) && !textSatisfied) {
      missing.push(
        `${def.label} must be provided as either text or an uploaded file`,
      );
    }
  }

  return missing;
}

/**
 * NEW — every team member (submission_members row) must have BOTH an
 * uploaded NID/Passport and an uploaded Member Photo before final
 * submission. Run inside the same locked transaction as everything else
 * in finalizeSubmission so a concurrent member add/remove or document
 * upload/delete can't race past it.
 */
async function getMissingMemberDocumentDescriptions(client, applicationId) {
  const membersResult = await client.query(
    "SELECT id, full_name FROM submission_members WHERE application_id = $1",
    [applicationId],
  );
  if (membersResult.rowCount === 0) return [];

  const docsResult = await client.query(
    `SELECT submission_member_id, document_type FROM submission_documents
      WHERE application_id = $1 AND submission_member_id IS NOT NULL AND upload_status = 'UPLOADED'`,
    [applicationId],
  );
  const uploadedByMember = new Map(); // memberId -> Set(documentType)
  for (const r of docsResult.rows) {
    if (!uploadedByMember.has(r.submission_member_id)) {
      uploadedByMember.set(r.submission_member_id, new Set());
    }
    uploadedByMember.get(r.submission_member_id).add(r.document_type);
  }

  const requiredTypes = requiredMemberDocumentTypes();
  const missing = [];
  for (const member of membersResult.rows) {
    const uploaded = uploadedByMember.get(member.id) || new Set();
    for (const type of requiredTypes) {
      if (!uploaded.has(type)) {
        missing.push(
          `team member "${member.full_name}"'s ${MEMBER_DOCUMENT_TYPES[type].label} must be uploaded`,
        );
      }
    }
  }
  return missing;
}

// --- idempotency -----------------------------------------------------

async function getIdempotentResponse(client, key, applicationId) {
  if (!key) return null;
  const result = await client.query(
    `SELECT response_status, response_body FROM idempotency_keys
      WHERE idempotency_key = $1 AND application_id = $2`,
    [key, applicationId],
  );
  return result.rows[0] || null;
}

async function storeIdempotentResponse(
  client,
  key,
  applicationId,
  status,
  body,
) {
  if (!key) return;
  await client.query(
    `INSERT INTO idempotency_keys (idempotency_key, application_id, response_status, response_body)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (idempotency_key, application_id) DO NOTHING`,
    [key, applicationId, status, body],
  );
}

// --- final submission --------------------------------------------------

/**
 * Atomically verifies eligibility and transitions DRAFT -> SUBMITTED.
 *
 * Double-submission protection: the UPDATE below only matches rows where
 * status = 'DRAFT', and PostgreSQL row-level locking (implicit in the
 * UPDATE) ensures that if two concurrent requests race for the same
 * application_id, only one can win the transition; the other sees
 * rowCount = 0 and is told the submission was already finalized. This
 * holds even across multiple Node.js instances, because the guarantee
 * comes from PostgreSQL, not from in-process state.
 */
export async function finalizeSubmission(
  applicationId,
  { userId, guestToken, idempotencyKey },
) {
  return withTransaction(async (client) => {
    const rowResult = await client.query(
      "SELECT * FROM submissions WHERE application_id = $1 FOR UPDATE",
      [applicationId],
    );
    if (rowResult.rowCount === 0) {
      throw new ApiError("Submission not found.", 404);
    }
    const row = rowResult.rows[0];
    assertCanAccess(row, { userId, guestToken }); // ← moved up, checked before any idempotency shortcut

    const existingIdempotent = await getIdempotentResponse(
      client,
      idempotencyKey,
      applicationId,
    );
    if (existingIdempotent) {
      return {
        replayed: true,
        status: existingIdempotent.response_status,
        body: existingIdempotent.response_body,
      };
    }
    if (row.status !== "DRAFT") {
      const body = {
        applicationId: row.application_id,
        status: row.status,
        message: "This submission has already been finalized.",
      };
      await storeIdempotentResponse(
        client,
        idempotencyKey,
        applicationId,
        409,
        body,
      );
      throw new ApiError(body.message, 409);
    }

    // Server-side re-verification — never trust a cached client-side status.
    let iabStatus = row.iab_verification_status;
    let universityStatus = row.university_verification_status;

    if (row.applicant_type === "IAB_MEMBER") {
      const { verified } = await verifyIabMembership(row.iab_membership_number);
      iabStatus = verified ? "VERIFIED" : "FAILED";
      if (!verified) {
        throw new ApiError(
          "IAB membership number could not be verified. Please check the number and try again.",
          422,
        );
      }
    }

    if (row.applicant_type === "STUDENT") {
      const { verified } = await verifyUniversityEmail(row.university_email);
      universityStatus = verified ? "VERIFIED" : "FAILED";
      // TEMP: not blocking submission on failed university verification during dev
      // if (!verified) {
      //   throw new ApiError(
      //     "University email could not be verified against an approved institution domain.",
      //     422,
      //   );
      // }
    }

    const missing = validateRequiredFields(row);

    // Required application-wide documents (or their text-field
    // alternatives) must all be present.
    const missingDocuments = await getMissingDocumentDescriptions(
      client,
      applicationId,
      row,
    );
    missing.push(...missingDocuments);

    // NEW — every team member must have their own NID + Photo uploaded.
    const missingMemberDocuments = await getMissingMemberDocumentDescriptions(
      client,
      applicationId,
    );
    missing.push(...missingMemberDocuments);

    // A submission must have exactly one designated team leader among its
    // members before it can be finalized. Checked here, inside the same
    // locked transaction as the rest of final-submit validation, so a
    // concurrent member add/remove can't race past this check.
    const leaderCheck = await client.query(
      "SELECT COUNT(*)::int AS count FROM submission_members WHERE application_id = $1 AND is_team_leader = TRUE",
      [applicationId],
    );
    if (leaderCheck.rows[0].count === 0 && !row.applicant_is_team_leader) {
      missing.push("a team leader must be designated");
    }

    // Re-verify every IAB-member team member's number server-side — never
    // trust the status stored at add-time. University email failures are
    // informational only for members and never block final submission.
    const memberRows = await client.query(
      "SELECT id, full_name, applicant_type, iab_membership_number FROM submission_members WHERE application_id = $1",
      [applicationId],
    );
    for (const member of memberRows.rows) {
      if (member.applicant_type === "IAB_MEMBER") {
        const { verified } = await verifyIabMembership(
          member.iab_membership_number,
        );
        await client.query(
          "UPDATE submission_members SET iab_verification_status = $1 WHERE id = $2",
          [verified ? "VERIFIED" : "FAILED", member.id],
        );
        if (!verified) {
          missing.push(
            `team member "${member.full_name}"'s IAB membership number could not be re-verified`,
          );
        }
      }
    }

    if (missing.length > 0) {
      throw new ApiError(
        "Submission is incomplete. Please fill in all required fields and confirm all declarations.",
        422,
        missing.map((field) => ({ field, message: "Required" })),
      );
    }

    const updateResult = await client.query(
      `UPDATE submissions
          SET status = 'SUBMITTED',
              submitted_at = now(),
              updated_at = now(),
              iab_verification_status = $1,
              university_verification_status = $2
        WHERE application_id = $3 AND status = 'DRAFT'
        RETURNING *`,
      [iabStatus, universityStatus, applicationId],
    );

    if (updateResult.rowCount === 0) {
      // Lost the race despite FOR UPDATE somehow (e.g. retried after a
      // crash) — treat as already-submitted rather than erroring oddly.
      throw new ApiError("This submission has already been finalized.", 409);
    }

    const submitted = toPublicSubmission(updateResult.rows[0]);
    await storeIdempotentResponse(
      client,
      idempotencyKey,
      applicationId,
      200,
      submitted,
    );

    logger.info("Submission finalized", { applicationId });

    return { replayed: false, status: 200, body: submitted };
  });
}

export {
  toPublicSubmission,
  hashToken,
  // Reused by controllers/document.controller.js so document
  // upload/list/download/delete share the exact same ownership and
  // draft-only-editing rules as every other part of a submission, instead
  // of a second, parallel implementation.
  assertSubmissionEditable,
  getSubmissionForAccess,
};
