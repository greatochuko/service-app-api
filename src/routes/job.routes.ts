import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import {
  getJobs,
  startJob,
  completeJob,
  cancelJob,
  generatePaystackReference,
  verifyPaymentStatus,
} from "../controllers/job.controller";

const router = Router();

router.get("/", asyncHandler(getJobs));

router.post("/:id/start", asyncHandler(startJob));

router.post("/:id/cancel", asyncHandler(cancelJob));

router.post("/:id/complete", asyncHandler(completeJob));

router.post(
  "/:id/generate-paystack-reference",
  asyncHandler(generatePaystackReference),
);

router.post("/:id/verify-payment", asyncHandler(verifyPaymentStatus));

export default router;
