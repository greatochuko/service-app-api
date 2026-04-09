import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { getProviderReviews } from "../controllers/review.controller";

const router = Router();

router.get("/", asyncHandler(getProviderReviews));

export default router;
