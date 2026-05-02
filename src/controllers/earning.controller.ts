import { Request } from "express";
import { TypedRequest, TypedResponse } from "../types/express";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { Transaction } from "../generated/prisma/client";
import { WithdrawEarningsBody } from "../validators/earnings.validator";
import {
  createTransferRecipient,
  initiatePaystackTransfer,
  PERCENTAGE_CHARGE,
} from "../services/paystack.services";
import { v4 } from "uuid";
import { logger } from "../utils/logger";

// Define this in your types file
type EarningsData = {
  history: Transaction[];
  summary: {
    availableBalance: number;
    thisMonthEarnings: number;
    pendingRelease: number;
    totalJobs: number;
  };
};

export async function getEarnings(
  req: Request,
  res: TypedResponse<EarningsData>,
) {
  const user = await prisma.user.findUnique({
    where: { id: req.user?.id },
    select: { id: true, wallet: true, services: true },
  });

  if (!user) {
    throw new AppError("User account not found. Please log in again.", 401);
  }

  // 1. Calculate Start of Current Month
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [monthlyEarnings, history, totalJobs, pendingRelease] =
    await Promise.all([
      prisma.transaction.aggregate({
        where: {
          userId: user.id,
          type: "CREDIT",
          status: "SUCCESS",
          createdAt: {
            gte: firstDayOfMonth,
          },
        },
        _sum: {
          amountKobo: true,
        },
      }),

      prisma.transaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      }),

      prisma.job.count({
        where: {
          serviceId: user.services[0]?.id,
          status: "PAID",
          paymentStatus: "SUCCESS",
        },
      }),

      prisma.transaction.aggregate({
        where: {
          userId: user.id,
          isReleased: false,
          type: "CREDIT",
          status: "SUCCESS",
        },
        _sum: {
          amountKobo: true,
        },
      }),
    ]);

  return res.status(200).json({
    success: true,
    data: {
      history,
      summary: {
        availableBalance: user.wallet?.balanceKobo || 0,
        thisMonthEarnings: monthlyEarnings._sum.amountKobo || 0,
        pendingRelease: pendingRelease._sum.amountKobo || 0,
        totalJobs,
      },
    },
  });
}

export async function getEarningsHistory(
  req: Request,
  res: TypedResponse<Transaction[]>,
) {
  const user = await prisma.user.findUnique({
    where: { id: req.user?.id },
    select: { id: true, wallet: true, services: true },
  });

  if (!user) {
    throw new AppError("User account not found. Please log in again.", 401);
  }

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return res.status(200).json({
    success: true,
    data: transactions,
  });
}

export async function withdrawEarnings(
  req: TypedRequest<WithdrawEarningsBody>,
  res: TypedResponse<Transaction>,
) {
  const { amountKobo } = req.body;

  if (amountKobo < 10000) {
    throw new AppError("Minimum withdrawal amount is 100 Naira", 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user?.id },
    select: {
      id: true,
      wallet: true,
      bankAccounts: { where: { isPrimary: true } },
    },
  });

  if (!user) {
    throw new AppError("User account not found. Please log in again.", 401);
  }

  if (!user.wallet) {
    throw new AppError("Wallet not found for user.", 404);
  }

  const primaryBankAccount = user.bankAccounts[0];

  if (!primaryBankAccount) {
    throw new AppError("No primary bank account found.", 400);
  }

  const fee = Math.ceil((amountKobo * PERCENTAGE_CHARGE) / 100);
  const netAmount = amountKobo - fee;

  // 1. Check balance BEFORE anything else
  if (user.wallet.balanceKobo < amountKobo) {
    throw new AppError("Insufficient balance", 400);
  }

  let recipientCode = primaryBankAccount.recipientCode;

  // 2. Create recipient if missing
  if (!recipientCode) {
    const { data, error } = await createTransferRecipient({
      accountNumber: primaryBankAccount.accountNumber,
      bankCode: primaryBankAccount.bankCode,
      name: primaryBankAccount.accountName,
    });

    if (!data) {
      throw new AppError(error || "Failed to create transfer recipient.", 500);
    }

    await prisma.bankAccount.update({
      where: { id: primaryBankAccount.id },
      data: { recipientCode: data },
    });

    recipientCode = data;
  }

  const reference = v4();

  const withdrawalDetails = `To ${primaryBankAccount.bankName} account ending in ${primaryBankAccount.accountNumber.slice(-4)}`;

  // 3. Initiate Paystack transfer FIRST
  const { data, error } = await initiatePaystackTransfer({
    amount: netAmount,
    reason: withdrawalDetails,
    recipient: recipientCode,
    reference,
  });

  if (!data) {
    logger.error(error);
    throw new AppError("Server Error: Failed to initiate transfer.", 500);
  }

  // 4. Only AFTER success → update DB atomically
  const newTransaction = await prisma.$transaction(async (tx) => {
    // A. Deduct wallet balance
    await tx.wallet.update({
      where: { userId: user.id },
      data: {
        balanceKobo: {
          decrement: amountKobo,
        },
      },
    });

    // B. Create transaction record (PENDING until webhook confirms)
    return tx.transaction.create({
      data: {
        userId: user.id,
        amountKobo,
        type: "DEBIT",
        status: "PENDING",
        paystackRef: reference,
        note: withdrawalDetails,
        isReleased: true,
        releaseAt: new Date(),
      },
    });
  });

  return res.status(200).json({
    success: true,
    data: newTransaction,
  });
}
