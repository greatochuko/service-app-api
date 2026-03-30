import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validate } from "../middleware/validate";
import { createServiceSchema } from "../validators/service.validator";
import {
  createService,
  updateService,
} from "../controllers/service.controller";

const router = Router();

router.post("/", validate(createServiceSchema), asyncHandler(createService));

router.put("/:id", validate(createServiceSchema), asyncHandler(updateService));

export default router;
