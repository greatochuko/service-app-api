import z from "zod";

export const createServiceSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be less than 100 characters"),
  image: z.string().optional().nullable(),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description must be less than 1000 characters"),
  category: z
    .string()
    .min(3, "Please provide a category for the service")
    .max(50, "Category must be less than 50 characters"),
  features: z.array(
    z
      .string()
      .min(1, "Feature cannot be empty")
      .max(100, "Feature must be less than 100 characters"),
  ),
});

export type CreateServiceBody = z.infer<typeof createServiceSchema>;
