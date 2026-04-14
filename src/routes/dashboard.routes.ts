import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { getDashboardStats } from "../controllers/dashboard.controller";

const router = Router();

router.get("/", asyncHandler(getDashboardStats));

export default router;
