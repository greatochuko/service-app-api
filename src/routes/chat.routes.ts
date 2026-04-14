import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import {
  acceptQuote,
  declineQuote,
  getChats,
  getMessages,
  markMessagesAsRead,
  sendMessage,
  sendQuote,
} from "../controllers/chat.controller";
import { validate } from "../middleware/validate";
import {
  sendMessageSchema,
  sendQuoteSchema,
} from "../validators/chat.validator";

const router = Router();

router.get("/", asyncHandler(getChats));

router.get("/:id/messages", asyncHandler(getMessages));

router.post("/:id/messages/mark-as-read", asyncHandler(markMessagesAsRead));

router.post(
  "/:id/messages",
  validate(sendMessageSchema),
  asyncHandler(sendMessage),
);

router.post("/:id/quote", validate(sendQuoteSchema), asyncHandler(sendQuote));

router.post("/:id/quote/decline", asyncHandler(declineQuote));

router.post("/:id/quote/accept", asyncHandler(acceptQuote));

export default router;
