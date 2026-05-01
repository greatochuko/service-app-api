import z from "zod";

export const withdrawEarningsSchema = z.object({
  amountKobo: z.number().positive("Amount must be a positive number"),
});

export type WithdrawEarningsBody = z.infer<typeof withdrawEarningsSchema>;
