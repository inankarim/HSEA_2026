import pg from "pg";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

const { Pool } = pg;

/**
 * Single shared PostgreSQL connection pool per Node.js process.
 *
 * This is created once at module load and reused for every request handled
 * by this instance — we never open a new client connection per request.
 * When running multiple Node.js instances behind a load balancer, each
 * instance gets its own pool, and all instances share the same PostgreSQL
 * database as the single source of truth.
 */
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : false,
  max: env.DATABASE_POOL_MAX,
  idleTimeoutMillis: env.DATABASE_POOL_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: env.DATABASE_POOL_CONNECTION_TIMEOUT_MS,
});

pool.on("error", (err) => {
  // A backend-idle client emitted an error — log it, but do not crash the
  // whole process; the pool will create a fresh client on next checkout.
  logger.error("Unexpected PostgreSQL pool error", { error: err.message });
});

/**
 * Runs `fn` inside a single checked-out client with an open transaction.
 * Commits on success, rolls back on any thrown error, and always releases
 * the client back to the pool.
 */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function checkDatabaseConnection() {
  const result = await pool.query("SELECT 1 AS ok");
  return result.rows[0]?.ok === 1;
}

export async function closePool() {
  await pool.end();
}
