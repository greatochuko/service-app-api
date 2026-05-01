import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import {
  getEarnings,
  getEarningsHistory,
  withdrawEarnings,
} from "../controllers/earning.controller";
import { withdrawEarningsSchema } from "../validators/earnings.validator";
import { validate } from "../middleware/validate";

const router = Router();

router.get("/", asyncHandler(getEarnings));

router.get("/history", asyncHandler(getEarningsHistory));

router.post(
  "/withdraw",
  validate(withdrawEarningsSchema),
  asyncHandler(withdrawEarnings),
);

export default router;
