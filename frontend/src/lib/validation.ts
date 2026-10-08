// Client-side validation limits mirroring the backend's actual contract
// (backend/src/validators/auth.validators.js, submission.validators.js).
// These are UX only — the backend re-validates everything regardless, but
// matching limits here means users get instant feedback instead of only
// finding out after a round-trip.

// Letters (any language) plus spaces, apostrophes, hyphens, periods —
// same pattern the backend rejects HTML/script-like input with.
export const NAME_PATTERN = "^[\\p{L}\\p{M}][\\p{L}\\p{M}\\s'.-]*$";
export const NAME_TITLE = "Letters, spaces, apostrophes, hyphens, and periods only.";

// Bangladesh mobile numbers only — same rule as
// backend/src/validators/auth.validators.js's bangladeshPhoneSchema.
// Local (01XXXXXXXXX) or with the +880/880 country code, any operator
// prefix (013-019).
export const BD_PHONE_PATTERN = "(\\+?880|0)1[3-9]\\d{8}";
export const BD_PHONE_TITLE =
  "Enter a valid Bangladesh phone number, e.g. 01XXXXXXXXX or +8801XXXXXXXXX.";
export const BD_PHONE_PLACEHOLDER = "01XXXXXXXXX";

export const LIMITS = {
  fullName: 200,
  email: 320,
  phone: 30,
  organization: 200,
  designation: 150,
  iabMembershipNumber: 50,
  universityName: 200,
  position: 150,
  projectName: 250,
  projectLocation: 250,
  projectStatus: 50,
  clientOwner: 250,
  clientName: 200,
  clientAddress: 400,
  clientContactNumber: 30,
  leadEngineer: 200,
  longText: 20000,
  googleDriveUrl: 2048,
} as const;

export const PROJECT_STATUS_COMPLETED = "Completed";
export const PROJECT_STATUS_OPTIONS = [PROJECT_STATUS_COMPLETED, "Under Construction"] as const;

// Categories 1 & 2 eligibility: completed projects must have finished within
// the last 5 years (Visionary Design has no such rule). Keep in sync with
// the backend's finalize check in submission.service.js.
export const COMPLETION_YEAR_RULE_CATEGORIES: readonly string[] = [
  "High Performance Concrete Structure",
  "Advanced Construction Technology & Circularity",
];

export function completionYearRange() {
  const max = new Date().getFullYear();
  return { min: max - 5, max };
}
