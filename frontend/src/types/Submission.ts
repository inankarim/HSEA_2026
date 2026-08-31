// Types mirror the backend exactly (see submission.service.js toPublicSubmission,
// submission.validators.js, auth.service.js toPublicUser). Do not add fields the
// backend doesn't return, and do not rename — the API is the source of truth.

export type ApplicantType = "IAB_MEMBER" | "STUDENT";

export type VerificationStatus =
  | "NOT_APPLICABLE"
  | "PENDING"
  | "VERIFIED"
  | "FAILED";

export type SubmissionStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "SHORTLISTED"
  | "FINALIST"
  | "WINNER"
  | "REJECTED";

export interface PublicUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  organization?: string | null;
  designation?: string | null;
  applicantType: ApplicantType;
  /** Null until the user uploads a photo via profile.uploadPhoto(). */
  profilePhotoUrl?: string | null;
  createdAt: string;
}

export interface Submission {
  applicationId: string;
  status: SubmissionStatus;

  applicantType: ApplicantType;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  organization: string | null;
  designation: string | null;

  iabMembershipNumber: string | null;
  iabVerificationStatus: VerificationStatus;
  applicantIsTeamLeader: boolean;

  universityName: string | null;
  universityEmail: string | null;
  universityVerificationStatus: VerificationStatus;

  projectName: string | null;
  projectCategory: string | null;
  projectLocation: string | null;
  projectStatus: string | null;
  clientOwner: string | null;
  clientName: string | null;
  clientAddress: string | null;
  clientContactNumber: string | null;
  clientEmail: string | null;
  leadEngineer: string | null;
  completionYear: number | null;

  executiveSummary: string | null;
  projectDescription: string | null;
  designDemonstration: string | null;
  materialSpecifications: string | null;
  constructionTechnology: string | null;
  costing: string | null;
  // NEW
  coveringLetter: string | null;

  googleDriveUrl: string | null;

  informationConfirmed: boolean;
  filesUploadedConfirmed: boolean;
  namingConventionConfirmed: boolean;
  authenticityConfirmed: boolean;
  termsAccepted: boolean;

  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
}

/**
 * Fields the client is permitted to write via PUT /submissions/:applicationId.
 * Mirrors submissionDraftSchema in submission.validators.js exactly — that
 * schema is `.strict()`, so sending any other key will fail validation.
 */
export type SubmissionDraftPatch = Partial<{
  applicantType: ApplicantType;
  fullName: string;
  email: string;
  phone: string;
  organization: string;
  designation: string;
  iabMembershipNumber: string;
  applicantIsTeamLeader: boolean;
  universityName: string;
  universityEmail: string;
  projectName: string;
  projectCategory: string;
  projectLocation: string;
  projectStatus: string;
  clientOwner: string;
  clientName: string;
  clientAddress: string;
  clientContactNumber: string;

  clientEmail: string;
  leadEngineer: string;
  completionYear: number;
  executiveSummary: string;
  projectDescription: string;
  designDemonstration: string;
  materialSpecifications: string;
  constructionTechnology: string;
  costing: string;
  // NEW
  coveringLetter: string;
  googleDriveUrl: string;
  informationConfirmed: boolean;
  filesUploadedConfirmed: boolean;
  namingConventionConfirmed: boolean;
  authenticityConfirmed: boolean;
  termsAccepted: boolean;
}>;

export interface StartSubmissionResponse {
  applicationId: string;
  status: SubmissionStatus;
  /** Only present for guest-created drafts. Store it — it cannot be recovered later. */
  guestAccessToken?: string;
}

export interface IabVerificationResult {
  verified: boolean;
  membershipNumber: string | null;
  memberName?: string;
}

export interface UniversityVerificationResult {
  verified: boolean;
  university?: {
    name: string;
    domain: string;
  };
}

/** Standard success envelope: { success: true, data, message } */
export interface ApiSuccess<T> {
  success: true;
  data: T;
  message: string;
}

/** Standard failure envelope: { success: false, message, errors } */
export interface ApiFailure {
  success: false;
  message: string;
  errors: Array<{ field?: string; message: string }>;
}

export const PROJECT_DESCRIPTION_WORD_LIMIT = 500;

export const SUBMISSION_SECTIONS = [
  { id: "applicant", label: "Applicant" },
  { id: "project", label: "Project" },
  { id: "team", label: "TeamMembers" },
  { id: "description", label: "Project Description" },
  { id: "technical", label: "Technical Information" },
  { id: "drive", label: "Google Drive" },
  { id: "documents", label: "Documents" },
  { id: "declaration", label: "Declaration" },
  { id: "review", label: "Review & Submit" },
] as const;

export type SectionId = (typeof SUBMISSION_SECTIONS)[number]["id"];

export interface SubmissionMember {
  id: string;
  fullName: string;
  position: string | null;
  phone: string | null;
  email: string | null;
  applicantType: ApplicantType | null;
  iabMembershipNumber: string | null;
  iabVerificationStatus: VerificationStatus;
  universityName: string | null;
  universityEmail: string | null;
  universityVerificationStatus: VerificationStatus;
  isTeamLeader: boolean;
}

export type MemberInput = Partial<Omit<SubmissionMember, "id">> & {
  fullName: string;
};
