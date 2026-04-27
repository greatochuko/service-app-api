import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { logger } from "../utils/logger";
import { env } from "../config/env";
import { sendNotification } from "../services/notification.services";

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
        service: { select: { providerId: true } },
      },
    });
    if (!job) return res.status(404).json({ error: "Job not found" });

    // 1. Idempotency Check: Don't process if already successful
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

    // 3. Validate
    if (
      status &&
      data.status === "success" &&
      data.reference === job.paymentReference
    ) {
      await prisma.job.update({
        where: { id: jobId },
        data: { paymentStatus: "SUCCESS", status: "PAID" },
      });

      logger.info(`Payment verified and job updated: ${jobId}`);

      await Promise.allSettled([
        sendNotification({
          type: "PAYMENT",
          title: "Payment Successful",
          message: `Your payment for "${job.title}" has been processed successfully.`,
          userId: job.customerId,
          io: req.io,
          severity: "SUCCESS",
        }),

        job.service
          ? sendNotification({
              type: "PAYMENT",
              title: "Payment Received",
              message: `Payment has been received for job "${job.title}".`,
              userId: job.service.providerId,
              io: req.io,
              severity: "SUCCESS",
            })
          : Promise.resolve(),
      ]);

      return res
        .status(200)
        .json({ success: true, message: "Payment verified successfully" });
    }

    logger.warn(
      `Payment verification failed for job ${jobId}: ${data.gateway_response}`,
    );
    return res.status(400).json({ error: "Payment verification failed" });
  } catch (error) {
    logger.error(`Payment callback error: ${(error as Error).message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}
