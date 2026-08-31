import { randomUUID } from "node:crypto";

/**
 * Attaches a correlation/request ID to every request so a single
 * submission attempt can be traced across logs even when it's handled by
 * different Node.js instances behind the load balancer.
 */
export function requestId(req, res, next) {
  const incoming = req.headers["x-request-id"];
  req.requestId = typeof incoming === "string" && incoming.length <= 100
    ? incoming
    : randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
}
