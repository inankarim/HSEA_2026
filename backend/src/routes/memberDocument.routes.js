import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validation.middleware.js";
import { optionalAuth } from "../middleware/auth.middleware.js";
import {
  documentUploadLimiter,
  documentDownloadLimiter,
} from "../middleware/rateLimit.middleware.js";
import { isValidApplicationIdFormat } from "../utils/applicationId.js";
import { isValidMemberDocumentType } from "../config/documentTypes.js";
import {
  listMember,
  uploadMember,
  removeMember,
  downloadMember,
} from "../controllers/document.controller.js";

// mergeParams: true — mounted at "/:applicationId/members/:memberId/documents"
// by submission.routes.js, so both :applicationId and :memberId from the
// parent path are visible here.
const router = Router({ mergeParams: true });

const paramsSchema = z
  .object({
    applicationId: z
      .string()
      .refine(isValidApplicationIdFormat, "Invalid Application ID format."),
    memberId: z.string().uuid("Invalid team member ID."),
  })
  .passthrough(); // documentType (when present) is validated separately below

const documentTypeParamSchema = z
  .object({
    documentType: z
      .string()
      .refine(isValidMemberDocumentType, "Invalid document type."),
  })
  .passthrough();

router.get(
  "/",
  optionalAuth,
  validate(paramsSchema, "params"),
  listMember,
);

router.post(
  "/:documentType",
  optionalAuth,
  documentUploadLimiter,
  validate(paramsSchema, "params"),
  validate(documentTypeParamSchema, "params"),
  uploadMember,
);

router.delete(
  "/:documentType",
  optionalAuth,
  validate(paramsSchema, "params"),
  validate(documentTypeParamSchema, "params"),
  removeMember,
);

router.get(
  "/:documentType/download",
  optionalAuth,
  documentDownloadLimiter,
  validate(paramsSchema, "params"),
  validate(documentTypeParamSchema, "params"),
  downloadMember,
);

export default router;
