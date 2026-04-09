import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validate } from "../middleware/validate";
import { createServiceSchema } from "../validators/service.validator";
import {
  createService,
  updateService,
  getTopServices,
} from "../controllers/service.controller";

const router = Router();

router.get("/", asyncHandler(getTopServices));

router.post("/", validate(createServiceSchema), asyncHandler(createService));

router.put("/:id", validate(createServiceSchema), asyncHandler(updateService));

export default router;
