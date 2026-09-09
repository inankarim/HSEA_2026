import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { pool, closePool } from "../src/config/database.js";

const BCRYPT_ROUNDS = 12;

// --- EDIT THIS LIST before running -----------------------------------
// Add only the admins you haven't created yet — existing emails are
// skipped automatically, so it's safe to re-run this file later with a
// longer list if you need an 11th admin down the line (just bump past 10
// deliberately, don't silently exceed the intended cap).
const ADMINS_TO_CREATE = [
  { email: "admin1@hsea2026.org", fullName: "Admin One" },
  { email: "admin2@hsea2026.org", fullName: "Admin Two" },
  { email: "admin3@hsea2026.org", fullName: "Admin Three" },
  // ...
];
// -----------------------------------------------------------------------

function generatePassword() {
  // 16 random bytes -> base64url (~22 chars), safe to paste, hard to guess.
  return crypto.randomBytes(16).toString("base64url");
}

async function main() {
  if (ADMINS_TO_CREATE.length > 10) {
    throw new Error(
      "Refusing to create more than 10 admin accounts in one run — " +
        "this cap was a deliberate design decision. Edit the script if you " +
        "genuinely need to raise it.",
    );
  }

  const created = [];
  const skipped = [];

  for (const admin of ADMINS_TO_CREATE) {
    const email = admin.email.toLowerCase();

    const existing = await pool.query(
      "SELECT id FROM admin_users WHERE LOWER(email) = $1",
      [email],
    );
    if (existing.rowCount > 0) {
      skipped.push(email);
      continue;
    }

    const plainPassword = generatePassword();
    const passwordHash = await bcrypt.hash(plainPassword, BCRYPT_ROUNDS);

    await pool.query(
      `INSERT INTO admin_users (email, password_hash, full_name)
       VALUES ($1, $2, $3)`,
      [email, passwordHash, admin.fullName],
    );

    created.push({ email, password: plainPassword, fullName: admin.fullName });
  }

  console.log("\n=== Admin account creation complete ===\n");

  if (created.length > 0) {
    console.log(
      "Created (share each password individually, then clear this terminal):\n",
    );
    for (const c of created) {
      console.log(`  ${c.fullName} — ${c.email}  →  ${c.password}`);
    }
  } else {
    console.log("No new accounts created.");
  }

  if (skipped.length > 0) {
    console.log(`\nSkipped (already exist): ${skipped.join(", ")}`);
  }

  const totalResult = await pool.query(
    "SELECT COUNT(*)::int AS count FROM admin_users",
  );
  console.log(
    `\nTotal admin accounts in database: ${totalResult.rows[0].count}`,
  );
  console.log(
    "\nPasswords are not recoverable — only resettable. Distribute them now.\n",
  );

  await closePool();
}

main().catch((err) => {
  console.error("Failed to create admin users:", err);
  process.exit(1);
});
