import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";
import { verifyIabMembership } from "../services/iab.service.js";
import { ApiError } from "../middleware/error.middleware.js";

export const verifyMembership = asyncHandler(async (req, res) => {
  const { membershipNumber } = req.params;
  if (!membershipNumber || membershipNumber.length > 50) {
    throw new ApiError("Invalid membership number.", 422);
  }

  const result = await verifyIabMembership(membershipNumber);
  return ok(res, result);
});
