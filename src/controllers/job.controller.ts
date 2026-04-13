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
  const updatedJob = await prisma.job.update({
    where: { id: jobId },
    data: {
      status: "IN_PROGRESS",
      // Optional: updatedAt is usually handled by Prisma,
      // but you might want to track a specific 'startedAt' timestamp
      // startedAt: new Date(),
    },
    include: {
      customer: {
        select: {
          id: true,
          fullName: true,
          locations: { select: { address: true } },
        },
      },
      chat: { select: { id: true } },
    },
  });

  // 6. Optional: Trigger notifications here (Socket.io / FCM)
  // notifyCustomer(job.customerId, "Artisan has started your job!");

  res.json({
    success: true,
    data: updatedJob,
  });
}
