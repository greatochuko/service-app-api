import { Router } from "express";
import {
  saveAvailability,
  updateAvailabilityStatus,
  updateProfile,
} from "../controllers/user.controller";
import { validate } from "../middleware/validate";
import {
  saveAvailabilitySchema,
  updateAvailabilitySchema,
  updateProfileSchema,
} from "../validators/user.validator";

const router = Router();

router.patch("/", validate(updateProfileSchema), updateProfile);

router.put("/schedule", validate(saveAvailabilitySchema), saveAvailability);

router.patch(
  "/availability",
  validate(updateAvailabilitySchema),
  updateAvailabilityStatus,
);

export default router;
