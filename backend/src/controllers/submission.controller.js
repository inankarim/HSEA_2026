import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/apiResponse.js";
import {
  startSubmission,
  getSubmission,
  updateSubmissionDraft,
  finalizeSubmission,
  listMembers,
  addMember,
  removeMember,
} from "../services/submission.service.js";

// Guests present their draft-access token via this header, obtained once
// at start-submission time. Registered users rely on their session cookie.
const GUEST_TOKEN_HEADER = "x-guest-access-token";

function guestTokenFrom(req) {
  const header = req.headers[GUEST_TOKEN_HEADER];
  return typeof header === "string" ? header : undefined;
}

export const start = asyncHandler(async (req, res) => {
  const result = await startSubmission({
    userId: req.user?.id,
    guestEmail: req.body?.guestEmail,
  });

  return created(
    res,
    {
      applicationId: result.applicationId,
      status: result.status,
      // Only ever present for guest-created drafts; the client must store
      // this securely (e.g. in memory / their own session) — it cannot be
      // recovered later if lost, by design.
      guestAccessToken: result.guestAccessToken || undefined,
    },
    "Submission started.",
  );
});

export const getOne = asyncHandler(async (req, res) => {
  const submission = await getSubmission(req.params.applicationId, {
    userId: req.user?.id,
    guestToken: guestTokenFrom(req),
  });
  return ok(res, { submission });
});

export const updateDraft = asyncHandler(async (req, res) => {
  const submission = await updateSubmissionDraft(
    req.params.applicationId,
    req.body,
    { userId: req.user?.id, guestToken: guestTokenFrom(req) },
  );
  return ok(res, { submission }, "Draft saved.");
});

export const submitFinal = asyncHandler(async (req, res) => {
  const idempotencyKey = req.headers["idempotency-key"];

  const result = await finalizeSubmission(req.params.applicationId, {
    userId: req.user?.id,
    guestToken: guestTokenFrom(req),
    idempotencyKey:
      typeof idempotencyKey === "string" ? idempotencyKey : undefined,
  });

  if (result.replayed) {
    return res.status(result.status).json(
      result.status === 200
        ? {
            success: true,
            data: result.body,
            message: "Submission finalized.",
          }
        : { success: false, message: result.body?.message, errors: [] },
    );
  }

  return ok(
    res,
    { submission: result.body },
    "Submission finalized successfully.",
  );
});

const authFrom = (req) => ({
  userId: req.user?.id,
  guestToken: guestTokenFrom(req),
});

export const getMembers = asyncHandler(async (req, res) => {
  const members = await listMembers(req.params.applicationId, authFrom(req));
  return ok(res, { members });
});

export const addMemberHandler = asyncHandler(async (req, res) => {
  const member = await addMember(
    req.params.applicationId,
    req.body,
    authFrom(req),
  );
  return created(res, { member }, "Team member added.");
});
export const removeMemberHandler = asyncHandler(async (req, res) => {
  await removeMember(
    req.params.applicationId,
    req.params.memberId,
    authFrom(req),
  );
  return ok(res, {}, "Team member removed.");
});
