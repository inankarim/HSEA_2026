// Client-side validation limits mirroring the backend's actual contract
// (backend/src/validators/auth.validators.js, submission.validators.js).
// These are UX only — the backend re-validates everything regardless, but
// matching limits here means users get instant feedback instead of only
// finding out after a round-trip.

// Letters (any language) plus spaces, apostrophes, hyphens, periods —
// same pattern the backend rejects HTML/script-like input with.
export const NAME_PATTERN = "^[\\p{L}\\p{M}][\\p{L}\\p{M}\\s'.-]*$";
export const NAME_TITLE = "Letters, spaces, apostrophes, hyphens, and periods only.";

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

export const COMPLETION_YEAR_MIN = 1900;
export const COMPLETION_YEAR_MAX = 2100;
