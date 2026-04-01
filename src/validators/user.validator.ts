import { z } from "zod";

// 1. Define the schema for a single day's values
const DayScheduleSchema = z
  .object({
    enabled: z.boolean(),
    start: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid start time"),
    end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid end time"),
  })
  .refine(
    (data) => {
      if (!data.enabled) return true;
      return data.start < data.end;
    },
    {
      message: "End time must be after start time",
      path: ["end"],
    },
  );

// 2. Define the availability as an OBJECT with explicit keys
// Using z.object instead of z.record fixes the "not assignable" error
export const saveAvailabilitySchema = z.object({
  availability: z.object({
    Monday: DayScheduleSchema,
    Tuesday: DayScheduleSchema,
    Wednesday: DayScheduleSchema,
    Thursday: DayScheduleSchema,
    Friday: DayScheduleSchema,
    Saturday: DayScheduleSchema,
    Sunday: DayScheduleSchema,
  }),
});

// 3. Extract the Type
export type SaveAvailabilityBody = z.infer<typeof saveAvailabilitySchema>;

export const updateProfileSchema = z.object({
  fullName: z.string().min(3, "Full name is required"),
  avatarUrl: z.url("Invalid URL").optional(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
});

export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;

export const updateAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});

export type UpdateAvailabilityBody = z.infer<typeof updateAvailabilitySchema>;

export const updateRecoveryEmailSchema = z.object({
  email: z.email("Invalid email address"),
  otp: z.string().length(4, "OTP must be 4 characters long"),
});

export type UpdateRecoveryEmailBody = z.infer<typeof updateRecoveryEmailSchema>;
