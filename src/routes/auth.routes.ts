import { Router } from "express";
import {
  changePassword,
  resetPassword,
  getSession,
  login,
  refreshSession,
  sendOtp,
  signup,
  verifyOtp,
  forgotPassword,
} from "../controllers/auth.controller";
import { asyncHandler } from "../middleware/asyncHandler";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate";
import {
  changePasswordSchema,
  resetPasswordSchema,
  loginSchema,
  sendOtpSchema,
  signupSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
} from "../validators/auth.validator";

const router = Router();

router.post("/signup", validate(signupSchema), asyncHandler(signup));

router.post("/otp/send", validate(sendOtpSchema), asyncHandler(sendOtp));

router.post("/otp/verify", validate(verifyOtpSchema), asyncHandler(verifyOtp));

router.post("/login", validate(loginSchema), asyncHandler(login));

router.post(
  "/forgot-password",
  validate(forgotPasswordSchema),
  asyncHandler(forgotPassword),
);

router.post(
  "/reset-password",
  validate(resetPasswordSchema),
  asyncHandler(resetPassword),
);

router.use(authenticate);

router.get("/session", asyncHandler(getSession));

router.post("/session/refresh", asyncHandler(refreshSession));

router.post(
  "/change-password",
  validate(changePasswordSchema),
  asyncHandler(changePassword),
);

export default router;
