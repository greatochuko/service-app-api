import { Router } from "express";
import authRoutes from "./auth.routes";
import serviceRoutes from "./service.routes";
import userRoutes from "./user.routes";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.use("/auth", authRoutes);

router.use(authenticate);

router.use("/user", userRoutes);

router.use("/services", serviceRoutes);

export default router;
