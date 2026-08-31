import { ZodError } from "zod";
import { fail } from "../utils/apiResponse.js";

/**
 * Validates req.body (or req.query, when `source` is "query") against a
 * Zod schema. On success, replaces the source with the parsed/typed value
 * (so downstream code only ever sees clean, coerced data). On failure,
 * returns 422 with per-field error details — never trusts the client.
 *
 * Zod schemas below use `.strict()` where appropriate to reject unexpected
 * fields rather than silently ignoring them.
 */
export function validate(schema, source = "body") {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }));
        return fail(res, "Validation failed.", 422, errors);
      }
      next(err);
    }
  };
}
