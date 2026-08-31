import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";
import { verifyUniversityEmail } from "../services/university.service.js";
import { ApiError } from "../middleware/error.middleware.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const verifyEmailDomain = asyncHandler(async (req, res) => {
  const { email } = req.query;
  if (!email || typeof email !== "string" || !EMAIL_PATTERN.test(email)) {
    throw new ApiError("A valid email query parameter is required.", 422);
  }

  const result = await verifyUniversityEmail(email);
  return ok(res, result);
});
