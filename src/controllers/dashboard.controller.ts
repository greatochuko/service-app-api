import { Request } from "express";
import { TypedResponse } from "../types/express";
import { DashboardResponse } from "../types/dashboard.type";
import { AuthTokenPayload } from "../utils/jwt";
import { AppError } from "../utils/AppError";
import { prisma } from "../config/prisma";

export async function getDashboardStats(
  req: Request,
  res: TypedResponse<DashboardResponse>,
) {
  const authUser = req.user as AuthTokenPayload;

  if (authUser.role !== "PROVIDER") {
    throw new AppError("Access denied. Provider role required.", 403);
  }

  // 1. Get the user and their first service ID in one hit
  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      rating: true,
      services: { take: 1, select: { id: true } },
    },
  });

  // if (!user || user.services.length === 0) {
  //   throw new AppError("No service profile found.", 404);
  // }

  const serviceId = user?.services[0]?.id || "";

  // 2. Execute remaining queries in parallel to avoid "waterfall" blocking
  const [activeJob, totalJobs, totalEarnings, pendingCount] = await Promise.all(
    [
      // Get the most recent active job
      prisma.job.findFirst({
        where: { serviceId, status: "INQUIRY" },
        orderBy: { createdAt: "asc" },
        include: { customer: { include: { locations: true } } },
      }),

      prisma.job.aggregate({
        where: { serviceId },
        _count: { _all: true },
      }),

      prisma.job.aggregate({
        where: { serviceId, status: "PAID" },
        _sum: { priceKobo: true },
      }),

      // Count specific statuses
      prisma.job.count({
        where: { serviceId, status: { in: ["INQUIRY", "BOOKED"] } },
      }),
    ],
  );

  res.json({
    success: true,
    data: {
      activeJob,
      metadata: {
        pendingRequestsCount: pendingCount,
      },
      stats: {
        averageRating: user?.rating ?? 5.0,
        totalEarnings: totalEarnings._sum.priceKobo || 0,
        totalJobs: totalJobs._count._all,
      },
    },
  });
}
