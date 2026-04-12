import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { getJobs } from "../controllers/job.controller";

const router = Router();

router.get("/", asyncHandler(getJobs));

export default router;
