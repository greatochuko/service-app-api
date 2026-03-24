import jwt, { JwtPayload } from "jsonwebtoken";
import { UserRole } from "../generated/prisma/client";
import { env } from "../config/env";

const secret = env.JWT_SECRET!;

export type AuthTokenPayload = {
  id: string;
  role: UserRole;
};

export const generateToken = (payload: AuthTokenPayload) => {
  return jwt.sign(payload, secret, {
    expiresIn: "7d",
  });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, secret) as JwtPayload & AuthTokenPayload;
};
