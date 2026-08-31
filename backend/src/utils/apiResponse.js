/**
 * Consistent API response envelope used across every endpoint.
 */

export function ok(res, data = {}, message = "OK", status = 200) {
  return res.status(status).json({ success: true, data, message });
}

export function created(res, data = {}, message = "Created") {
  return ok(res, data, message, 201);
}

export function fail(res, message = "Request failed", status = 400, errors = []) {
  return res.status(status).json({ success: false, message, errors });
}
