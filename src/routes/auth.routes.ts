import { Router } from "express";
import {
  changePassword,
  getSession,
  login,
  signup,
} from "../controllers/auth.controller";
import { asyncHandler } from "../middleware/asyncHandler";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate";
import {
  changePasswordSchema,
  loginSchema,
  signupSchema,
} from "../validators/auth.validator";

const router = Router();

router.post("/signup", validate(signupSchema), asyncHandler(signup));

router.post("/login", validate(loginSchema), asyncHandler(login));

router.use(authenticate);

router.get("/session", asyncHandler(getSession));

router.post(
  "/change-password",
  validate(changePasswordSchema),
  asyncHandler(changePassword),
);

export default router;
