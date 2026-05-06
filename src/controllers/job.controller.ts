import { Request } from "express";
import { TypedResponse } from "../types/express";
import { Job } from "../generated/prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { sendNotification } from "../services/notification.services";
import { env } from "../config/env";

export async function getJobs(req: Request, res: TypedResponse<Job[]>) {
  const authUserId = req.user?.id as string;
  const authUserRole = req.user?.role;

  let jobs: Job[];

  if (authUserRole === "PROVIDER") {
    const userService = await prisma.service.findFirst({
      where: { providerId: authUserId },
    });

    if (!userService) {
      throw new AppError("Provider service not found", 404);
    }

    jobs = await prisma.job.findMany({
      where: { serviceId: userService.id },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            locations: { select: { address: true } },
            phoneNumber: true,
          },
        },
        service: {
          select: {
            provider: {
              select: {
                id: true,
                fullName: true,
                locations: { select: { address: true } },
              },
            },
          },
        },
        chat: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } else {
    jobs = await prisma.job.findMany({
      where: { customerId: authUserId },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            locations: { select: { address: true } },
          },
        },
        reviews: true,
        service: {
          select: {
            provider: {
              select: {
                id: true,
                fullName: true,
                locations: { select: { address: true } },
                phoneNumber: true,
              },
            },
          },
        },
        chat: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  res.json({ success: true, data: jobs });
}

export async function getJobReceipt(req: Request, res: TypedResponse<Job>) {
  const jobId = req.params.id as string;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      customer: { select: { fullName: true } },
      service: { select: { title: true, features: true } },
    },
  });

  if (!job) throw new AppError("Job not found", 404);

  res.json({ success: true, data: job });
}

/**
 * Controller to transition a job status from BOOKED to IN_PROGRESS
 */
export async function startJob(req: Request, res: TypedResponse<Job>) {
  const jobId = req.params.id as string;
  const authUserId = req.user?.id as string;
  const authUserRole = req.user?.role;

  // 1. Authorization Check: Only Providers can start jobs
  if (authUserRole !== "PROVIDER") {
    throw new AppError("Only providers are authorized to start jobs", 403);
  }

  // 2. Fetch the job to verify ownership and current status
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      service: {
        select: { providerId: true },
      },
    },
  });

  if (!job) {
    throw new AppError("Job not found", 404);
  }

  // 3. Ownership Check: Ensure this provider owns the service for this job
  if (job.service?.providerId !== authUserId) {
    throw new AppError("You are not authorized to start this job", 403);
  }

  // 4. Status Validation: Cannot start a job that isn't BOOKED
  // (e.g., prevents starting a COMPLETED, CANCELLED, or already IN_PROGRESS job)
  if (job.status !== "BOOKED") {
    throw new AppError(
      `Cannot start job with current status: ${job.status}`,
      400,
    );
  }

  // 5. Perform the update
  const updatedJob = await prisma.job.update({
    where: { id: jobId },
    data: { status: "IN_PROGRESS" },
    include: {
      customer: { select: { id: true, fullName: true } },
    },
  });

  // Create Notification for Customer
  sendNotification({
    type: "JOB",
    title: "Work has Started",
    message: `Your artisan has started working on: ${job.title}`,
    userId: job.customerId,
    io: req.io,
    severity: "SUCCESS",
  });

  res.json({
    success: true,
    data: updatedJob,
  });
}

/**
 * Controller to transition a job status from PENDING to CANCELLED (Inquiry Stage)
 */
export async function cancelJob(req: Request, res: TypedResponse<Job>) {
  const jobId = req.params.id as string;
  const authUserId = req.user?.id as string;

  // 1. Fetch the job to verify existence and participants
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      service: {
        select: { providerId: true, title: true },
      },
    },
  });

  if (!job) {
    throw new AppError("Job not found", 404);
  }

  // 2. Authorization Check: Either the Customer or the Provider can cancel an inquiry
  const isCustomer = job.customerId === authUserId;
  const isProvider = job.service?.providerId === authUserId;

  if (!isCustomer && !isProvider) {
    throw new AppError("You are not authorized to cancel this job", 403);
  }

  // 3. Status Validation: Only allow cancellation if it's still in the inquiry (PENDING) phase
  if (job.status !== "INQUIRY") {
    throw new AppError(
      `Cannot cancel inquiry with current status: ${job.status}. Use the formal cancellation process if already booked.`,
      400,
    );
  }

  // 4. Perform the update and notifications in a transaction
  // 5. Perform the update via Interactive Transaction
  const updatedJob = await prisma.$transaction(async (tx) => {
    // Update the Job
    const updated = await tx.job.update({
      where: { id: jobId },
      data: { status: "CANCELLED" },
      include: {
        customer: { select: { id: true, fullName: true } },
      },
    });

    // Since we already checked job.service existence in the Auth phase,
    // we can safely execute the notification creation here.
    if (job.service) {
      sendNotification({
        type: "JOB",
        title: "Inquiry Cancelled",
        message: isCustomer
          ? `The client cancelled their request for: ${job.title}`
          : `The artisan has declined your inquiry for: ${job.title}`,
        userId: isCustomer ? job.service.providerId : job.customerId,
        severity: "CRITICAL",
        io: req.io,
      });
    }

    // Whatever you return from this function is what the transaction returns
    return updated;
  });

  // 5. Success response
  res.json({
    success: true,
    data: updatedJob,
  });
}

/**
 * Controller to transition a job status from IN_PROGRESS to COMPLETED
 */
export async function completeJob(req: Request, res: TypedResponse<Job>) {
  const jobId = req.params.id as string;
  const authUserId = req.user?.id as string;
  const authUserRole = req.user?.role;

  // 1. Authorization Check: Only Providers can complete/charge jobs
  if (authUserRole !== "PROVIDER") {
    throw new AppError("Only providers are authorized to complete jobs", 403);
  }

  // 2. Fetch the job to verify ownership and current status
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      service: {
        select: { providerId: true },
      },
    },
  });

  if (!job) {
    throw new AppError("Job not found", 404);
  }

  // 3. Ownership Check: Ensure this provider is the one assigned to the job
  if (job.service?.providerId !== authUserId) {
    throw new AppError("You are not authorized to complete this job", 403);
  }

  // 4. Status Validation: A job can only be completed if it is currently IN_PROGRESS
  if (job.status !== "IN_PROGRESS") {
    throw new AppError(
      `Cannot complete job with current status: ${job.status}. Job must be in progress.`,
      400,
    );
  }

  // 5. Perform the update
  const updatedJob = await prisma.$transaction(async (tx) => {
    // Update Job Status
    const job = await tx.job.update({
      where: { id: jobId },
      data: { status: "COMPLETED" },
      include: {
        customer: { select: { id: true, fullName: true } },
      },
    });

    // Create Notification for Customer
    sendNotification({
      title: "Job Completed",
      message: `Work finished for "${job.title}". Please view the receipt and finalize payment.`,
      type: "JOB",
      severity: "SUCCESS",
      userId: job.customerId,
      io: req.io,
    });

    return job;
  });

  // 6. Optional: Trigger notifications (FCM)
  // notifyCustomer(job.customerId, "Work finished! Your artisan has sent the final invoice.");

  res.json({
    success: true,
    data: updatedJob,
  });
}
/**
 * Controller to transition a job status from COMPLETED to PAID
 */
export async function generatePaystackReference(
  req: Request,
  res: TypedResponse<{ authorization_url: string }>,
) {
  const jobId = req.params.id as string;
  const authUserId = req.user?.id as string;

  // 1. Authorization & Job Validation
  const user = await prisma.user.findUnique({
    where: { id: authUserId },
    select: {
      email: true,
    },
  });

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      service: {
        select: {
          provider: {
            select: {
              wallet: true,
            },
          },
        },
      },
      status: true,
      customerId: true,
      priceKobo: true,
      paymentStatus: true,
    },
  });

  if (!user || !job) throw new AppError("Not found", 404);
  if (job.customerId !== authUserId) throw new AppError("Unauthorized", 403);
  if (job.status !== "COMPLETED")
    throw new AppError("Job must be completed", 400);
  if (!job.priceKobo) throw new AppError("Price not set", 400);
  if (job.paymentStatus === "SUCCESS") {
    throw new AppError("This job has already been paid for", 400);
  }

  const jobProviderWallet = job.service?.provider.wallet;

  if (!jobProviderWallet || !jobProviderWallet.paystackSubaccountCode) {
    throw new AppError(
      "Provider does not have a valid payout account. Cannot process payment.",
      400,
    );
  }

  // 2. Initialize Transaction with Paystack
  // 1. Construct the base URL
  const baseUrl = new URL(req.url, `${req.protocol}://${req.get("host")}`)
    .origin;

  // 2. Build the callback URL cleanly
  const callbackUrl = new URL(`${baseUrl}/api/paystack/callback`);
  callbackUrl.searchParams.append("jobId", jobId);

  // Use callbackUrl.toString() when sending to Paystack

  const response = await fetch(
    "https://api.paystack.co/transaction/initialize",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: job.priceKobo,
        callback_url: callbackUrl,
        subaccount: jobProviderWallet.paystackSubaccountCode,
      }),
    },
  );

  const result: {
    status: true;
    message: string;
    data: {
      authorization_url: string;
      access_code: string;
      reference: string;
    };
  } = await response.json();

  if (!result.status) {
    throw new AppError("Failed to initialize payment", 400);
  }

  // 3. Save the reference to the database
  await prisma.job.update({
    where: { id: jobId },
    data: {
      paymentReference: result.data.reference,
      paymentStatus: "PENDING",
    },
  });

  // 4. Return the URL to the frontend
  res.json({
    success: true,
    data: { authorization_url: result.data.authorization_url },
  });
}

export async function verifyPaymentStatus(
  req: Request,
  res: TypedResponse<boolean>,
) {
  const jobId = req.params.id as string;
  const authUserId = req.user?.id as string;

  const user = await prisma.user.findUnique({
    where: { id: authUserId },
    select: { email: true },
  });

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { service: true },
  });

  if (!user || !job) throw new AppError("Not found", 404);
  if (job.customerId !== authUserId) throw new AppError("Unauthorized", 403);

  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${job.paymentReference}`,
    {
      headers: {
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    },
  );

  const { data, status } = await response.json();

  if (status && data.status) {
    return res.json({
      success: true,
      data: true,
    });
  }

  res.status(400).json({
    success: false,
    message:
      "Payment verification failed: The job has not been marked as paid. Please complete the payment.",
  });
}
