import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { logger } from "../utils/logger";
import { env } from "../config/env";
import { sendNotification } from "../services/notification.services";

export const PERCENTAGE_CHARGE = 10;

export async function paymentCallback(req: Request, res: Response) {
  try {
    const { jobId, reference } = req.query as {
      jobId: string;
      reference: string;
    };

    if (!jobId || !reference) {
      return res
        .status(400)
        .json({ error: "Missing required query parameters" });
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        paymentStatus: true,
        paymentReference: true,
        title: true,
        customerId: true,
        customer: { select: { fullName: true } },
        priceKobo: true,
        service: { select: { providerId: true } },
      },
    });

    if (!job) return res.status(404).json({ error: "Job not found" });

    // 1. Idempotency Check
    if (job.paymentStatus === "SUCCESS") {
      return res
        .status(200)
        .json({ success: true, message: "Payment already verified" });
    }

    // 2. Verify with Paystack
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` },
      },
    );
    const { status, data } = await response.json();

    // 3. Validation and Atomic Updates
    if (
      status &&
      data.status === "success" &&
      data.reference === job.paymentReference
    ) {
      const providerId = job.service?.providerId;
      if (!providerId) throw new Error("Provider missing from job service");

      await prisma.$transaction(async (tx) => {
        // A. Update Job
        await tx.job.update({
          where: { id: jobId },
          data: { paymentStatus: "SUCCESS", status: "PAID" },
        });

        // B. Create Transaction Record
        const ARTISAN_FACTOR = 1 - PERCENTAGE_CHARGE / 100;
        const calculatedAmount = data.amount * ARTISAN_FACTOR;

        await tx.transaction.create({
          data: {
            userId: providerId,
            paystackRef: data.reference,
            amountKobo: calculatedAmount, // Paystack amount is in kobo
            type: "CREDIT",
            status: "SUCCESS",
            note: `${job.title} - ${job.customer.fullName}`,
          },
        });

        // C. Update Wallet Balance
        await tx.wallet.update({
          where: { userId: providerId },
          data: {
            balanceKobo: { increment: calculatedAmount },
          },
        });
      });

      logger.info(`Payment verified, job ${jobId} and wallet updated.`);

      // 4. Notifications
      await Promise.allSettled([
        sendNotification({
          type: "PAYMENT",
          title: "Payment Successful",
          message: `Your payment for "${job.title}" has been processed.`,
          userId: job.customerId,
          io: req.io,
          severity: "SUCCESS",
        }),
        sendNotification({
          type: "PAYMENT",
          title: "Payment Received",
          message: `Payment received for job "${job.title}".`,
          userId: providerId,
          io: req.io,
          severity: "SUCCESS",
        }),
      ]);

      return res
        .status(200)
        .json({ success: true, message: "Payment verified successfully" });
    }

    return res.status(400).json({ error: "Payment verification failed" });
  } catch (error) {
    logger.error(`Payment callback error: ${(error as Error).message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}
