import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { paystackWebhook } from "../controllers/webhook.controller";

const router = Router();

router.get("/paystack", asyncHandler(paystackWebhook));

export default router;
