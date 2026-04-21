import z from "zod";
import { LocationLabel } from "../generated/prisma/enums";

export const createAddressSchema = z.object({
  address: z.string(),
  isDefault: z.boolean(),
  label: z.enum(LocationLabel),
  latitude: z.number(),
  longitude: z.number(),
});

export type CreateAddressBody = z.infer<typeof createAddressSchema>;
