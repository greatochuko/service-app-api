import { LoginBody, SignupBody } from "../validators/auth.validator";
import { prisma } from "../config/prisma";
import { comparePassword, hashPassword } from "../utils/password";
import { TypedRequest, TypedResponse } from "../types/express";
import { User } from "../generated/prisma/client";
import { generateToken } from "../utils/jwt";
import { AppError } from "../utils/AppError";
import { Request } from "express";

export async function signup(
  req: TypedRequest<SignupBody>,
  res: TypedResponse<{ token: string; user: User }>,
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
  });

  const token = generateToken({ id: newUser.id, role: newUser.role });

  const { passwordHash: _, ...userWithoutPassword } = newUser;

  res.status(201).json({
    success: true,
    data: { token, user: userWithoutPassword as User },
  });
}

export async function login(
  req: TypedRequest<LoginBody>,
  res: TypedResponse<{ token: string; user: User }>,
) {
  const { password, phoneNumber } = req.body;

  const user = await prisma.user.findFirst({
    where: { phoneNumber: { endsWith: phoneNumber } },
  });

  if (!user) throw new AppError("Invalid Email and password combination", 401);

  const passwordIsCorrect = await comparePassword(password, user.passwordHash);

  if (!passwordIsCorrect)
    throw new AppError("Invalid Email and password combination", 401);

  const token = generateToken({ id: user.id, role: user.role });

  const { passwordHash: _, ...userWithoutPassword } = user;

  res.status(201).json({
    success: true,
    data: { token, user: userWithoutPassword as User },
  });
}

export async function getSession(req: Request, res: TypedResponse<User>) {
  const user = await prisma.user.findUnique({
    where: { id: req.user?.id },
  });

  if (!user) throw new AppError("Unauthenticated", 401);

  const { passwordHash: _, ...userWithoutPassword } = user;

  res.status(201).json({ success: true, data: userWithoutPassword as User });
}
