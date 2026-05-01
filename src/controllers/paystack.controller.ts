import { Request } from "express";
import { prisma } from "../config/prisma";
import { logger } from "../utils/logger";
import { env } from "../config/env";
import { sendNotification } from "../services/notification.services";
import { TypedResponse } from "../types/express";
import { addBusinessDays } from "date-fns";

export async function paymentCallback(
  req: Request,
  res: TypedResponse<string>,
) {
  try {
    const { jobId, reference } = req.query as {
      jobId: string;
      reference: string;
    };

    if (!jobId || !reference) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required query parameters" });
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

    if (!job)
      return res.status(404).json({ success: false, message: "Job not found" });

    // 1. Idempotency Check
    if (job.paymentStatus === "SUCCESS") {
      return res
        .status(200)
        .json({ success: true, data: "Payment already verified" });
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

        await tx.transaction.create({
          data: {
            userId: providerId,
            paystackRef: data.reference,
            amountKobo: data.amount, // Paystack amount is in kobo
            type: "CREDIT",
            status: "SUCCESS",
            note: `${job.title} - ${job.customer.fullName}`,
            jobId,
            releaseAt: addBusinessDays(new Date(), 1),
            isReleased: false,
          },
        });

        // C. Update Wallet Balance
        await tx.wallet.update({
          where: { userId: providerId },
          data: {
            pendingBalanceKobo: { increment: data.amount },
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
        .json({ success: true, data: "Payment verified successfully" });
    }

    return res
      .status(400)
      .json({ success: false, message: "Payment verification failed" });
  } catch (error) {
    logger.error(`Payment callback error: ${(error as Error).message}`);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
}
