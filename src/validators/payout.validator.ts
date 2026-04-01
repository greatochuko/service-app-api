import z from "zod";

export const saveBankAccountSchema = z.object({
  bankName: z.string(),
  bankCode: z.string(),
  accountNumber: z.string(),
  accountName: z.string(),
});

export type SaveBankAccountBody = z.infer<typeof saveBankAccountSchema>;
