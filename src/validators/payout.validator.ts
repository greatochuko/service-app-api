import z from "zod";

export const saveBankAccountSchema = z.object({
  bankName: z.string(),
  bankCode: z.string(),
  accountNumber: z.string(),
  accountName: z.string(),
});

export type SaveBankAccountBody = z.infer<typeof saveBankAccountSchema>;

export const generateStatementSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
});

export type GenerateStatementBody = z.infer<typeof generateStatementSchema>;
