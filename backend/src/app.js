import path from "node:path";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";

import { env } from "./config/env.js";
import { requestId } from "./middleware/requestId.middleware.js";
import { globalApiLimiter } from "./middleware/rateLimit.middleware.js";
import {
  errorHandler,
  notFoundHandler,
} from "./middleware/error.middleware.js";
import apiRoutes from "./routes/index.js";
import healthRoutes from "./routes/health.routes.js";
import { logger } from "./utils/logger.js";
// NEW
import { metrics } from "./utils/metrics.js";

export function createApp() {
  const app = express();

  // Trust the first proxy hop (load balancer / reverse proxy) so
  // req.ip and rate limiting see the real client IP, not the LB's.
  app.set("trust proxy", 1);

  app.use(requestId);
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: "256kb" }));
  app.use(express.urlencoded({ extended: true, limit: "256kb" }));
  app.use(cookieParser(env.COOKIE_SECRET));

  // Basic request timeout guard: final-submission and draft-save requests
  // are lightweight (no file I/O), so anything hanging this long is
  // treated as failed rather than tying up a worker indefinitely.
  // NOTE: document upload/download routes set their own longer timeout
  // (see routes/document.routes.js callers / reverse-proxy config in
  // HANDOFF.md) since a slow applicant connection uploading a 2MB file
  // legitimately needs more than 15s.
  app.use((req, res, next) => {
    if (req.path.includes("/documents")) return next();
    res.setTimeout(15_000, () => {
      logger.warn("Request timed out", {
        requestId: req.requestId,
        path: req.path,
      });
      if (!res.headersSent) {
        res.status(503).json({
          success: false,
          message: "The request took too long to process. Please try again.",
          errors: [],
        });
      }
    });
    next();
  });

  // Health checks are unauthenticated, unrated, and outside /api so load
  // balancers can hit them without any extra config.
  app.use("/health", healthRoutes);

  // NEW — Prometheus-format metrics. Unauthenticated by design (matches
  // /health) but contains no PII/secrets, only counters/histograms — still,
  // restrict it at the reverse-proxy/firewall layer to internal networks
  // only in production (see HANDOFF.md "Monitoring").
  app.get("/metrics", (req, res) => {
    res.setHeader("Content-Type", "text/plain; version=0.0.4");
    res.send(metrics.renderPrometheus());
  });

  // Serves already-sanitized, re-encoded uploads (profile photos, and any
  // future "picture" purpose under services/pictureUpload.service.js).
  // Safe to expose publicly/unauthenticated: filenames are random UUIDs,
  // nothing here is ever a raw, unprocessed client upload, and helmet's
  // default headers (no-sniff, etc.) still apply. If photos should ever
  // be private, swap this for an authenticated streaming route instead.
  //
  // helmet() sets Cross-Origin-Resource-Policy: same-origin by default,
  // which silently blocks <img> loads from a different origin (e.g. the
  // Vite dev server on :5173 loading an image served from the API on
  // :4000). Explicitly relax it to cross-origin for just this route —
  // everything else in the app keeps the stricter default.
  //
  // NOTE: applicant documents (NID, drawings, etc.) are DELIBERATELY NOT
  // served this way — there is no express.static for
  // submission_documents. They only ever go through the authenticated,
  // authorization-checked streaming route in controllers/document.controller.js.
  app.use(
    "/uploads/images",
    helmet.crossOriginResourcePolicy({ policy: "cross-origin" }),
    express.static(path.resolve(process.cwd(), "uploads", "images"), {
      maxAge: "7d",
      immutable: true,
      fallthrough: false,
      dotfiles: "deny",
      index: false,
    }),
  );

  app.use("/api", globalApiLimiter, apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
