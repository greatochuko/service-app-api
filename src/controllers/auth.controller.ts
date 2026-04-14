import {
  ChangePasswordBody,
  LoginBody,
  SignupBody,
} from "../validators/auth.validator";
import { prisma } from "../config/prisma";
import { comparePassword, hashPassword } from "../utils/password";
import { TypedRequest, TypedResponse } from "../types/express";
import { Service, User } from "../generated/prisma/client";
import { generateToken } from "../utils/jwt";
import { AppError } from "../utils/AppError";
import { Request } from "express";

type AuthUserReturnType = User & { services: Service[] };

export async function signup(
  req: TypedRequest<SignupBody>,
  res: TypedResponse<{ token: string; user: AuthUserReturnType }>,
) {
  const { accountType, email, fullName, location, password, phoneNumber } =
    req.body;

  const userExists = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { phoneNumber }],
    },
    select: { id: true },
  });

  if (userExists) throw new AppError("User with email already exists", 409);

  const passwordHash = await hashPassword(password);

  const newUser = await prisma.user.create({
    data: {
      fullName,
      passwordHash,
      phoneNumber,
      email,
      locations: { create: location },
      role: accountType,
    },
    include: { services: { take: 1 } },
  });

  const token = generateToken({ id: newUser.id, role: newUser.role });

  const { passwordHash: _, ...userWithoutPassword } = newUser;

  res.status(201).json({
    success: true,
    data: {
      token,
      user: userWithoutPassword as AuthUserReturnType,
    },
  });
}

export async function login(
  req: TypedRequest<LoginBody>,
  res: TypedResponse<{ token: string; user: AuthUserReturnType }>,
) {
  const { password, phoneNumber } = req.body;

  const user = await prisma.user.findFirst({
    where: { phoneNumber: { endsWith: phoneNumber } },
    include: { services: { take: 1 } },
  });

  if (!user) throw new AppError("Invalid Email and password combination", 401);

  const passwordIsCorrect = await comparePassword(password, user.passwordHash);

  if (!passwordIsCorrect)
    throw new AppError("Invalid Email and password combination", 401);

  const token = generateToken({ id: user.id, role: user.role });

  const { passwordHash: _, ...userWithoutPassword } = user;

  res.status(201).json({
    success: true,
    data: { token, user: userWithoutPassword as AuthUserReturnType },
  });
}

export async function getSession(
  req: Request,
  res: TypedResponse<AuthUserReturnType>,
) {
  const user = await prisma.user.findUnique({
    where: { id: req.user?.id },
    include: { services: { take: 1 } },
  });

  if (!user) throw new AppError("Unauthenticated", 401);

  const { passwordHash: _, ...userWithoutPassword } = user;

  res.json({ success: true, data: userWithoutPassword as AuthUserReturnType });
}

export async function changePassword(
  req: TypedRequest<ChangePasswordBody>,
  res: TypedResponse<User>,
) {
  const { oldPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({
    where: { id: req.user?.id },
  });

  if (!user) throw new AppError("Unauthenticated", 401);

  const passwordIsCorrect = await comparePassword(
    oldPassword,
    user.passwordHash,
  );

  if (!passwordIsCorrect) {
    throw new AppError("The current password you entered is incorrect.", 403);
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.user?.id },
    data: {
      passwordHash: await hashPassword(newPassword),
      passwordLastChangedAt: new Date(),
    },
  });

  const { passwordHash: _, ...userWithoutPassword } = updatedUser;

  res
    .status(201)
    .json({ success: true, data: userWithoutPassword as unknown as User });
}
