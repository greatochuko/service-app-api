import { prisma } from "../config/prisma";
import { Service } from "../generated/prisma/client";
import { TypedRequest, TypedResponse } from "../types/express";
import { AppError } from "../utils/AppError";
import { CreateServiceBody } from "../validators/service.validator";

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

  const { title, category, description, features, image } = req.body;

  const newService = await prisma.service.create({
    data: {
      title,
      category,
      description,
      features,
      image,
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

  const { title, category, description, features, image } = req.body;

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
    },
  });

  res.status(201).json({
    success: true,
    data: updatedService,
  });
}
