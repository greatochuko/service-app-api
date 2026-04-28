import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import {
  getBankAccounts,
  getBanks,
  saveBankAccount,
  verifyAccountNumber,
  makeDefaultAccount,
  deleteBankAccount,
  withdrawFunds,
} from "../controllers/payout.controller";
import { validate } from "../middleware/validate";
import {
  saveBankAccountSchema,
  withdrawFundsSchema,
} from "../validators/payout.validator";

const router = Router();

router.get("/banks", asyncHandler(getBanks));

router.get("/banks/verify-account", asyncHandler(verifyAccountNumber));

router.get("/bank-account", asyncHandler(getBankAccounts));

router.post(
  "/bank-account",
  validate(saveBankAccountSchema),
  asyncHandler(saveBankAccount),
);

router.post("/bank-account/:id/make-default", asyncHandler(makeDefaultAccount));

router.delete("/bank-account/:id", asyncHandler(deleteBankAccount));

router.post(
  "/withdraw",
  validate(withdrawFundsSchema),
  asyncHandler(withdrawFunds),
);

export default router;
