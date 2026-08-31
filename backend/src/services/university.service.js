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
export async function verifyUniversityEmail(email) {
  if (!email || typeof email !== "string") {
    return { verified: false };
  }

  const domain = extractDomain(email.trim().toLowerCase());
  if (!domain) {
    return { verified: false };
  }

  const result = await pool.query(
    `SELECT university_name, email_domain, status
       FROM universities
      WHERE LOWER(email_domain) = $1`,
    [domain]
  );

  const row = result.rows[0];
  if (!row || row.status !== "ACTIVE") {
    return { verified: false };
  }

  return {
    verified: true,
    university: {
      name: row.university_name,
      domain: row.email_domain,
    },
  };
}
