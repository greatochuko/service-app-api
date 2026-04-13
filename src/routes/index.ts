import { Router } from "express";
import authRoutes from "./auth.routes";
import serviceRoutes from "./service.routes";
import userRoutes from "./user.routes";
import payoutRoutes from "./payout.routes";
import notificationRoutes from "./notification.routes";
import reviewRoutes from "./review.routes";
import jobRoutes from "./job.routes";
import chatRoutes from "./chat.routes";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.use("/auth", authRoutes);

router.use(authenticate);

router.use("/user", userRoutes);

router.use("/services", serviceRoutes);

router.use("/payout", payoutRoutes);

router.use("/notifications", notificationRoutes);

router.use("/reviews", reviewRoutes);

router.use("/jobs", jobRoutes);
router.use("/chat", chatRoutes);

export default router;
