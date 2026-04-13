import z from "zod";
import { MessageType } from "../generated/prisma/enums";

export const sendMessageSchema = z.object({
  content: z.string(),
  receiverId: z.string(),
  isQuote: z.boolean().optional(),
  type: z.enum(MessageType),
});

export type SendMessageBody = z.infer<typeof sendMessageSchema>;

export const sendQuoteSchema = z.object({
  price: z.number(),
  note: z.string().optional().nullable(),
});

export type SendQuoteBody = z.infer<typeof sendQuoteSchema>;
