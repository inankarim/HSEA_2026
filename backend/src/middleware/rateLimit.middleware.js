import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redisClient } from "../config/redis.js";
import { fail } from "../utils/apiResponse.js";

/**
 * Endpoint-specific rate limiting.
 *
 * When Redis is configured, limits are enforced against a shared store so
 * they hold correctly across every Node.js instance behind the load
 * balancer. Without Redis, express-rate-limit falls back to per-process
 * memory — fine for local development, NOT safe for a multi-instance
 * production deployment (each instance would allow its own separate
 * quota). Configure REDIS_URL before scaling horizontally.
 *
 * Limits are deliberately endpoint-specific and generous enough that
 * thousands of legitimate applicants near the deadline are not blocked;
 * only abusive/automated request patterns should ever hit these.
 */

function buildLimiter({ windowMs, max, message }) {
  const options = {
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => fail(res, message, 429),
    keyGenerator: (req) => {
      // Prefer authenticated user id when available so shared office/campus
      // IPs near the deadline don't collectively exhaust one bucket.
      return req.user?.id || req.ip;
    },
  };

  if (redisClient) {
    options.store = new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
      prefix: "rl:",
    });
  }

  return rateLimit(options);
}

export const loginLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many login attempts. Please try again in a few minutes.",
});

export const registerLimiter = buildLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message:
    "Too many registration attempts from this connection. Please try again later.",
});

export const iabVerifyLimiter = buildLimiter({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: "Too many verification attempts. Please try again shortly.",
});

export const universityVerifyLimiter = buildLimiter({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: "Too many verification attempts. Please try again shortly.",
});

export const startSubmissionLimiter = buildLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: "Too many submissions started. Please try again later.",
});

export const draftSaveLimiter = buildLimiter({
  windowMs: 5 * 60 * 1000,
  max: 60,
  message: "You're saving too frequently. Please slow down slightly.",
});

export const finalSubmitLimiter = buildLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message:
    "Too many submission attempts. Please wait a few minutes and try again.",
});

// --- file uploads ----------------------------------------------------------
// Deliberately tighter than most limiters above: uploads cost real disk I/O
// and (for pictures) CPU to decode/re-encode, so the bar for "abusive" is
// lower than for a cheap JSON PUT.

export const pdfUploadLimiter = buildLimiter({
  windowMs: 60 * 60 * 1000,
  max: 15,
  message: "Too many document uploads. Please try again later.",
});

export const profilePhotoUploadLimiter = buildLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Too many profile photo uploads. Please try again later.",
});

// NEW — applicant document uploads (NID, drawings, photos, etc). An
// applicant may reasonably re-upload/replace several of these while
// assembling their submission, so this is a bit more generous than
// pdfUploadLimiter/profilePhotoUploadLimiter above, but still well below
// what only automation would need.
export const documentUploadLimiter = buildLimiter({
  windowMs: 60 * 60 * 1000,
  max: 60,
  message: "Too many document uploads. Please try again later.",
});

// NEW — downloads are cheap for us but still worth bounding per key so a
// misbehaving client can't hammer disk I/O.
export const documentDownloadLimiter = buildLimiter({
  windowMs: 10 * 60 * 1000,
  max: 120,
  message: "Too many document requests. Please try again shortly.",
});

export const globalApiLimiter = buildLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: "Too many requests. Please slow down.",
});
