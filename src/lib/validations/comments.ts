import { z } from "zod";

export const createCommentSchema = z.object({
    content: z
        .string()
        .trim()
        .min(1, "Comment cannot be empty")
        .max(5000, "Comment must be less than 5000 characters"),
});

export type CreateCommentInput = z.infer<
    typeof createCommentSchema
>;