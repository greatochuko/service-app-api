import { Request } from "express";
import { AppError } from "../utils/AppError";
import { TypedResponse } from "../types/express";
import { Transaction } from "../generated/prisma/client";
import { prisma } from "../config/prisma";

export async function getTransactionReceipt(
  req: Request,
  res: TypedResponse<Transaction>,
) {
  const { id } = req.params as { id: string };

  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      job: {
        include: {
          service: true,
          customer: true,
        },
      },
    },
  });

  if (!transaction) {
    throw new AppError("Transaction not found", 404);
  }

  return res.status(200).json({
    success: true,
    data: transaction,
  });
}
