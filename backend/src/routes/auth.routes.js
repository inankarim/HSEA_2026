import { Router } from "express";
import { validate } from "../middleware/validation.middleware.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { loginLimiter, registerLimiter } from "../middleware/rateLimit.middleware.js";
import { registerSchema, loginSchema } from "../validators/auth.validators.js";
import { register, login, logout, me, refresh } from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", registerLimiter, validate(registerSchema), register);
router.post("/login", loginLimiter, validate(loginSchema), login);
router.post("/logout", logout);
router.get("/me", requireAuth, me);
router.post("/refresh", loginLimiter, refresh);

export default router;
