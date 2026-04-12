import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validate } from "../middleware/validate";
import {
  createServiceSchema,
  requestServiceSchema,
} from "../validators/service.validator";
import {
  createService,
  updateService,
  getTopServices,
  getServiceById,
  searchServices,
  requestService,
} from "../controllers/service.controller";

const router = Router();

router.get("/", asyncHandler(searchServices));

router.post("/", validate(createServiceSchema), asyncHandler(createService));

router.get("/top", asyncHandler(getTopServices));

router.get("/:id", asyncHandler(getServiceById));

router.put("/:id", validate(createServiceSchema), asyncHandler(updateService));

router.post(
  "/:id/request",
  validate(requestServiceSchema),
  asyncHandler(requestService),
);

export default router;
