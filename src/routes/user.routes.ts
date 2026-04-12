import { Router } from "express";
import {
  saveAvailability,
  update2fa,
  updateAvailabilityStatus,
  updateProfile,
  updateRecoveryEmail,
  deleteAccount,
  getUserById,
} from "../controllers/user.controller";
import { validate } from "../middleware/validate";
import {
  saveAvailabilitySchema,
  update2faSchema,
  updateAvailabilitySchema,
  updateProfileSchema,
  updateRecoveryEmailSchema,
} from "../validators/user.validator";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.get("/:id", asyncHandler(getUserById));

router.patch("/", validate(updateProfileSchema), asyncHandler(updateProfile));

router.put(
  "/schedule",
  validate(saveAvailabilitySchema),
  asyncHandler(saveAvailability),
);

router.patch(
  "/availability",
  validate(updateAvailabilitySchema),
  asyncHandler(updateAvailabilityStatus),
);

router.patch(
  "/recovery-email",
  validate(updateRecoveryEmailSchema),
  asyncHandler(updateRecoveryEmail),
);

router.patch("/2fa", validate(update2faSchema), asyncHandler(update2fa));

router.delete("/", asyncHandler(deleteAccount));

export default router;
