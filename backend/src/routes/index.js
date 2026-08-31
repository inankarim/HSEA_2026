import { Router } from "express";
import authRoutes from "./auth.routes.js";
import iabRoutes from "./iab.routes.js";
import universityRoutes from "./university.routes.js";
import submissionRoutes from "./submission.routes.js";
import profileRoutes from "./profile.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/iab", iabRoutes);
router.use("/universities", universityRoutes);
router.use("/submissions", submissionRoutes);
router.use("/profile", profileRoutes);

export default router;
