import { Router } from "express";
import {
  getNotifications,
  markNotificationsAsRead,
} from "../controllers/notification.controller";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.get("/", asyncHandler(getNotifications));

router.post("/mark-as-read", asyncHandler(markNotificationsAsRead));

export default router;
