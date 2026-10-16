import { z } from "zod";

export const createSubtaskSchema = z.object({
    title: z
        .string()
        .trim()
        .min(1, "Subtask title cannot be empty")
        .max(
            200,
            "Subtask title must be less than 200 characters",
        ),
});

export type CreateSubtaskInput = z.infer<
    typeof createSubtaskSchema
>;