import { Request } from "express";
import { TypedResponse } from "../types/express";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { Transaction } from "../generated/prisma/client";

// Define this in your types file
type EarningsData = {
  history: Transaction[];
  summary: {
    availableBalance: number;
    thisMonthEarnings: number;
    pendingPayment: number;
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

  if (!user.wallet) {
    throw new AppError(
      "Wallet not initialized. Please complete your bank account setup to start earning.",
      404,
    );
  }

  // 1. Calculate Start of Current Month
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [monthlyEarnings, history, totalJobs] = await Promise.all([
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
        OR: [
          {
            serviceId: user.services[0]?.id,
            status: "PAID",
            paymentStatus: "SUCCESS",
          },
          { status: "COMPLETED", serviceId: user.services[0]?.id },
        ],
      },
    }),
  ]);

  const pendingPayment = await prisma.job.aggregate({
    where: { status: "COMPLETED", serviceId: user.services[0]?.id },
    _sum: {
      priceKobo: true,
    },
  });

  return res.status(200).json({
    success: true,
    data: {
      history,
      summary: {
        availableBalance: user.wallet.balanceKobo,
        thisMonthEarnings: monthlyEarnings._sum.amountKobo || 0,
        pendingPayment: pendingPayment._sum.priceKobo || 0,
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

  if (!user.wallet) {
    throw new AppError(
      "Wallet not initialized. Please complete your bank account setup to start earning.",
      404,
    );
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
