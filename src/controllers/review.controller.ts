import { Request } from "express";
import { TypedRequest, TypedResponse } from "../types/express";
import { Review } from "../generated/prisma/client";
import { prisma } from "../config/prisma";
import { AddReviewBody } from "../validators/review.validator";
import { AppError } from "../utils/AppError";

export async function getProviderReviews(
  req: Request,
  res: TypedResponse<Review[]>,
) {
  const userId = req.user?.id as string;
  const serviceId = req.query.serviceId as string;

  const reviews = await prisma.review.findMany({
    where: { providerId: userId, ...(serviceId ? { serviceId } : {}) },
  });

  res.json({ success: true, data: reviews });
}

export async function addReview(
  req: TypedRequest<AddReviewBody>,
  res: TypedResponse<Review>,
) {
  const userId = req.user?.id as string;
  const reviewId = req.params.id as string | undefined;

  const { comment, rating, jobId } = req.body;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { service: { select: { providerId: true } }, serviceId: true },
  });

  if (!job || !job.service) throw new AppError("Invalid Job");

  const newReview = await prisma.review.upsert({
    where: { id: reviewId || "" },
    update: { comment, rating },
    create: {
      comment,
      rating,
      authorId: userId,
      jobId,
      providerId: job.service.providerId,
      serviceId: job.serviceId,
    },
  });

  const allProviderReviews = await prisma.review.findMany({
    where: { providerId: job.service.providerId },
    select: { rating: true },
  });

  await prisma.user.update({
    where: { id: job.service.providerId },
    data: {
      rating: allProviderReviews.reduce((acc, curr) => acc + curr.rating, 0),
      totalReviews: allProviderReviews.length,
    },
  });

  res.json({ success: true, data: newReview });
}
