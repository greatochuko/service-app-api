import cron from "node-cron";
import { prisma } from "../config/prisma";
import { logger } from "../utils/logger";
import { env } from "../config/env";

export const initCronJobs = () => {
  logger.info("Initializing cron jobs...");
  if (env.NODE_ENV !== "production") return;

  cron.schedule("*/10 * * * *", async () => {
    const timestamp = new Date().toISOString();
    logger.info(`[${timestamp}] Starting scheduled publication cycle...`);

    await startWalletReleaseCron();
  });
};

/**
 * Runs every 10 minutes:
 * - Finds pending CREDIT transactions ready for release
 * - Marks them as released
 * - Credits wallet balanceKobo
 */
async function startWalletReleaseCron() {
  try {
    const now = new Date();

    // 1. Find all due transactions
    const dueTransactions = await prisma.transaction.findMany({
      where: {
        type: "CREDIT",
        status: "SUCCESS",
        isReleased: false,
        releaseAt: {
          lte: now,
        },
      },
    });

    if (dueTransactions.length === 0) {
      logger.info(
        "Wallet release cron: No transactions to release at this time.",
      );
      return;
    }

    // 2. Process in a transaction for safety
    await prisma.$transaction(async (tx) => {
      for (const t of dueTransactions) {
        // A. Credit wallet
        await tx.wallet.update({
          where: { userId: t.userId },
          data: {
            balanceKobo: {
              increment: t.amountKobo,
            },
            pendingBalanceKobo: {
              decrement: t.amountKobo,
            },
          },
        });

        // B. Mark transaction as released
        await tx.transaction.update({
          where: { id: t.id },
          data: {
            status: "SUCCESS",
            isReleased: true,
          },
        });
      }
    });

    logger.info(
      `Wallet release cron: released ${dueTransactions.length} transactions`,
    );
  } catch (error) {
    logger.error(`Wallet release cron failed: ${(error as Error).message}`);
  }
}
