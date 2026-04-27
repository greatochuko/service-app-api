import { Request } from "express";
import { prisma } from "../config/prisma";
import { TypedRequest, TypedResponse } from "../types/express";
import { Chat, Message, UserRole } from "../generated/prisma/client";
import { SendMessageBody, SendQuoteBody } from "../validators/chat.validator";
import { AppError } from "../utils/AppError";
import { onlineUsers } from "../server";

export async function getChats(
  req: Request,
  res: TypedResponse<{ chats: Chat[]; onlineUsers: string[] }>,
) {
  const authUserId = req.user?.id as string;
  const authUserRole = req.user?.role as UserRole;

  let chats: Chat[];

  if (authUserRole === "PROVIDER") {
    chats = await prisma.chat.findMany({
      where: { providerId: authUserId },
      include: {
        customer: {
          select: {
            fullName: true,
            avatarUrl: true,
            id: true,
            phoneNumber: true,
            locations: { select: { address: true } },
          },
        },
        job: { select: { title: true, id: true, status: true } },
        messages: true,
        quote: true,
        service: { select: { image: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  } else {
    chats = await prisma.chat.findMany({
      where: { customerId: authUserId },
      include: {
        provider: {
          select: {
            fullName: true,
            avatarUrl: true,
            id: true,
            phoneNumber: true,
            locations: { select: { address: true } },
          },
        },
        job: { select: { title: true, id: true, status: true } },
        messages: true,
        customer: {
          select: { id: true, locations: { select: { address: true } } },
        },
        quote: true,
        service: { select: { image: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  res.json({
    success: true,
    data: { chats, onlineUsers: Array.from(onlineUsers.keys()) },
  });
}

export async function getMessages(req: Request, res: TypedResponse<Message[]>) {
  const chatId = req.params.id as string;

  const messages = await prisma.message.findMany({
    where: { chatId },
  });

  res.json({ success: true, data: messages });
}

export async function markMessagesAsRead(
  req: Request,
  res: TypedResponse<boolean>,
) {
  const authUserId = req.user?.id as string;
  const chatId = req.params.id as string;

  await prisma.message.updateMany({
    where: { chatId, receiverId: authUserId },
    data: {
      isRead: true,
    },
  });

  res.json({ success: true, data: true });
}

export async function sendMessage(
  req: TypedRequest<SendMessageBody>,
  res: TypedResponse<Message>,
) {
  const authUserId = req.user?.id as string;
  const chatId = req.params.id as string;

  const { content, receiverId } = req.body;

  if (!content || content.trim() === "") {
    return res
      .status(400)
      .json({ success: false, message: "Message content is required" });
  }

  const chat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      OR: [{ customerId: authUserId }, { providerId: authUserId }],
    },
  });

  if (!chat) {
    return res.status(404).json({ success: false, message: "Chat not found" });
  }

  // logic for quote creation
  const message = await prisma.$transaction(async (tx) => {
    const newMsg = await tx.message.create({
      data: {
        content: content.trim(),
        chatId: chatId,
        senderId: authUserId,
        receiverId,
      },
    });

    await tx.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    return newMsg;
  });

  if (req.io) {
    req.io.to(receiverId).emit("message_received", message);
  }

  res.status(201).json({ success: true, data: message });
}

export async function sendQuote(
  req: TypedRequest<SendQuoteBody>,
  res: TypedResponse<Message>,
) {
  const authUserId = req.user?.id as string;
  const chatId = req.params.id as string;

  const { price, note } = req.body;

  const chat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      OR: [{ customerId: authUserId }, { providerId: authUserId }],
    },
    select: {
      customerId: true,
      providerId: true,
      job: { select: { status: true } },
    },
  });

  if (!chat) {
    throw new AppError("Chat not found", 404);
  }

  if (chat.job.status !== "INQUIRY") {
    throw new AppError(
      `This action is only allowed during the job inquiry stage. Current status: ${chat.job.status}`,
      400,
    );
  }

  const receiverId = chat.customerId;

  // logic for quote creation
  const { newMsg, quote } = await prisma.$transaction(async (tx) => {
    // 1. If it's a quote, handle the Quote model creation

    if (chat.providerId !== authUserId) {
      throw new Error("Only providers can send quotes");
    }

    const quote = await tx.quote.upsert({
      where: { chatId: chatId },
      update: {
        price,
        note: note,
        status: "PENDING",
      },
      create: {
        chatId: chatId,
        providerId: authUserId,
        price,
        note: note,
        status: "PENDING",
      },
    });

    const messageText = `📝 Quote Sent: $${price}${note ? `\nNote: ${note}` : ""}`;

    const newMsg = await tx.message.create({
      data: {
        content: messageText,
        chatId: chatId,
        senderId: authUserId,
        receiverId,
        type: "SYSTEM",
      },
    });

    // 3. Update the chat's updatedAt field
    await tx.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    return { newMsg, quote };
  });

  if (req.io) {
    req.io.to(receiverId).emit("message_received", newMsg);

    req.io.to(receiverId).emit("new_quote", quote);
  }

  res.status(201).json({ success: true, data: newMsg });
}

export async function declineQuote(req: Request, res: TypedResponse<Message>) {
  const authUserId = req.user?.id as string;
  const chatId = req.params.id as string;

  const chat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      OR: [{ customerId: authUserId }, { providerId: authUserId }],
    },
  });

  if (!chat) {
    return res.status(404).json({ success: false, message: "Chat not found" });
  }

  const receiverId = chat.providerId;

  // logic for quote creation
  const { newMsg, quote } = await prisma.$transaction(async (tx) => {
    // 1. If it's a quote, handle the Quote model creation

    if (chat.customerId !== authUserId) {
      throw new Error("Only customers can decline quotes");
    }

    const quote = await tx.quote.update({
      where: { chatId: chatId },
      data: {
        status: "REJECTED",
      },
    });

    const messageText = "❌ Quote Declined";

    const newMsg = await tx.message.create({
      data: {
        content: messageText,
        chatId: chatId,
        senderId: authUserId,
        receiverId,
        type: "SYSTEM",
      },
    });

    // 3. Update the chat's updatedAt field
    await tx.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    return { newMsg, quote };
  });

  if (req.io) {
    req.io.to(receiverId).emit("message_received", newMsg);

    req.io.to(receiverId).emit("quote_declined", quote);
  }

  res.status(201).json({ success: true, data: newMsg });
}

export async function acceptQuote(req: Request, res: TypedResponse<Message>) {
  const authUserId = req.user?.id as string;
  const chatId = req.params.id as string;

  const chat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      OR: [{ customerId: authUserId }, { providerId: authUserId }],
    },
  });

  if (!chat) {
    return res.status(404).json({ success: false, message: "Chat not found" });
  }

  const receiverId = chat.providerId;

  // logic for quote creation
  const { newMsg, quote } = await prisma.$transaction(async (tx) => {
    // 1. If it's a quote, handle the Quote model creation

    if (chat.customerId !== authUserId) {
      throw new Error("Only customers can accept quotes");
    }

    const quote = await tx.quote.update({
      where: { chatId: chatId },
      data: {
        status: "ACCEPTED",
      },
    });

    const messageText = "✅ Quote Accepted";

    const newMsg = await tx.message.create({
      data: {
        content: messageText,
        chatId: chatId,
        senderId: authUserId,
        receiverId,
        type: "SYSTEM",
      },
    });

    // 3. Update the chat's updatedAt field
    await tx.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    await tx.job.update({
      where: { id: chat.jobId },
      data: { status: "BOOKED", price: quote.price },
    });

    return { newMsg, quote };
  });

  if (req.io) {
    req.io.to(receiverId).emit("message_received", newMsg);

    req.io.to(receiverId).emit("quote_accepted", quote);
  }

  res.status(201).json({ success: true, data: newMsg });
}
