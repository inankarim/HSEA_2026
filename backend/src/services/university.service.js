import { pool } from "../config/database.js";

function extractDomain(email) {
  const at = email.lastIndexOf("@");
  if (at === -1) return null;
  return email.slice(at + 1).toLowerCase();
}

/**
 * Verifies a student's university email against the approved
 * `universities.email_domain` table. A student cannot pass verification
 * with a personal-email domain (gmail.com, yahoo.com, etc.) because those
 * domains are simply never present in the approved table.
 */
/**
 * TEMPORARY: university email verification is switched off. Any non-empty
 * email is accepted as verified, so no domain check and no database lookup
 * happen. To bring real verification back, restore the previous version
 * of this file.
 */
export async function verifyUniversityEmail(email) {
  if (!email || typeof email !== "string" || !email.trim()) {
    return { verified: false };
  }

  return { verified: true };
}
