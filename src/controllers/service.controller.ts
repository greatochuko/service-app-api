import { Request } from "express";
import { prisma } from "../config/prisma";
import { Job, Prisma, Service } from "../generated/prisma/client";
import { TypedRequest, TypedResponse } from "../types/express";
import { AppError } from "../utils/AppError";
import {
  CreateServiceBody,
  RequestServiceBody,
} from "../validators/service.validator";
import { logger } from "../utils/logger";

export async function searchServices(
  req: Request,
  res: TypedResponse<Service[]>,
) {
  try {
    const { query, lat, lng, category, minRating, sortBy } = req.query as {
      query: string;
      lat?: string;
      lng?: string;
      category?: string;
      minRating?: string;
      sortBy?: "distance" | "rating" | "newest";
    };

    const userLat = lat ? parseFloat(lat) : null;
    const userLng = lng ? parseFloat(lng) : null;
    const ratingFilter = minRating ? parseFloat(minRating) : null;

    // --- 1. Prisma Fallback ---
    if (userLat === null || userLng === null) {
      const services = await prisma.service.findMany({
        where: {
          AND: [
            {
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
                { category: { contains: query, mode: "insensitive" } },
                {
                  provider: {
                    fullName: { contains: query, mode: "insensitive" },
                  },
                },
              ],
            },
            category
              ? { category: { equals: category, mode: "insensitive" } }
              : {},
            ratingFilter ? { provider: { rating: { gte: ratingFilter } } } : {},
          ],
        },
        orderBy:
          sortBy === "rating"
            ? { provider: { rating: "desc" } }
            : sortBy === "newest"
              ? { createdAt: "desc" }
              : undefined,
        include: {
          provider: { select: { fullName: true, id: true, rating: true } },
        },
      });
      return res.json({ data: services, success: true });
    }

    // --- 2. Raw SQL Path ---
    const searchTerm = `%${query}%`;

    // Create the order clause using Prisma.raw
    let orderClause = Prisma.raw(`distance ASC`);
    if (sortBy === "rating") orderClause = Prisma.raw(`u.rating DESC`);
    if (sortBy === "newest") orderClause = Prisma.raw(`s."createdAt" DESC`);

    const services = await prisma.$queryRaw<Service[]>`
      SELECT 
        s.*,
        json_build_object(
          'id', u.id,
          'fullName', u."fullName",
          'rating', u.rating
        ) as provider,
        (
          6371 * acos(
            least(1, max(-1, 
              cos(radians(${userLat})) * cos(radians(l.latitude)) * cos(radians(l.longitude) - radians(${userLng})) + 
              sin(radians(${userLat})) * sin(radians(l.latitude))
            ))
          )
        ) AS distance
      FROM "Service" s
      JOIN "User" u ON s."providerId" = u.id
      LEFT JOIN "Location" l ON l."userId" = u.id
      WHERE 
        (s.title ILIKE ${searchTerm} OR 
         s.description ILIKE ${searchTerm} OR 
         s.category ILIKE ${searchTerm} OR
         u."fullName" ILIKE ${searchTerm}) 
        AND (${category ? true : false} = false OR s.category = ${category})
        AND (${ratingFilter !== null} = false OR u.rating >= ${ratingFilter})
      ORDER BY ${orderClause}
      LIMIT 50;
    `;

    return res.json({ data: services, success: true });
  } catch (error) {
    logger.error("Search Error: " + (error as Error).message);
    return res.status(500).json({ success: false, message: "Search failed" });
  }
}

export async function getTopServices(
  req: Request,
  res: TypedResponse<Service[]>,
) {
  const topServices = await prisma.service.findMany({
    include: {
      provider: { select: { fullName: true, id: true, rating: true } },
    },
    take: 6,
  });

  res.json({ data: topServices, success: true });
}

export async function getServiceById(
  req: Request,
  res: TypedResponse<Service>,
) {
  const serviceId = req.params.id as string;

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: {
      provider: {
        select: { fullName: true, id: true, rating: true, avatarUrl: true },
      },
      reviews: {
        include: {
          author: {
            select: { fullName: true, id: true, avatarUrl: true },
          },
        },
      },
    },
  });

  if (!service) throw new AppError("Invalid service ID: Service not found");

  res.json({ data: service, success: true });
}

export async function createService(
  req: TypedRequest<CreateServiceBody>,
  res: TypedResponse<Service>,
) {
  const authUserId = req.user?.id as string;

  const existingService = await prisma.service.findFirst({
    where: {
      providerId: authUserId,
    },
  });

  if (existingService) {
    throw new AppError(
      "You already have a service. Please update it instead.",
      400,
    );
  }

  const { title, category, description, features, image, gallery } = req.body;

  const newService = await prisma.service.create({
    data: {
      title,
      category,
      description,
      features,
      image,
      gallery,
      providerId: authUserId,
    },
  });

  res.status(201).json({
    success: true,
    data: newService,
  });
}

export async function updateService(
  req: TypedRequest<CreateServiceBody>,
  res: TypedResponse<Service>,
) {
  const authUserId = req.user?.id as string;
  const serviceId = req.params.id as string;

  const service = await prisma.service.findUnique({
    where: {
      id: serviceId,
    },
  });

  if (!service) {
    throw new AppError("Service not found", 404);
  }

  if (service.providerId !== authUserId) {
    throw new AppError("You are not authorized to update this service", 403);
  }

  const { title, category, description, features, image, gallery } = req.body;

  const updatedService = await prisma.service.update({
    where: {
      id: serviceId,
    },
    data: {
      title,
      category,
      description,
      features,
      image,
      gallery,
    },
  });

  res.status(201).json({
    success: true,
    data: updatedService,
  });
}

export async function requestService(
  req: TypedRequest<RequestServiceBody>,
  res: TypedResponse<Job>,
) {
  const authUserId = req.user?.id as string;
  const serviceId = req.params.id as string;

  const service = await prisma.service.findUnique({
    where: {
      id: serviceId,
    },
    select: { id: true, providerId: true },
  });

  if (!service) {
    throw new AppError("Service not found", 404);
  }

  const { description, title, images, urgency, budget } = req.body;

  const newJob = await prisma.job.create({
    data: {
      description,
      serviceId,
      title,
      images,
      customerId: authUserId,
      budget,
      urgency,
    },
  });

  prisma.notification
    .create({
      data: {
        message: `You have a new request: ${title}`,
        title: "New Job Request",
        type: "JOB",
        userId: service.providerId,
      },
    })
    .then(() => {
      logger.info(
        `Notification sent to provider ${service.providerId} for job ${newJob.id}`,
      );
    })
    .catch((err) => {
      logger.error(
        `Failed to send notification for job ${newJob.id}: ${err.message}`,
      );
    });

  res.status(201).json({
    success: true,
    data: newJob,
  });
}
