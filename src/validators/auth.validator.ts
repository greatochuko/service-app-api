import z from "zod";
import { UserRole } from "../generated/prisma/enums";

const locationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  address: z.string(),
});

export const signupSchema = z.object({
  accountType: z.enum(UserRole),
  email: z.email("Please enter a valid email").optional(),
  phoneNumber: z.string(),
  fullName: z.string(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  location: locationSchema,
});

export type SignupBody = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  phoneNumber: z
    .string()
    .transform((val) => {
      // 1. Remove everything that isn't a number (+, -, spaces)
      const digitsOnly = val.replace(/\D/g, "");
      // 2. Take the last 10 digits to support both 080... and 80...
      return digitsOnly.slice(-10);
    })
    .refine((val) => val.length === 10, {
      message: "Please enter a valid Nigerian phone number",
    }),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type LoginBody = z.infer<typeof loginSchema>;

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(8, "Password must be at least 8 characters"),
  newPassword: z.string().min(8, "New Password must be at least 8 characters"),
});

export type ChangePasswordBody = z.infer<typeof changePasswordSchema>;
