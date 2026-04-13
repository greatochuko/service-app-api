import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { getJobs, startJob, completeJob } from "../controllers/job.controller";

const router = Router();

router.get("/", asyncHandler(getJobs));

router.post("/:id/start", asyncHandler(startJob));

router.post("/:id/complete", asyncHandler(completeJob));

export default router;
