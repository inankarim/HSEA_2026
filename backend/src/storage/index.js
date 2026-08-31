import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { LocalFileStorage } from "./LocalFileStorage.js";

/**
 * Single shared LocalFileStorage instance per process, same pattern as
 * config/database.js's shared `pool`. Configured entirely from env so
 * production can point STORAGE_ROOT at e.g. /data/hsea-uploads without
 * any code change.
 */
export const storage = new LocalFileStorage({
  root: env.STORAGE_ROOT,
  tempDir: env.STORAGE_TEMP_DIR,
  applicantsDirName: "applicants",
});

/**
 * Called once at boot (see server.js). Fails fast if the storage mount
 * isn't writable, and sweeps any temp files orphaned by a previous crash
 * before accepting traffic.
 */
export async function initStorage() {
  await storage.ensureReady();
  const removed = await storage.cleanupStaleTempFiles();
  if (removed > 0) {
    logger.warn("Removed stale temp upload files left from a previous run", {
      count: removed,
    });
  }
  return storage;
}
