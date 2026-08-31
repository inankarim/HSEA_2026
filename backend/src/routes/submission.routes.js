import { Router } from "express";
import { validate } from "../middleware/validation.middleware.js";
import { optionalAuth } from "../middleware/auth.middleware.js";
import {
  startSubmissionLimiter,
  draftSaveLimiter,
  finalSubmitLimiter,
} from "../middleware/rateLimit.middleware.js";
import {
  applicationIdParamSchema,
  submissionDraftSchema,
  guestStartSubmissionSchema,
  memberSchema,
  memberIdParamSchema,
} from "../validators/submission.validators.js";
import {
  start,
  getOne,
  updateDraft,
  submitFinal,
  getMembers,
  addMemberHandler,
  removeMemberHandler,
} from "../controllers/submission.controller.js";
// Application-wide document upload sub-router.
import documentRoutes from "./document.routes.js";
// NEW — per-team-member document upload sub-router (NID + Photo per member).
import memberDocumentRoutes from "./memberDocument.routes.js";

const router = Router();

// optionalAuth: a logged-in applicant gets user_id attached automatically;
// a guest proceeds without an account.
router.post(
  "/start",
  optionalAuth,
  startSubmissionLimiter,
  validate(guestStartSubmissionSchema),
  start,
);

router.get(
  "/:applicationId",
  optionalAuth,
  validate(applicationIdParamSchema, "params"),
  getOne,
);

router.put(
  "/:applicationId",
  optionalAuth,
  draftSaveLimiter,
  validate(applicationIdParamSchema, "params"),
  validate(submissionDraftSchema),
  updateDraft,
);

router.post(
  "/:applicationId/submit",
  optionalAuth,
  finalSubmitLimiter,
  validate(applicationIdParamSchema, "params"),
  submitFinal,
);

router.get(
  "/:applicationId/members",
  optionalAuth,
  validate(applicationIdParamSchema, "params"),
  getMembers,
);

router.post(
  "/:applicationId/members",
  optionalAuth,
  draftSaveLimiter,
  validate(applicationIdParamSchema, "params"),
  validate(memberSchema),
  addMemberHandler,
);

router.delete(
  "/:applicationId/members/:memberId",
  optionalAuth,
  draftSaveLimiter,
  validate(memberIdParamSchema, "params"),
  removeMemberHandler,
);

// /api/submissions/:applicationId/documents/...
// mergeParams in document.routes.js makes :applicationId visible there.
router.use("/:applicationId/documents", documentRoutes);

// NEW — /api/submissions/:applicationId/members/:memberId/documents/...
// Per-team-member NID + Photo uploads. mergeParams in
// memberDocument.routes.js makes :applicationId and :memberId visible
// there. Mounted after the plain "/:applicationId/members" routes above
// so DELETE "/:applicationId/members/:memberId" (remove a member) keeps
// matching first for that exact path.
router.use("/:applicationId/members/:memberId/documents", memberDocumentRoutes);

export default router;
