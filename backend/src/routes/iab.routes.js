import { Router } from "express";
import { iabVerifyLimiter } from "../middleware/rateLimit.middleware.js";
import { verifyMembership } from "../controllers/iab.controller.js";

const router = Router();

router.get("/verify/:membershipNumber", iabVerifyLimiter, verifyMembership);

export default router;
