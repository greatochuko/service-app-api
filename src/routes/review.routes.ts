import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import {
  addReview,
  getProviderReviews,
} from "../controllers/review.controller";
import { validate } from "../middleware/validate";
import { addReviewSchema } from "../validators/review.validator";

const router = Router();

router.get("/", asyncHandler(getProviderReviews));

router.post("/", validate(addReviewSchema), asyncHandler(addReview));

router.post("/:id", validate(addReviewSchema), asyncHandler(addReview));

export default router;
