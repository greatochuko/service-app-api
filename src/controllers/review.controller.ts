import { Request } from "express";
import { TypedResponse } from "../types/express";
import { Review } from "../generated/prisma/client";
import { prisma } from "../config/prisma";

export async function getProviderReviews(
  req: Request,
  res: TypedResponse<Review[]>,
) {
  const userId = req.user?.id as string;

  const reviews = await prisma.review.findMany({
    where: { providerId: userId },
  });

  res.json({ success: true, data: reviews });
}
