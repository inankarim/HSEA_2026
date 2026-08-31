import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { checkDatabaseConnection, closePool } from "./config/database.js";
import { initRedis, closeRedis } from "./config/redis.js";
// NEW
import { initStorage } from "./storage/index.js";

async function main() {
  // Fail fast if PostgreSQL isn't reachable at boot, rather than accepting
  // traffic and failing every request.
  await checkDatabaseConnection();
  logger.info("Database connection verified");

  await initRedis();

  // NEW — ensure STORAGE_ROOT and its tmp/applicants subdirectories exist
  // and are writable before accepting traffic, same fail-fast philosophy
  // as the database check above.
  await initStorage();
  logger.info("Document storage initialized", { root: env.STORAGE_ROOT });

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`HSEA 2026 backend listening on port ${env.PORT}`, {
      env: env.NODE_ENV,
    });
  });

  // Prevent a single slow/broken client connection from tying up sockets
  // indefinitely under load.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;

  // --- graceful shutdown -------------------------------------------------
  let shuttingDown = false;

  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Received ${signal}, starting graceful shutdown`);

    // 1. Stop accepting new connections.
    server.close(async (err) => {
      if (err) {
        logger.error("Error while closing HTTP server", { error: err.message });
      } else {
        logger.info("HTTP server closed — no longer accepting new requests");
      }

      // 2. Close shared resources once in-flight requests have drained.
      try {
        await closePool();
        logger.info("PostgreSQL pool closed");
      } catch (e) {
        logger.error("Error closing PostgreSQL pool", { error: e.message });
      }

      try {
        await closeRedis();
        logger.info("Redis connection closed");
      } catch (e) {
        logger.error("Error closing Redis connection", { error: e.message });
      }

      // 3. Exit cleanly.
      process.exit(0);
    });

    // Safety net: force-exit if shutdown hangs (e.g. a stuck connection).
    setTimeout(() => {
      logger.error("Graceful shutdown timed out — forcing exit");
      process.exit(1);
    }, 20_000).unref();
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection", { reason: String(reason) });
  });
  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception — shutting down", { error: err.message });
    shutdown("uncaughtException");
  });
}

main().catch((err) => {
  logger.error("Fatal startup error", { error: err.message });
  process.exit(1);
});
