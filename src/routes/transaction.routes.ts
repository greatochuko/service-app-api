import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { getTransactionReceipt } from "../controllers/transaction.controller";

const router = Router();

router.get("/:id", asyncHandler(getTransactionReceipt));

export default router;
