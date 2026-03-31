import { prisma } from "../config/prisma";
import { TypedRequest, TypedResponse } from "../types/express";
import { User } from "../generated/prisma/client";
import {
  SaveAvailabilityBody,
  UpdateAvailabilityBody,
  UpdateProfileBody,
} from "../validators/user.validator";

export async function saveAvailability(
  req: TypedRequest<SaveAvailabilityBody>,
  res: TypedResponse<User>,
) {
  const userId = req.user?.id as string;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      availability: req.body.availability,
    },
  });

  res.json({ data: updatedUser, success: true });
}

export async function updateProfile(
  req: TypedRequest<UpdateProfileBody>,
  res: TypedResponse<User>,
) {
  const userId = req.user?.id as string;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      fullName: req.body.fullName,
      email: req.body.email,
      avatarUrl: req.body.avatarUrl,
      bio: req.body.bio,
    },
  });

  res.json({ data: updatedUser, success: true });
}

export async function updateAvailabilityStatus(
  req: TypedRequest<UpdateAvailabilityBody>,
  res: TypedResponse<User>,
) {
  const userId = req.user?.id as string;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      isAvailable: req.body.isAvailable,
    },
  });

  res.json({ data: updatedUser, success: true });
}
