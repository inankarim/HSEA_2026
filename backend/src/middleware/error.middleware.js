import { logger } from "../utils/logger.js";
import { fail } from "../utils/apiResponse.js";
import { env } from "../config/env.js";

/**
 * Application-level error carrying an HTTP status and optional field
 * errors. Services/controllers should throw this instead of generic
 * Errors whenever the failure maps to a specific client-facing response.
 */
export class ApiError extends Error {
  constructor(message, status = 400, errors = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

export function notFoundHandler(req, res) {
  return fail(res, "Resource not found", 404);
}

/**
 * Centralized error handler. Never leaks PostgreSQL errors, stack traces,
 * filesystem paths, or environment variables to the client — those are
 * logged server-side only, keyed by requestId for correlation.
 */
export function errorHandler(err, req, res, _next) {
  const requestId = req.requestId;

  if (err instanceof ApiError) {
    logger.warn("Handled API error", {
      requestId,
      status: err.status,
      message: err.message,
    });
    return fail(res, err.message, err.status, err.errors);
  }

  // Postgres unique_violation -> surface as a clean 409 rather than a raw DB error
  if (err.code === "23505") {
    logger.warn("Unique constraint violation", { requestId, detail: err.detail });
    return fail(res, "A record with these details already exists.", 409);
  }

  if (err.type === "entity.too.large") {
    return fail(res, "Request payload too large.", 413);
  }

  logger.error("Unhandled server error", {
    requestId,
    message: err.message,
    stack: env.isProduction ? undefined : err.stack,
  });

  return fail(res, "An unexpected error occurred. Please try again.", 500);
}
