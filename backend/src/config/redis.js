import { createClient } from "redis";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

/**
 * Optional shared Redis client, used for:
 *   - distributed rate limiting across multiple Node.js instances
 *   - distributed idempotency-key locks for final submission
 *
 * If REDIS_URL is not configured, `redisClient` stays null and callers
 * fall back to safe in-memory/database-only behavior. In-memory rate
 * limiting is NOT safe once you run more than one instance behind a load
 * balancer — configure Redis before scaling horizontally in production.
 */
export let redisClient = null;

export async function initRedis() {
  if (!env.REDIS_URL) {
    logger.warn(
      "REDIS_URL not set — falling back to in-memory rate limiting. " +
        "This is unsafe across multiple instances; configure Redis in production."
    );
    return null;
  }

  const client = createClient({ url: env.REDIS_URL });
  client.on("error", (err) =>
    logger.error("Redis client error", { error: err.message })
  );

  await client.connect();
  redisClient = client;
  logger.info("Connected to Redis");
  return client;
}

export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
