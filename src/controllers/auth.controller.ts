import {
  ChangePasswordBody,
  LoginBody,
  SendOtpBody,
  SignupBody,
  VerifyOtpBody,
} from "../validators/auth.validator";
import { prisma } from "../config/prisma";
import { comparePassword, hashPassword } from "../utils/password";
import { TypedRequest, TypedResponse } from "../types/express";
import { Location, Service, User } from "../generated/prisma/client";
import { generateToken } from "../utils/jwt";
import { AppError } from "../utils/AppError";
import { Request } from "express";
import { Resend } from "resend";
import bcrypt from "bcryptjs";
import { getOtpEmailTemplate } from "../emails/otpEmailTemplate";
import { env } from "../config/env";
import { logger } from "../utils/logger";

type AuthUserReturnType = User & { services: Service[]; locations: Location[] };

const resend = new Resend(env.RESEND_API_KEY);

export async function signup(
  req: TypedRequest<SignupBody>,
  res: TypedResponse<{
    token: string;
    biometricToken: string;
    user: AuthUserReturnType;
  }>,
) {
  const { accountType, email, fullName, location, password, phoneNumber } =
    req.body;

  const userExists = await prisma.user.findFirst({
    where: {
      email,
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
  const biometricToken = generateToken(
    { id: newUser.id, role: newUser.role },
    "30d",
  );

  const { passwordHash: _, ...userWithoutPassword } = newUser;

  res.status(201).json({
    success: true,
    data: {
      token,
      biometricToken,
      user: userWithoutPassword as AuthUserReturnType,
    },
  });
}

export const sendOtp = async (
  req: TypedRequest<SendOtpBody>,
  res: TypedResponse<boolean>,
) => {
  const { email } = req.body;

  const rawCode = Math.floor(10000 + Math.random() * 90000).toString();
  const hashedCode = await bcrypt.hash(rawCode, 10);

  // 2. Save to DB
  await prisma.otp.create({
    data: {
      identifier: email,
      code: hashedCode,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    },
  });

  // 3. Send via Resend
  const { data, error } = await resend.emails.send({
    from: "ServiceApp <hello@greatochuko.com>", // Use your verified domain
    to: email,
    subject: "Your Verification Code",
    html: getOtpEmailTemplate(rawCode),
  });

  if (!data) throw new AppError(error.message);

  logger.info("OTP sent successfully");

  res.json({ success: true, data: true });
};

export const verifyOtp = async (
  req: TypedRequest<VerifyOtpBody>,
  res: TypedResponse<boolean>,
) => {
  const { email, code } = req.body;

  const otpRecord = await prisma.otp.findFirst({
    where: {
      identifier: email,
      isUsed: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otpRecord) {
    throw new AppError("Invalid or expired OTP");
  }

  // 2. Compare the provided code with the stored hash
  const isValid = await bcrypt.compare(code, otpRecord.code);

  if (!isValid) {
    throw new AppError("Incorrect code");
  }

  // 3. Mark as used within a transaction
  await prisma.otp.update({
    where: { id: otpRecord.id },
    data: { isUsed: true },
  });

  return res.json({ success: true, data: true });
};

export async function refreshSession(
  req: Request,
  res: TypedResponse<{
    token: string;
    biometricToken: string;
    user: AuthUserReturnType;
  }>,
) {
  const user = await prisma.user.findUnique({
    where: { id: req.user?.id },
    include: {
      services: { take: 1 },
      locations: { select: { address: true } },
    },
  });

  if (!user) throw new AppError("Invalid Email and password combination", 401);

  const token = generateToken({ id: user.id, role: user.role });
  const biometricToken = generateToken({ id: user.id, role: user.role }, "30d");

  const { passwordHash: _, ...userWithoutPassword } = user;

  res.status(201).json({
    success: true,
    data: {
      token,
      biometricToken,
      user: userWithoutPassword as AuthUserReturnType,
    },
  });
}

export async function login(
  req: TypedRequest<LoginBody>,
  res: TypedResponse<{
    token: string;
    biometricToken: string;
    user: AuthUserReturnType;
  }>,
) {
  const { password, email } = req.body;

  const user = await prisma.user.findFirst({
    where: {
      email,
    },
    include: {
      services: { take: 1 },
      locations: { select: { address: true } },
    },
  });

  if (!user) throw new AppError("Invalid Email and password combination", 401);

  const passwordIsCorrect = await comparePassword(password, user.passwordHash);

  if (!passwordIsCorrect)
    throw new AppError("Invalid Email and password combination", 401);

  const token = generateToken({ id: user.id, role: user.role });
  const biometricToken = generateToken({ id: user.id, role: user.role }, "30d");

  const { passwordHash: _, ...userWithoutPassword } = user;

  res.status(201).json({
    success: true,
    data: {
      token,
      biometricToken,
      user: userWithoutPassword as AuthUserReturnType,
    },
  });
}

export async function getSession(
  req: Request,
  res: TypedResponse<AuthUserReturnType>,
) {
  const user = await prisma.user.findUnique({
    where: { id: req.user?.id },
    include: {
      services: { take: 1 },
      locations: { select: { address: true } },
    },
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
