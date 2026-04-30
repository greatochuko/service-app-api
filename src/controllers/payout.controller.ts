import { Request } from "express";
import { TypedRequest, TypedResponse } from "../types/express";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import { Bank, BankAccount, Transaction } from "../generated/prisma/client";
import {
  SaveBankAccountBody,
  GenerateStatementBody,
} from "../validators/payout.validator";
import { prisma } from "../config/prisma";
import { BankType } from "../types/payout.type";
import { BankCreateManyInput } from "../generated/prisma/models";
import { upsertPaystackSubaccount } from "../services/paystack.services";

export async function getBanks(req: Request, res: TypedResponse<Bank[]>) {
  try {
    const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

    const cachedBanks = await prisma.bank.findMany({
      where: { isDeleted: false },
      orderBy: { name: "asc" },
    });

    const lastUpdated = cachedBanks[0]?.updatedAt;
    const isCacheStale =
      !lastUpdated ||
      Date.now() - new Date(lastUpdated).getTime() > ONE_DAY_IN_MS;

    if (cachedBanks.length > 0 && !isCacheStale) {
      return res.json({
        success: true,
        data: cachedBanks as Bank[],
      });
    }

    const paystackRes = await fetch(
      `https://api.paystack.co/bank?country=nigeria`,
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      },
    );

    const paystackData = await paystackRes.json();
    const externalBanks: BankType[] = paystackData.data;

    const bankCreationData: BankCreateManyInput[] = externalBanks.map(
      (bank) => ({
        id: bank.id.toString(),
        name: bank.name,
        slug: bank.slug,
        code: bank.code,
        longcode: bank.longcode,
        gateway: bank.gateway,
        payWithBank: bank.pay_with_bank,
        supportsTransfer: bank.supports_transfer,
        availableForDirectDebit: bank.available_for_direct_debit,
        active: bank.active,
        country: bank.country,
        currency: bank.currency,
        type: bank.type,
        isDeleted: bank.is_deleted,
      }),
    );

    const [_, newBanks] = await prisma.$transaction([
      prisma.bank.deleteMany({}),

      prisma.bank.createManyAndReturn({
        data: bankCreationData,
        skipDuplicates: true,
      }),
    ]);

    res.json({ success: true, data: newBanks });
  } catch (error) {
    console.error("Bank Fetch Error:", error);

    const fallbackBanks = await prisma.bank.findMany();
    if (fallbackBanks.length > 0) {
      return res.json({
        success: true,
        data: fallbackBanks,
      });
    }
  }
}

export async function verifyAccountNumber(
  req: Request,
  res: TypedResponse<Bank[]>,
) {
  try {
    const paystackRes = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${req.query.account_number}&bank_code=${req.query.bank_code}`,
      {
        headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` },
      },
    );
    const paystackData = await paystackRes.json();

    res.json({ success: true, data: paystackData.data });
  } catch (error) {
    throw new AppError((error as Error).message, 500);
  }
}

export async function saveBankAccount(
  req: TypedRequest<SaveBankAccountBody>,
  res: TypedResponse<BankAccount>,
) {
  const userId = req.user?.id as string;
  const { accountName, accountNumber, bankCode, bankName } = req.body;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, wallet: true },
  });

  if (!user) throw new AppError("Invalid User ID");

  const bankAccountExists = await prisma.bankAccount.findFirst({
    where: { userId, bankCode, accountNumber },
  });

  if (bankAccountExists) {
    throw new AppError(
      "This bank account is already linked to your profile. Please use a different account number.",
      400,
    );
  }

  const userHasBankAccounts = await prisma.bankAccount.count({
    where: { userId },
  });

  const newBankAccount = await prisma.$transaction(async (tx) => {
    if (!user.wallet) {
      const { data: paystackData } = await upsertPaystackSubaccount({
        business_name: accountName,
        settlement_bank: bankCode,
        account_number: accountNumber,
      });

      if (!paystackData) throw new AppError("Server Error", 500);

      await tx.wallet.create({
        data: {
          userId,
          paystackSubaccountCode: paystackData.subaccount_code,
        },
      });
    }

    return await tx.bankAccount.create({
      data: {
        accountName,
        accountNumber,
        bankCode,
        bankName,
        userId,
        isPrimary: userHasBankAccounts < 1,
      },
    });
  });

  res.json({ success: true, data: newBankAccount });
}

export async function getBankAccounts(
  req: Request,
  res: TypedResponse<BankAccount[]>,
) {
  const userId = req.user?.id as string;

  const bankAccounts = await prisma.bankAccount.findMany({
    where: { userId },
  });

  res.json({ success: true, data: bankAccounts });
}

export async function deleteBankAccount(
  req: Request,
  res: TypedResponse<BankAccount>,
) {
  const userId = req.user?.id as string;
  const bankAccountId = req.params.id as string;

  const bankAccountToDelete = await prisma.bankAccount.findUnique({
    where: { id: bankAccountId },
  });

  if (!bankAccountToDelete) {
    throw new AppError("Bank account not found", 404);
  }

  if (bankAccountToDelete.userId !== userId) {
    throw new AppError("Unauthorized to delete this bank account", 403);
  }

  if (bankAccountToDelete.isPrimary) {
    throw new AppError("Cannot delete primary bank account", 400);
  }

  const deletedBankAccount = await prisma.bankAccount.delete({
    where: { id: bankAccountId },
  });

  res.json({ success: true, data: deletedBankAccount });
}
export async function makeDefaultAccount(
  req: Request,
  res: TypedResponse<BankAccount>,
) {
  const userId = req.user?.id;
  const bankAccountId = req.params.id as string;

  if (!userId)
    throw new AppError("Authentication required: User ID missing.", 401);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, wallet: true },
  });

  if (!user) throw new AppError("User account not found.", 404);

  const bankAccountToMakeDefault = await prisma.bankAccount.findUnique({
    where: { id: bankAccountId },
  });

  if (!bankAccountToMakeDefault) {
    throw new AppError("The requested bank account does not exist.", 404);
  }

  if (bankAccountToMakeDefault.userId !== userId) {
    throw new AppError("Access denied: You do not own this bank account.", 403);
  }

  // Handle Paystack Integration
  const { data: paystackData } = await upsertPaystackSubaccount(
    {
      business_name: bankAccountToMakeDefault.accountName,
      settlement_bank: bankAccountToMakeDefault.bankCode,
      account_number: bankAccountToMakeDefault.accountNumber,
    },
    user.wallet?.paystackSubaccountCode,
  );

  if (!paystackData?.subaccount_code) {
    throw new AppError(
      "Failed to update bank details with payment provider. Please try again later.",
      502,
    );
  }

  // Update Database via Transaction
  const updatedBankAccount = await prisma.$transaction(async (tx) => {
    // 1. Sync Wallet/Subaccount code
    if (!user.wallet) {
      await tx.wallet.create({
        data: { userId, paystackSubaccountCode: paystackData.subaccount_code },
      });
    } else {
      await tx.wallet.update({
        where: { userId },
        data: { paystackSubaccountCode: paystackData.subaccount_code },
      });
    }

    // 2. Clear previous primary status
    await tx.bankAccount.updateMany({
      where: { userId, isPrimary: true },
      data: { isPrimary: false },
    });

    // 3. Set new primary account
    return await tx.bankAccount.update({
      where: { id: bankAccountId },
      data: { isPrimary: true },
    });
  });

  return res.json({ success: true, data: updatedBankAccount });
}

export async function generateStatement(
  req: TypedRequest<GenerateStatementBody>,
  res: TypedResponse<{
    transactions: Transaction[];
    summary: {
      totalInflow: number;
      totalOutflow: number;
    };
    period: {
      from: Date;
      to: Date;
    };
  }>, // Changed to any or a custom Statement interface
) {
  const userId = req.user?.id as string;
  const { startDate, endDate } = req.body;

  // 1. Validate the dates
  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: "Start date and end date are required.",
    });
  }

  // 2. Query transactions within the range
  // We use new Date() to ensure the strings from the body are valid Date objects
  const transactions = await prisma.transaction.findMany({
    where: {
      userId: userId,
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
    include: {
      job: {
        select: {
          title: true,
          status: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // 3. Calculate summary (Optional but helpful for statements)
  const summary = transactions.reduce(
    (acc, curr) => {
      if (curr.status === "SUCCESS") {
        if (curr.type === "CREDIT") acc.totalInflow += curr.amountKobo;
        if (curr.type === "DEBIT" || curr.type === "WITHDRAWAL")
          acc.totalOutflow += curr.amountKobo;
      }
      return acc;
    },
    { totalInflow: 0, totalOutflow: 0 },
  );

  return res.status(200).json({
    success: true,
    data: {
      transactions,
      summary,
      period: {
        from: new Date(startDate),
        to: new Date(endDate),
      },
    },
  });
}
