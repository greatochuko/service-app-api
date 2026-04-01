import { prisma } from "../config/prisma";
import { TypedRequest, TypedResponse } from "../types/express";
import { User } from "../generated/prisma/client";
import {
  SaveAvailabilityBody,
  Update2faBody,
  UpdateAvailabilityBody,
  UpdateProfileBody,
  UpdateRecoveryEmailBody,
} from "../validators/user.validator";
import { Request } from "express";

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

  const { passwordHash: _, ...userWithoutPassword } = updatedUser;

  res.json({ data: userWithoutPassword as User, success: true });
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
      avatarUrl: req.body.avatarUrl,
      bio: req.body.bio,
    },
  });

  const { passwordHash: _, ...userWithoutPassword } = updatedUser;

  res.json({ data: userWithoutPassword as User, success: true });
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

  const { passwordHash: _, ...userWithoutPassword } = updatedUser;

  res.json({ data: userWithoutPassword as User, success: true });
}

export async function updateRecoveryEmail(
  req: TypedRequest<UpdateRecoveryEmailBody>,
  res: TypedResponse<User>,
) {
  const userId = req.user?.id as string;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      email: req.body.email,
    },
  });

  const { passwordHash: _, ...userWithoutPassword } = updatedUser;

  res.json({ data: userWithoutPassword as User, success: true });
}

export async function update2fa(
  req: TypedRequest<Update2faBody>,
  res: TypedResponse<User>,
) {
  const userId = req.user?.id as string;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorAuthEnabled: req.body.twoFactorAuthEnabled,
    },
  });

  const { passwordHash: _, ...userWithoutPassword } = updatedUser;

  res.json({ data: userWithoutPassword as User, success: true });
}

export async function deleteAccount(req: Request, res: TypedResponse<User>) {
  const userId = req.user?.id as string;

  const deletedUser = await prisma.user.delete({
    where: { id: userId },
  });

  const { passwordHash: _, ...userWithoutPassword } = deletedUser;

  res.json({ data: userWithoutPassword as User, success: true });
}
