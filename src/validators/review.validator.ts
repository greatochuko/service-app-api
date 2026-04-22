import z from "zod";

export const addReviewSchema = z.object({
  comment: z.string(),
  jobId: z.string(),
  rating: z.number(),
});

export type AddReviewBody = z.infer<typeof addReviewSchema>;
