/**
 * Single source of truth for applicant document types on the backend.
 *
 * This mirrors frontend/src/types/Document.ts (DOCUMENT_TYPE_DEFS /
 * MEMBER_DOCUMENT_TYPE_DEFS) field for field. If you add/remove/rename a
 * document type, update BOTH files in the same commit — nothing here
 * imports from the frontend or vice versa (separate deploy targets), so
 * this pairing is enforced by discipline + document.test.js, not by the
 * type system.
 *
 * CHANGE (team-member documents):
 *   - "ENGINEER_PHOTO" as a single, application-wide slot has been
 *     REMOVED. It never made sense once a submission can have up to 5
 *     team members — there is no one "the engineer" to attach a single
 *     photo to.
 *   - Every team member now needs their own NID/Passport and their own
 *     photo. Those are represented by MEMBER_DOCUMENT_TYPES below and are
 *     stored in the SAME submission_documents table, scoped by
 *     submission_member_id (see migration 012). We deliberately reuse the
 *     document_type values "APPLICANT_NID" / "APPLICANT_PHOTO" for member
 *     documents too, instead of inventing new enum values — the existing
 *     CHECK constraint on submission_documents.document_type already
 *     allows them, and the partial unique indexes from migration 012
 *     already scope uniqueness by (application_id, document_type,
 *     submission_member_id), so "member 3's NID" and "the primary
 *     applicant's NID" never collide. No new migration is required.
 *   - APPLICANT_NID / APPLICANT_PHOTO in DOCUMENT_TYPES below still refer
 *     to the PRIMARY APPLICANT (the account holder / guest who started
 *     the submission) — a person who exists whether or not they've also
 *     added themselves as a submission_members row. Team members added
 *     via the "Team Members" section always go through
 *     MEMBER_DOCUMENT_TYPES + submission_member_id instead.
 *
 * CHANGE (either-text-or-PDF documents):
 *   - EXECUTIVE_SUMMARY, PROJECT_DESCRIPTION, DESIGN_DEMONSTRATION, and
 *     COSTING are all "either/or" fields: the applicant may satisfy each
 *     one with EITHER the paired text field OR an uploaded PDF — never
 *     both required. This is expressed the same way for all four:
 *     `required: false` + `orTextField: "<camelCase field>"`. The actual
 *     "must have text OR file" enforcement lives in
 *     conditionallyRequiredDocumentTypes() / submission.service.js's
 *     getMissingDocumentDescriptions(), not here.
 *   - COVERING_LETTER (NEW) follows the exact same either/or pattern.
 */

export const MAX_DOCUMENT_SIZE_BYTES = 2 * 1024 * 1024; // 2MB, hard backend limit

const PDF_MIME_TYPES = ["application/pdf"];
const IMAGE_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const PDF_OR_IMAGE_MIME_TYPES = [...PDF_MIME_TYPES, ...IMAGE_MIME_TYPES];

const PDF_EXTENSIONS = [".pdf"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const PDF_OR_IMAGE_EXTENSIONS = [...PDF_EXTENSIONS, ...IMAGE_EXTENSIONS];

/**
 * kind -> { mimeTypes, extensions }. Keeps the mime/extension lists in one
 * place instead of repeating them per document type.
 */
const KIND_DEFS = {
  pdf: { mimeTypes: PDF_MIME_TYPES, extensions: PDF_EXTENSIONS },
  image: { mimeTypes: IMAGE_MIME_TYPES, extensions: IMAGE_EXTENSIONS },
  pdf_or_image: {
    mimeTypes: PDF_OR_IMAGE_MIME_TYPES,
    extensions: PDF_OR_IMAGE_EXTENSIONS,
  },
};

/**
 * type -> { label, kind, required, orTextField? }
 *
 * `orTextField`, when present, names the camelCase SubmissionDraftPatch
 * field (see submission.validators.js / submission.service.js
 * CAMEL_TO_COLUMN) that can satisfy this document instead of an upload.
 * COSTING, PROJECT_DESCRIPTION, EXECUTIVE_SUMMARY, DESIGN_DEMONSTRATION,
 * and COVERING_LETTER all use this pattern — everything else must be
 * uploaded if `required` is true.
 *
 * These are APPLICATION-WIDE documents (submission_member_id IS NULL).
 * APPLICANT_NID / APPLICANT_PHOTO here belong to the primary applicant,
 * NOT to team members — see MEMBER_DOCUMENT_TYPES below for those.
 */
export const DOCUMENT_TYPES = {
  APPLICANT_NID: {
    label: "Applicant NID / Passport",
    kind: "pdf",
    required: true,
  },
  APPLICANT_PHOTO: {
    label: "Applicant Photo",
    kind: "image",
    required: true,
  },
  OWNER_AUTHORIZATION: {
    label: "Client / Owner Authorization Form",
    kind: "pdf",
    required: true,
  },
  DESIGN_DEMONSTRATION: {
    label: "Design Demonstration (PDF)",
    kind: "pdf",
    required: false,
    orTextField: "designDemonstration",
  },
  COSTING: {
    label: "Costing (PDF)",
    kind: "pdf",
    required: false,
    orTextField: "costing",
  },
  SUSTAINABILITY_METRICS: {
    label: "Sustainability Metrics / CO\u2082 Reduction Support",
    kind: "pdf",
    required: true,
  },
  PROJECT_DESCRIPTION: {
    label: "Project Description (PDF)",
    kind: "pdf",
    required: false,
    orTextField: "projectDescription",
  },
  EXECUTIVE_SUMMARY: {
    label: "Executive Summary (PDF)",
    kind: "pdf_or_image",
    required: false,
    orTextField: "executiveSummary",
  },
  ARCHITECTURAL_DRAWINGS: {
    label: "Architectural Drawings",
    kind: "pdf",
    required: true,
  },
  COVERING_LETTER: {
    label: "Covering Letter (PDF)",
    kind: "pdf",
    required: false,
    orTextField: "coveringLetter",
  },
};

export const DOCUMENT_TYPE_KEYS = Object.keys(DOCUMENT_TYPES);

/**
 * PER-TEAM-MEMBER documents (submission_member_id IS NOT NULL).
 * Every member added in the Team Members section needs both of these.
 * Reuses the same document_type string values as DOCUMENT_TYPES on
 * purpose (see module doc comment) — they're disambiguated in the
 * database by submission_member_id, never by a different enum value.
 */
export const MEMBER_DOCUMENT_TYPES = {
  APPLICANT_NID: {
    label: "NID / Passport",
    kind: "pdf",
    required: true,
  },
  APPLICANT_PHOTO: {
    label: "Member Photo",
    kind: "image",
    required: true,
  },
};

export const MEMBER_DOCUMENT_TYPE_KEYS = Object.keys(MEMBER_DOCUMENT_TYPES);

export function isValidDocumentType(type) {
  return (
    typeof type === "string" &&
    Object.prototype.hasOwnProperty.call(DOCUMENT_TYPES, type)
  );
}

export function isValidMemberDocumentType(type) {
  return (
    typeof type === "string" &&
    Object.prototype.hasOwnProperty.call(MEMBER_DOCUMENT_TYPES, type)
  );
}

export function allowedMimeTypesFor(type) {
  const def = DOCUMENT_TYPES[type];
  if (!def) return [];
  return KIND_DEFS[def.kind].mimeTypes;
}

export function allowedMimeTypesForMember(type) {
  const def = MEMBER_DOCUMENT_TYPES[type];
  if (!def) return [];
  return KIND_DEFS[def.kind].mimeTypes;
}

export function allowedExtensionsFor(type) {
  const def = DOCUMENT_TYPES[type];
  if (!def) return [];
  return KIND_DEFS[def.kind].extensions;
}

export function allowedExtensionsForMember(type) {
  const def = MEMBER_DOCUMENT_TYPES[type];
  if (!def) return [];
  return KIND_DEFS[def.kind].extensions;
}

/** Unconditionally-required types — must have an UPLOADED row to finalize. */
export function requiredDocumentTypes() {
  return DOCUMENT_TYPE_KEYS.filter((k) => DOCUMENT_TYPES[k].required === true);
}

/** Satisfied by EITHER an UPLOADED row OR the paired text field being non-empty. */
export function conditionallyRequiredDocumentTypes() {
  return DOCUMENT_TYPE_KEYS.filter((k) =>
    Boolean(DOCUMENT_TYPES[k].orTextField),
  );
}

/** Every member document type is unconditionally required (NID + Photo). */
export function requiredMemberDocumentTypes() {
  return MEMBER_DOCUMENT_TYPE_KEYS.filter(
    (k) => MEMBER_DOCUMENT_TYPES[k].required === true,
  );
}
