import { Router } from "express";
import { paymentCallback } from "../controllers/paystack.controller";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.get("/callback", asyncHandler(paymentCallback));

export default router;
