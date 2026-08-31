import { Router } from "express";
import { universityVerifyLimiter } from "../middleware/rateLimit.middleware.js";
import { verifyEmailDomain } from "../controllers/university.controller.js";

const router = Router();

router.get("/verify-email-domain", universityVerifyLimiter, verifyEmailDomain);

export default router;
