import { Request } from "express";
import { TypedRequest, TypedResponse } from "../types/express";
import { Location } from "../generated/prisma/client";
import { prisma } from "../config/prisma";
import { CreateAddressBody } from "../validators/address.validator";

export async function getSavedAddresses(
  req: Request,
  res: TypedResponse<Location[]>,
) {
  const userId = req.user?.id;

  const savedAddresses = await prisma.location.findMany({ where: { userId } });

  res.json({ success: true, data: savedAddresses });
}

export async function createAddress(
  req: TypedRequest<CreateAddressBody>,
  res: TypedResponse<Location>,
) {
  const userId = req.user?.id;

  const { address, isDefault, label, latitude, longitude } = req.body;

  const newAddress = await prisma.$transaction((tx) => {
    if (isDefault) {
      tx.location.updateMany({ where: { userId }, data: { isDefault: false } });
    }

    const newAddress = tx.location.create({
      data: {
        address,
        isDefault,
        label,
        latitude,
        longitude,
        userId,
      },
    });

    return newAddress;
  });

  res.json({ success: true, data: newAddress });
}

export async function deleteSavedAddress(
  req: Request,
  res: TypedResponse<Location>,
) {
  const userId = req.user?.id;
  const addressId = req.params.id as string;

  const deletedAddress = await prisma.location.delete({
    where: { id: addressId, userId },
  });

  res.json({ success: true, data: deletedAddress });
}
