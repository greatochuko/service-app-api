import { Router } from "express";
import authRoutes from "./auth.routes";
import serviceRoutes from "./service.routes";
import userRoutes from "./user.routes";
import payoutRoutes from "./payout.routes";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.use("/auth", authRoutes);

router.use(authenticate);

router.use("/user", userRoutes);

router.use("/services", serviceRoutes);

router.use("/payout", payoutRoutes);

export default router;
