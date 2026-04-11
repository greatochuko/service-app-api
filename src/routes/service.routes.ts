import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validate } from "../middleware/validate";
import { createServiceSchema } from "../validators/service.validator";
import {
  createService,
  updateService,
  getTopServices,
  getServiceById,
  searchServices,
} from "../controllers/service.controller";

const router = Router();

router.get("/", asyncHandler(searchServices));

router.get("/top", asyncHandler(getTopServices));

router.get("/:id", asyncHandler(getServiceById));

router.post("/", validate(createServiceSchema), asyncHandler(createService));

router.put("/:id", validate(createServiceSchema), asyncHandler(updateService));

export default router;
