import { asyncHandler } from "../utils/asyncHandler.js";
import { checkDatabaseConnection } from "../config/database.js";

/** Liveness — process is up. Load balancers should hit this frequently. */
export const health = (req, res) => {
  res.status(200).json({ status: "ok" });
};

/** Readiness — dependencies (PostgreSQL) are reachable. */
export const ready = asyncHandler(async (req, res) => {
  try {
    const dbOk = await checkDatabaseConnection();
    if (!dbOk) throw new Error("Database check returned falsy result");
    res.status(200).json({ status: "ready" });
  } catch (err) {
    res.status(503).json({ status: "not_ready", reason: "database_unreachable" });
  }
});
