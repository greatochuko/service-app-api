import { Router } from "express";
import { saveAvailability } from "../controllers/user.controller";
import { validate } from "../middleware/validate";
import { saveAvailabilitySchema } from "../validators/user.validator";

const router = Router();

router.put("/availability", validate(saveAvailabilitySchema), saveAvailability);

export default router;
