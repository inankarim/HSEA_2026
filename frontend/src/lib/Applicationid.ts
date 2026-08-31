// Mirrors utils/applicationId.js's isValidApplicationIdFormat exactly.
// This is a cosmetic, client-side pre-check only (catches obvious typos
// before a network round-trip) — the backend's own validator is always
// the final word on whether an Application ID is real.
const APPLICATION_ID_PATTERN = /^HSEA26-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/;

export function isValidApplicationIdFormat(id: string): boolean {
  return typeof id === "string" && APPLICATION_ID_PATTERN.test(id);
}
