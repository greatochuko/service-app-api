import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { getJobs, startJob } from "../controllers/job.controller";

const router = Router();

router.get("/", asyncHandler(getJobs));

router.post("/:id/start", asyncHandler(startJob));

export default router;
