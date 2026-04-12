import { Request } from "express";
import { TypedResponse } from "../types/express";
import { Job } from "../generated/prisma/client";
import { prisma } from "../config/prisma";

export async function getJobs(req: Request, res: TypedResponse<Job[]>) {
  const authUserId = req.user?.id as string;

  const jobs = await prisma.job.findMany({
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
            },
          },
        },
      },
    },
  });

  res.json({ success: true, data: jobs });
}
