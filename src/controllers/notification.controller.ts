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
    orderBy: { createdAt: "desc" },
  });

  res.json({ success: true, data: notifications });
}

export async function markNotificationsAsRead(
  req: Request,
  res: TypedResponse<boolean>,
) {
  const userId = req.user?.id as string;

  await prisma.notification.updateMany({
    where: { userId },
    data: { read: true },
  });

  res.json({ success: true, data: true });
}
