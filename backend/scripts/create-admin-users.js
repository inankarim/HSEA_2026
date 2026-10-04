import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { pool, closePool } from "../src/config/database.js";
import { strongPasswordSchema } from "../src/validators/auth.validators.js";

const BCRYPT_ROUNDS = 12;

// --- Mode 1: single account via environment variables, no code edit ---
// For a one-off new admin, just run:
//   ADMIN_EMAIL='someone@hsea2026.org' ADMIN_PASSWORD='their-password' node scripts/create-admin-users.js
// ADMIN_FULL_NAME is optional and defaults to "admin" if omitted.
// ADMIN_PASSWORD is optional too — omit it to auto-generate a random one.
//
// --- Mode 2: batch list below, for creating several at once -----------
// Only used when ADMIN_EMAIL isn't set. Add only the admins you haven't
// created yet — existing emails are skipped automatically. Never
// hardcode a real password as a literal string here (this file gets
// committed) — reference an environment variable instead, same as
// ADMIN_PASSWORD above but with your own variable name per entry.
const ADMINS_TO_CREATE = process.env.ADMIN_EMAIL
  ? [
      {
        email: process.env.ADMIN_EMAIL,
        fullName: process.env.ADMIN_FULL_NAME || "admin",
        password: process.env.ADMIN_PASSWORD,
      },
    ]
  : [
      { email: "admin1@hsea2026.org", fullName: "Admin One" },
      { email: "admin2@hsea2026.org", fullName: "Admin Two" },
      { email: "admin3@hsea2026.org", fullName: "Admin Three" },
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

    let plainPassword = admin.password;
    if (plainPassword) {
      const check = strongPasswordSchema.safeParse(plainPassword);
      if (!check.success) {
        throw new Error(
          `Password for ${email} does not meet the required policy: ` +
            check.error.issues.map((i) => i.message).join("; "),
        );
      }
    } else {
      plainPassword = generatePassword();
    }
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
