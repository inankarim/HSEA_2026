import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validation.middleware.js";
import { optionalAuth } from "../middleware/auth.middleware.js";
import {
  documentUploadLimiter,
  documentDownloadLimiter,
} from "../middleware/rateLimit.middleware.js";
import { isValidApplicationIdFormat } from "../utils/applicationId.js";
import { isValidDocumentType } from "../config/documentTypes.js";
import {
  list,
  upload,
  remove,
  download,
} from "../controllers/document.controller.js";

// mergeParams: true — this router is mounted at
// "/:applicationId/documents" by submission.routes.js, so :applicationId
// from the parent path is visible here even though this router didn't
// declare that segment itself.
const router = Router({ mergeParams: true });

// The parent submission router does not validate :applicationId for this
// branch (it's mounted with router.use, not through the other routes'
// validate() chain), so this router validates it itself — every route
// below needs it, so it's simplest as its own schema/validate() call
// rather than duplicated per-route.
const applicationIdOnlySchema = z
  .object({
    applicationId: z
      .string()
      .refine(isValidApplicationIdFormat, "Invalid Application ID format."),
  })
  .passthrough(); // documentType (when present) is validated separately below

const documentTypeParamSchema = z
  .object({
    documentType: z
      .string()
      .refine(isValidDocumentType, "Invalid document type."),
  })
  .passthrough();

router.get(
  "/",
  optionalAuth,
  validate(applicationIdOnlySchema, "params"),
  list,
);

router.post(
  "/:documentType",
  optionalAuth,
  documentUploadLimiter,
  validate(applicationIdOnlySchema, "params"),
  validate(documentTypeParamSchema, "params"),
  upload,
);

router.delete(
  "/:documentType",
  optionalAuth,
  validate(applicationIdOnlySchema, "params"),
  validate(documentTypeParamSchema, "params"),
  remove,
);

router.get(
  "/:documentType/download",
  optionalAuth,
  documentDownloadLimiter,
  validate(applicationIdOnlySchema, "params"),
  validate(documentTypeParamSchema, "params"),
  download,
);

export default router;
