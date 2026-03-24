import { Router } from "express";
import { getSession, login, signup } from "../controllers/auth.controller";
import { asyncHandler } from "../middleware/asyncHandler";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate";
import { loginSchema, signupSchema } from "../validators/auth.validator";

const router = Router();

router.post("/signup", validate(signupSchema), asyncHandler(signup));

router.post("/login", validate(loginSchema), asyncHandler(login));

router.use(authenticate);

router.get("/session", asyncHandler(getSession));

export default router;
