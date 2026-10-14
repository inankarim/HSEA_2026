/**
 * URL-format-only validation for applicant-supplied Google Drive links.
 *
 * IMPORTANT: this module intentionally does NOT call the Google Drive API,
 * does not authenticate with Google, and does not inspect folder contents.
 * Per the product requirements, the backend only stores and
 * format-validates the URL the applicant pastes in.
 */

// "/u/<n>/" appears when the link is copied from the address bar while
// signed in to more than one Google account — still a valid folder link.
const DRIVE_URL_PATTERN =
  /^https:\/\/drive\.google\.com\/drive\/(u\/\d+\/)?folders\/[a-zA-Z0-9_-]+(\?.*)?$/;

// Some applicants paste a "shared link" style URL instead of the folder
// URL — accept the common variant too rather than rejecting valid links.
const DRIVE_OPEN_URL_PATTERN =
  /^https:\/\/drive\.google\.com\/open\?id=[a-zA-Z0-9_-]+$/;

export function isValidGoogleDriveFolderUrl(url) {
  if (!url || typeof url !== "string") return false;
  if (url.length > 2048) return false;
  return DRIVE_URL_PATTERN.test(url) || DRIVE_OPEN_URL_PATTERN.test(url);
}
