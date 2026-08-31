import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool, closePool } from "../config/database.js";
import { logger } from "../utils/logger.js";

/**
 * Minimal, dependency-free migration runner.
 *
 * Applies every .sql file in ./migrations, in filename order, exactly
 * once, tracked via a `schema_migrations` table. Safe to run repeatedly
 * (e.g. as part of a deploy step) — already-applied files are skipped.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "migrations");

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename    VARCHAR(255) PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function getAppliedMigrations() {
  const result = await pool.query("SELECT filename FROM schema_migrations");
  return new Set(result.rows.map((r) => r.filename));
}

async function runMigrations() {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      logger.info(`Skipping already-applied migration: ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (filename) VALUES ($1)",
        [file]
      );
      await client.query("COMMIT");
      logger.info(`Applied migration: ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      logger.error(`Migration failed: ${file}`, { error: err.message });
      throw err;
    } finally {
      client.release();
    }
  }
}

runMigrations()
  .then(() => {
    logger.info("All migrations applied successfully");
    return closePool();
  })
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error("Migration run failed", { error: err.message });
    process.exit(1);
  });
