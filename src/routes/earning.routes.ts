import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import {
  getEarnings,
  getEarningsHistory,
} from "../controllers/earning.controller";

const router = Router();

router.get("/", asyncHandler(getEarnings));

router.get("/history", asyncHandler(getEarningsHistory));

// router.post(
//   "/withdraw",
//   validate(withdrawEarningsSchema),
//   asyncHandler(withdrawEarnings),
// );

export default router;
