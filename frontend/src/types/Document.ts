// Mirrors backend/src/config/documentTypes.js exactly. Keep in sync by
// hand — there's no shared package between frontend/backend in this repo,
// same convention as Applicationid.ts mirroring applicationId.js.

export type DocumentType =
  | "APPLICANT_NID"
  | "APPLICANT_PHOTO"
  | "OWNER_AUTHORIZATION"
  | "DESIGN_DEMONSTRATION"
  | "COSTING"
  | "SUSTAINABILITY_METRICS"
  | "PROJECT_DESCRIPTION"
  | "EXECUTIVE_SUMMARY"
  | "ARCHITECTURAL_DRAWINGS"
  | "COVERING_LETTER";

// Team-member documents reuse the same two document_type values as the
// applicant's own APPLICANT_NID / APPLICANT_PHOTO — they're disambiguated
// server-side by memberId (submission_member_id), not by a different
// value. See config/documentTypes.js for the full rationale.
export type MemberDocumentType = "APPLICANT_NID" | "APPLICANT_PHOTO";

export type DocumentKind = "pdf" | "image" | "pdf_or_image";

export interface DocumentTypeDef {
  type: DocumentType;
  label: string;
  kind: DocumentKind;
  required: boolean;
  /** If set, this document is satisfied by either the upload OR this
   *  SubmissionDraftPatch field being non-empty (costing / projectDescription /
   *  executiveSummary / designDemonstration / coveringLetter). */
  orTextField?:
    | "costing"
    | "projectDescription"
    | "executiveSummary"
    | "designDemonstration"
    | "coveringLetter";
}

/**
 * Application-wide documents. NOTE: "ENGINEER_PHOTO" has been REMOVED —
 * there is no single "the engineer" once a submission can have up to 5
 * team members. A photo is now required per team member instead (see
 * MEMBER_DOCUMENT_TYPE_DEFS below), rendered inside each member's card in
 * TeamMembers.tsx, not as a global slot here.
 *
 * APPLICANT_NID / APPLICANT_PHOTO here still belong to the PRIMARY
 * APPLICANT (the account holder / guest who started the submission).
 *
 * EXECUTIVE_SUMMARY, DESIGN_DEMONSTRATION, PROJECT_DESCRIPTION, COSTING,
 * and COVERING_LETTER are all "either/or": required is false and
 * orTextField names the paired text field — the applicant only needs ONE
 * of {text, PDF}, never both.
 */
export const DOCUMENT_TYPE_DEFS: DocumentTypeDef[] = [
  {
    type: "APPLICANT_NID",
    label: "Applicant NID / Passport",
    kind: "pdf",
    required: true,
  },
  {
    type: "APPLICANT_PHOTO",
    label: "Applicant Photo",
    kind: "image",
    required: true,
  },
  {
    type: "OWNER_AUTHORIZATION",
    label: "Client / Owner Authorization Form(PDF)",
    kind: "pdf",
    required: true,
  },
  {
    type: "DESIGN_DEMONSTRATION",
    label: "Design Demonstration (PDF)",
    kind: "pdf",
    required: false,
    orTextField: "designDemonstration",
  },
  {
    type: "COSTING",
    label: "Costing (PDF)",
    kind: "pdf",
    required: false,
    orTextField: "costing",
  },
  {
    type: "SUSTAINABILITY_METRICS",
    label: "Sustainability Metrics / CO\u2082 Reduction Support",
    kind: "pdf",
    required: true,
  },
  {
    type: "PROJECT_DESCRIPTION",
    label: "Project Description (PDF)",
    kind: "pdf",
    required: false,
    orTextField: "projectDescription",
  },
  {
    type: "EXECUTIVE_SUMMARY",
    label: "Executive Summary (PDF)",
    kind: "pdf_or_image",
    required: false,
    orTextField: "executiveSummary",
  },
  {
    type: "ARCHITECTURAL_DRAWINGS",
    label: "Architectural Drawings",
    kind: "pdf",
    required: true,
  },
  {
    type: "COVERING_LETTER",
    label: "Covering Letter (PDF)",
    kind: "pdf",
    required: false,
    orTextField: "coveringLetter",
  },
];

/** Per-team-member documents — rendered inside each member's card. */
export const MEMBER_DOCUMENT_TYPE_DEFS: {
  type: MemberDocumentType;
  label: string;
  kind: DocumentKind;
  required: boolean;
}[] = [
  {
    type: "APPLICANT_NID",
    label: "NID / Passport",
    kind: "pdf",
    required: true,
  },
  {
    type: "APPLICANT_PHOTO",
    label: "Member Photo",
    kind: "image",
    required: true,
  },
];

export const MAX_DOCUMENT_SIZE_BYTES = 2 * 1024 * 1024;

export function acceptAttrFor(kind: DocumentKind): string {
  if (kind === "pdf") return "application/pdf";
  if (kind === "image") return "image/jpeg,image/png,image/webp";
  return "application/pdf,image/jpeg,image/png,image/webp";
}

export interface SubmissionDocument {
  id: string;
  documentType: DocumentType;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  uploadStatus: "UPLOADING" | "UPLOADED" | "FAILED";
  createdAt: string;
  updatedAt: string;
}

export type DocumentUiState =
  | "idle"
  | "selected"
  | "uploading"
  | "uploaded"
  | "failed";
