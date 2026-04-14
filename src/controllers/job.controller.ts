import { Request } from "express";
import { TypedResponse } from "../types/express";
import { Job } from "../generated/prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";

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
    });
  }

  res.json({ success: true, data: jobs });
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
  const [updatedJob] = await prisma.$transaction([
    // Update Job Status
    prisma.job.update({
      where: { id: jobId },
      data: { status: "IN_PROGRESS" },
      include: {
        customer: { select: { id: true, fullName: true } },
      },
    }),
    // Create Notification for Customer
    prisma.notification.create({
      data: {
        type: "JOB",
        title: "Work has Started",
        message: `Your artisan has started working on: ${job.title}`,
        userId: job.customerId, // The recipient
      },
    }),
  ]);

  // 6. Optional: Trigger notifications here (Socket.io / FCM)
  // notifyCustomer(job.customerId, "Artisan has started your job!");

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
      await tx.notification.create({
        data: {
          type: "JOB",
          title: "Inquiry Cancelled",
          message: isCustomer
            ? `The client cancelled their request for: ${job.title}`
            : `The artisan has declined your inquiry for: ${job.title}`,
          userId: isCustomer ? job.service.providerId : job.customerId,
        },
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
  const [updatedJob] = await prisma.$transaction([
    // Update Job Status
    prisma.job.update({
      where: { id: jobId },
      data: { status: "COMPLETED" },
      include: {
        customer: { select: { id: true, fullName: true } },
      },
    }),
    // Create Notification for Customer
    prisma.notification.create({
      data: {
        type: "JOB",
        title: "Job Completed",
        message: `Work finished for "${job.title}". Please view the receipt and finalize payment.`,
        userId: job.customerId, // The recipient
      },
    }),
  ]);

  // 6. Optional: Trigger notifications (FCM)
  // notifyCustomer(job.customerId, "Work finished! Your artisan has sent the final invoice.");

  res.json({
    success: true,
    data: updatedJob,
  });
}
