import winston from "winston";
import { env } from "../config/env.js";

/**
 * Structured JSON logging. Never log secrets, passwords, tokens, or raw
 * PostgreSQL connection strings — callers are responsible for redacting
 * sensitive fields before passing them to the logger.
 */
export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    env.isProduction ? winston.format.json() : winston.format.simple()
  ),
  defaultMeta: { service: "hsea2026-backend" },
  transports: [new winston.transports.Console()],
});

export function redact(obj, keys = ["password", "password_hash", "token", "secret"]) {
  if (!obj || typeof obj !== "object") return obj;
  const clone = { ...obj };
  for (const k of keys) {
    if (k in clone) clone[k] = "[REDACTED]";
  }
  return clone;
}
