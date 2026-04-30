import z from "zod";
import { UserRole } from "../generated/prisma/enums";

const locationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  address: z.string(),
});

export const signupSchema = z.object({
  userRole: z.enum(UserRole),
  email: z.email("Please enter a valid email"),
  phoneNumber: z.string().optional(),
  fullName: z.string(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  location: locationSchema,
});

export type SignupBody = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.email(),
  password: z.string(),
});

export type LoginBody = z.infer<typeof loginSchema>;

export const sendOtpSchema = z.object({
  email: z.email(),
});

export type SendOtpBody = z.infer<typeof sendOtpSchema>;

export const verifyOtpSchema = z.object({
  email: z.email(),
  code: z.string(),
});

export type VerifyOtpBody = z.infer<typeof verifyOtpSchema>;

export const changePasswordSchema = z.object({
  oldPassword: z.string(),
  newPassword: z.string().min(8, "New Password must be at least 8 characters"),
});

export type ChangePasswordBody = z.infer<typeof changePasswordSchema>;

export const resetPasswordSchema = z.object({
  email: z.email(),
  newPassword: z.string().min(8, "New Password must be at least 8 characters"),
});

export type ResetPasswordBody = z.infer<typeof resetPasswordSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email(),
});

export type ForgotPasswordBody = z.infer<typeof forgotPasswordSchema>;
