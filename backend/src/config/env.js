import "dotenv/config";
import path from "node:path";

/**
 * Centralized, validated environment configuration.
 * Fails fast at boot if anything required is missing, rather than
 * surfacing confusing errors later under load.
 */

function required(name, fallback = undefined) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name, fallback = undefined) {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

function bool(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
}

function int(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be an integer`);
  }
  return parsed;
}

const NODE_ENV = optional("NODE_ENV", "development");
const isProduction = NODE_ENV === "production";

// Default keeps local dev working with zero config, but production
// deployments MUST set STORAGE_ROOT explicitly to a path OUTSIDE the web
// root and outside the app's own working directory (e.g. /data/hsea-uploads)
// — see HANDOFF notes in storage/LocalFileStorage.js.
const DEFAULT_STORAGE_ROOT = path.resolve(
  process.cwd(),
  "storage",
  "documents",
);

export const env = {
  NODE_ENV,
  isProduction,
  PORT: int("PORT", 4000),

  DATABASE_URL: required("DATABASE_URL"),
  DATABASE_SSL: bool("DATABASE_SSL", false),
  DATABASE_POOL_MAX: int("DATABASE_POOL_MAX", 20),
  DATABASE_POOL_IDLE_TIMEOUT_MS: int("DATABASE_POOL_IDLE_TIMEOUT_MS", 30000),
  DATABASE_POOL_CONNECTION_TIMEOUT_MS: int(
    "DATABASE_POOL_CONNECTION_TIMEOUT_MS",
    5000,
  ),

  JWT_SECRET: required("JWT_SECRET"),
  JWT_ACCESS_TOKEN_TTL: optional("JWT_ACCESS_TOKEN_TTL", "15m"),
  JWT_REFRESH_TOKEN_TTL: optional("JWT_REFRESH_TOKEN_TTL", "30d"),
  COOKIE_SECRET: required("COOKIE_SECRET"),

  CORS_ORIGIN: optional("CORS_ORIGIN", "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),

  REDIS_URL: optional("REDIS_URL", null),

  LOG_LEVEL: optional("LOG_LEVEL", isProduction ? "info" : "debug"),

  // --- NEW: applicant document storage (on-premise filesystem only) ---
  // STORAGE_ROOT must live outside any express.static / public web root.
  // In production, point this at a dedicated, backed-up volume, e.g.
  // STORAGE_ROOT=/data/hsea-uploads
  STORAGE_ROOT: optional("STORAGE_ROOT", DEFAULT_STORAGE_ROOT),
  // Should be on the SAME filesystem/mount as STORAGE_ROOT (ideally
  // literally "<STORAGE_ROOT>/tmp") so committing an upload is an atomic
  // rename() rather than a copy+unlink fallback. See LocalFileStorage.js.
  STORAGE_TEMP_DIR: optional(
    "STORAGE_TEMP_DIR",

    path.join(optional("STORAGE_ROOT", DEFAULT_STORAGE_ROOT), "tmp"),
  ),

  PICTURE_UPLOAD_DIR: optional(
    "PICTURE_UPLOAD_DIR",
    path.resolve(process.cwd(), "uploads", "images"),
  ),
  PICTURE_PUBLIC_PREFIX: optional("PICTURE_PUBLIC_PREFIX", "/uploads/images"),
};

if (isProduction && env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters in production");
}
