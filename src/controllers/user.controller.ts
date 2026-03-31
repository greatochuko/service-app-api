import { prisma } from "../config/prisma";
import { TypedRequest, TypedResponse } from "../types/express";
import { User } from "../generated/prisma/client";
import { SaveAvailabilityBody } from "../validators/user.validator";

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
