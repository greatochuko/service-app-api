import { Server } from "socket.io";
import { prisma } from "../config/prisma";
import { NotificationType } from "../generated/prisma/enums";
import { logger } from "../utils/logger";

export async function sendNotification({
  type,
  title,
  message,
  userId,
  io,
}: {
  type: NotificationType;
  title: string;
  message: string;
  userId: string;
  io?: Server;
}) {
  try {
    const notification = await prisma.notification.create({
      data: {
        type,
        title,
        message,
        userId,
      },
    });

    logger.info(
      `Notification created in DB: ${notification.id} for User: ${userId}`,
    );

    if (io) {
      io.to(userId).emit("new_notification", notification);
    } else {
      logger.warn(
        `Notification ${notification.id} created but skip-emitted (io instance missing)`,
      );
    }

    return notification;
  } catch (error) {
    logger.error(
      `Failed to send notification to User: ${userId}. Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error; // Rethrow so the calling function knows the notification failed
  }
}
