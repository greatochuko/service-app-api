import { Router } from "express";
import {
  saveAvailability,
  update2fa,
  updateAvailabilityStatus,
  updateProfile,
  updateRecoveryEmail,
  deleteAccount,
} from "../controllers/user.controller";
import { validate } from "../middleware/validate";
import {
  saveAvailabilitySchema,
  update2faSchema,
  updateAvailabilitySchema,
  updateProfileSchema,
  updateRecoveryEmailSchema,
} from "../validators/user.validator";

const router = Router();

router.patch("/", validate(updateProfileSchema), updateProfile);

router.put("/schedule", validate(saveAvailabilitySchema), saveAvailability);

router.patch(
  "/availability",
  validate(updateAvailabilitySchema),
  updateAvailabilityStatus,
);

router.patch(
  "/recovery-email",
  validate(updateRecoveryEmailSchema),
  updateRecoveryEmail,
);

router.patch("/2fa", validate(update2faSchema), update2fa);

router.delete("/", deleteAccount);

export default router;
