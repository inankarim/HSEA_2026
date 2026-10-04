import { env } from "../config/env.js";
import { fail } from "../utils/apiResponse.js";

// No app code ever reads req.headers.host/req.hostname to build a URL,
// redirect, or link — but that alone isn't a control, it just means
// nothing is currently exploitable through it. This middleware is the
// actual control: reject any request whose Host header isn't one of
// env.ALLOWED_HOSTS before anything else runs, so an attacker-supplied
// Host value never reaches routing, logging, or any future code that
// might use it (VAPT: Host header injection).
//
// Exempts /health and /metrics — internal monitoring hits these directly
// on the Node port, bypassing the reverse proxy entirely, so their Host
// header is whatever that tool sends (e.g. "localhost:4000"), not the
// public domain.
const EXEMPT_PATHS = new Set(["/health", "/health/ready", "/metrics"]);

export function hostValidation(req, res, next) {
  if (EXEMPT_PATHS.has(req.path)) return next();

  const hostHeader = req.headers.host;
  if (!hostHeader) {
    return fail(res, "Missing Host header.", 400);
  }

  // Strip a port, if present, before comparing (Host: example.com:443).
  const hostname = hostHeader.split(":")[0].toLowerCase();

  if (!env.ALLOWED_HOSTS.includes(hostname)) {
    return fail(res, "Request rejected: unrecognized Host header.", 400);
  }

  next();
}
