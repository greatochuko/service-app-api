import { Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../config/prisma";
import { logger } from "../utils/logger";
import { env } from "../config/env";

/**
 * Paystack Transfer Webhook Handler
 */
export async function paystackWebhook(req: Request, res: Response) {
  try {
    const secret = env.PAYSTACK_SECRET_KEY;

    // 1. Verify signature (VERY IMPORTANT)
    const hash = crypto
      .createHmac("sha512", secret!)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      return res.status(401).send("Invalid signature");
    }

    const event = req.body;

    const eventType = event.event;
    const data = event.data;

    const reference = data.reference;

    // 2. Find transaction
    const transaction = await prisma.transaction.findFirst({
      where: { paystackRef: reference },
      select: {
        id: true,
        userId: true,
        amountKobo: true,
        user: {
          select: {
            wallet: true,
          },
        },
      },
    });

    if (!transaction) {
      logger.warn(`Transaction not found for reference ${reference}`);
      return res.status(200).send("OK");
    }

    // 3. Handle events
    switch (eventType) {
      /**
       * ✅ SUCCESSFUL TRANSFER
       */
      case "transfer.success": {
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: "SUCCESS",
            isReleased: true,
          },
        });

        break;
      }

      /**
       * ❌ FAILED TRANSFER
       */
      case "transfer.failed": {
        await prisma.$transaction(async (tx) => {
          await tx.transaction.update({
            where: { id: transaction.id },
            data: {
              status: "FAILED",
            },
          });

          // Release funds back if you reserved them
          await tx.wallet.update({
            where: { userId: transaction.userId },
            data: {
              heldKobo: {
                decrement: transaction.amountKobo,
              },
              balanceKobo: {
                increment: transaction.amountKobo,
              },
            },
          });
        });

        break;
      }

      /**
       * ⚠️ REVERSED TRANSFER
       */
      case "transfer.reversed": {
        await prisma.$transaction(async (tx) => {
          await tx.transaction.update({
            where: { id: transaction.id },
            data: {
              status: "REVERSED",
            },
          });

          await tx.wallet.update({
            where: { userId: transaction.userId },
            data: {
              balanceKobo: {
                increment: transaction.amountKobo,
              },
            },
          });
        });

        break;
      }

      default:
        logger.info(`Unhandled event type: ${eventType}`);
        break;
    }

    return res.status(200).send("OK");
  } catch (error) {
    logger.error(`Webhook error: ${(error as Error).message}`);
    return res.status(500).send("Internal server error");
  }
}
