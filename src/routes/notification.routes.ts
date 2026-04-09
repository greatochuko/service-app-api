import { Router } from "express";
import { getNotifications } from "../controllers/notification.controller";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.get("/", asyncHandler(getNotifications));

export default router;
