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
