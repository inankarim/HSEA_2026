#!/usr/bin/env node
/**
 * Imports IAB membership records from a CSV file into the `iab_members`
 * table. Existing rows (matched by iab_membership_number) are updated;
 * new rows are inserted. No fake data is generated — this only loads
 * whatever the organizers supply.
 *
 * Usage:
 *   node scripts/import-iab-members.js path/to/members.csv
 *
 * CSV format (header row required):
 *   iab_membership_number,member_name,status
 *   123456,Example Name,ACTIVE
 */
import fs from "node:fs";
import readline from "node:readline";
import { pool, closePool } from "../src/config/database.js";
import { logger } from "../src/utils/logger.js";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node scripts/import-iab-members.js <csv-file>");
  process.exit(1);
}

function parseCsvLine(line) {
  // Simple CSV split — sufficient for this controlled, comma-only format.
  // Swap in a proper CSV parser if the source data ever contains quoted
  // fields with embedded commas.
  return line.split(",").map((v) => v.trim());
}

async function run() {
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  });

  let header = null;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;

    if (!header) {
      header = parseCsvLine(line).map((h) => h.toLowerCase());
      continue;
    }

    const cols = parseCsvLine(line);
    const row = Object.fromEntries(header.map((h, i) => [h, cols[i]]));

    const membershipNumber = row.iab_membership_number;
    const memberName = row.member_name;
    const status = (row.status || "ACTIVE").toUpperCase();

    if (!membershipNumber || !memberName) {
      skipped += 1;
      continue;
    }

    const result = await pool.query(
      `INSERT INTO iab_members (iab_membership_number, member_name, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (iab_membership_number)
       DO UPDATE SET member_name = EXCLUDED.member_name,
                     status = EXCLUDED.status,
                     updated_at = now()
       RETURNING (xmax = 0) AS inserted`,
      [membershipNumber, memberName, status]
    );

    if (result.rows[0].inserted) inserted += 1;
    else updated += 1;
  }

  logger.info("IAB member import complete", { inserted, updated, skipped });
  await closePool();
}

run().catch((err) => {
  logger.error("IAB member import failed", { error: err.message });
  process.exit(1);
});
