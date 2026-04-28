import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { UserRole } from "../generated/prisma/client";
import { env } from "../config/env";

const secret = env.JWT_SECRET!;

export type AuthTokenPayload = {
  id: string;
  role: UserRole;
};

export const generateToken = (
  payload: AuthTokenPayload,
  expiresIn: SignOptions["expiresIn"] = "7d",
) => {
  return jwt.sign(payload, secret, {
    expiresIn: expiresIn,
  });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, secret) as JwtPayload & AuthTokenPayload;
};
