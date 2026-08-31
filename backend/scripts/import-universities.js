#!/usr/bin/env node
/**
 * Imports approved university email domains from a CSV file into the
 * `universities` table. Existing rows (matched by email_domain) are
 * updated; new rows are inserted. No domains are invented here — this
 * only loads whatever the organizers supply.
 *
 * Usage:
 *   node scripts/import-universities.js path/to/universities.csv
 *
 * CSV format (header row required):
 *   university_name,email_domain,status
 *   BRAC University,bracu.ac.bd,ACTIVE
 */
import fs from "node:fs";
import readline from "node:readline";
import { pool, closePool } from "../src/config/database.js";
import { logger } from "../src/utils/logger.js";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node scripts/import-universities.js <csv-file>");
  process.exit(1);
}

function parseCsvLine(line) {
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

    const universityName = row.university_name;
    const emailDomain = row.email_domain?.toLowerCase();
    const status = (row.status || "ACTIVE").toUpperCase();

    if (!universityName || !emailDomain) {
      skipped += 1;
      continue;
    }

    const result = await pool.query(
      `INSERT INTO universities (university_name, email_domain, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (LOWER(email_domain))
       DO UPDATE SET university_name = EXCLUDED.university_name,
                     status = EXCLUDED.status,
                     updated_at = now()
       RETURNING (xmax = 0) AS inserted`,
      [universityName, emailDomain, status]
    );

    if (result.rows[0].inserted) inserted += 1;
    else updated += 1;
  }

  logger.info("University import complete", { inserted, updated, skipped });
  await closePool();
}

run().catch((err) => {
  logger.error("University import failed", { error: err.message });
  process.exit(1);
});
