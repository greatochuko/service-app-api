import { Request } from "express";
import { TypedResponse } from "../types/express";
import { Notification } from "../generated/prisma/client";
import { prisma } from "../config/prisma";

export async function getNotifications(
  req: Request,
  res: TypedResponse<Notification[]>,
) {
  const userId = req.user?.id as string;

  const notifications = await prisma.notification.findMany({
    where: { userId },
  });

  res.json({ success: true, data: notifications });
}
