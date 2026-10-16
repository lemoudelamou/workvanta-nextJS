import { z } from "zod";
import { TASK_STATUSES } from "@/lib/task-status";

const taskStatusSchema = z.enum([
    "TODO",
    "IN_PROGRESS",
    "IN_REVIEW",
    "DONE",
]);

const taskPrioritySchema = z.enum([
    "LOW",
    "MEDIUM",
    "HIGH",
    "URGENT",
]);

export const createTaskSchema = z.object({
    title: z
        .string()
        .trim()
        .min(1, "Title is required.")
        .max(200, "Title must be 200 characters or fewer."),
    description: z.string().trim().max(2000, "Description is too long."),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
    status: z.enum(TASK_STATUSES),
    assigneeId: z.string(),
    dueDate: z.union([
        z.literal(""),
        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid due date."),
    ]),
});

export const updateTaskSchema = z.object({
    title: z
        .string()
        .trim()
        .min(2, "Task title must be at least 2 characters")
        .max(200, "Task title must be less than 200 characters"),

    description: z
        .string()
        .trim()
        .max(
            2000,
            "Description must be less than 2000 characters",
        ),

    status: taskStatusSchema,

    priority: taskPrioritySchema,

    assigneeId: z.string().optional(),

    dueDate: z.string().optional(),
});z.object({
    taskId: z.string().min(1),
});
