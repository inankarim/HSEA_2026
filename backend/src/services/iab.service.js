import { pool } from "../config/database.js";

/**
 * Looks up an IAB membership number against PostgreSQL. This is the only
 * source of truth for IAB verification — the frontend can never mark a
 * number as verified on its own.
 */
export async function verifyIabMembership(membershipNumber) {
  if (!membershipNumber || typeof membershipNumber !== "string") {
    return { verified: false, membershipNumber: membershipNumber ?? null };
  }

  const result = await pool.query(
    `SELECT iab_membership_number, member_name, status
       FROM iab_members
      WHERE iab_membership_number = $1`,
    [membershipNumber.trim()],
  );

  const row = result.rows[0];
  if (!row || row.status !== "ACTIVE") {
    return { verified: false, membershipNumber };
  }

  return {
    verified: true,
    membershipNumber: row.iab_membership_number,
  };
}
