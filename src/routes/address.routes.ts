import { Router } from "express";
import {
  createAddress,
  deleteSavedAddress,
  getSavedAddresses,
} from "../controllers/address.controller";
import { asyncHandler } from "../middleware/asyncHandler";
import { validate } from "../middleware/validate";
import { createAddressSchema } from "../validators/address.validator";

const router = Router();

router.get("/", asyncHandler(getSavedAddresses));

router.post("/", validate(createAddressSchema), asyncHandler(createAddress));

router.delete("/:id", asyncHandler(deleteSavedAddress));

export default router;
