/**
 * @jest-environment node
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
    requireProjectAccess,
    requireProjectPermission,
    userCanAccessProject,
} from "@/lib/auth/members";
import { canEditTasks, requireTaskEditor } from "@/lib/auth/task_permission";
import { prisma } from "@/lib/db/prisma";
import { queueTaskAssignedNotification } from "@/lib/queue/notification.queue";
import { runSerializable } from "@/lib/db/serializable";
import { endOfDay } from "@/lib/due-date";
import { createTaskSchema } from "@/lib/validations/tasks";

import {
    deleteProjectAction,
    createTaskAction,
    createTaskFromPageAction,
    addCardAction,
    moveCardAction,
    deleteCardAction,
    setProjectVisibilityAction,
    updateProjectDetailsAction,
} from "./project-actions";

// ---------- module mocks ----------
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("next/navigation", () => ({
    // The real redirect() throws; mirroring that stops execution like production
    redirect: jest.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    }),
}));
jest.mock("@/lib/auth/session", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/auth/members", () => ({
    requireProjectAccess: jest.fn(),
    requireProjectRole: jest.fn(),
    requireProjectPermission: jest.fn(),
    userCanAccessProject: jest.fn(),
}));
jest.mock("@/lib/auth/task_permission", () => ({
    canEditTasks: jest.fn(),
    requireTaskEditor: jest.fn(),
}));
jest.mock("@/lib/db/prisma", () => ({
    prisma: {
        project: { findFirst: jest.fn(), delete: jest.fn(), update: jest.fn() },
        workspaceMember: { findFirst: jest.fn() },
        $transaction: jest.fn(),
    },
}));
jest.mock("@/lib/db/serializable", () => ({ runSerializable: jest.fn() }));
jest.mock("@/lib/queue/notification.queue", () => ({
    queueTaskAssignedNotification: jest.fn(),
}));
jest.mock("@/lib/due-date", () => ({ endOfDay: jest.fn() }));
jest.mock("@/generated/prisma/enums", () => ({
    WorkspaceRole: { OWNER: "OWNER", ADMIN: "ADMIN", MEMBER: "MEMBER", GUEST: "GUEST" },
}));
jest.mock("@/lib/validations/tasks", () => ({
    createTaskSchema: { safeParse: jest.fn() },
}));
jest.mock("@/lib/task-status", () => ({
    isTaskStatus: jest.fn((s: string) =>
        ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"].includes(s),
    ),
}));

// ---------- typed handles ----------
const mockRedirect = redirect as unknown as jest.Mock;
const mockRevalidate = revalidatePath as unknown as jest.Mock;
const mockGetSession = getSession as jest.Mock;
const mockRequireAccess = requireProjectAccess as jest.Mock;
const mockRequirePermission = requireProjectPermission as jest.Mock;
const mockUserCanAccess = userCanAccessProject as jest.Mock;
const mockCanEdit = canEditTasks as jest.Mock;
const mockRequireEditor = requireTaskEditor as jest.Mock;
const mockRunSerializable = runSerializable as jest.Mock;
const mockEndOfDay = endOfDay as jest.Mock;
const mockSafeParse = createTaskSchema.safeParse as unknown as jest.Mock;
const db = prisma as unknown as {
    project: { findFirst: jest.Mock; delete: jest.Mock; update: jest.Mock };
    workspaceMember: { findFirst: jest.Mock };
    $transaction: jest.Mock;
};

// A fake transaction client shared by runSerializable and $transaction
const tx = {
    task: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
    },
    activity: { create: jest.fn() },
};

// ---------- helpers ----------
const access = {
    userId: "u1",
    project: { id: "p1", workspaceId: "w1" },
};

function makeFormData(values: Record<string, string> = {}) {
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => fd.append(k, v));
    return fd;
}

function parsedTask(overrides: Record<string, unknown> = {}) {
    mockSafeParse.mockReturnValue({
        success: true,
        data: {
            title: "Write docs",
            description: "",
            priority: "MEDIUM",
            status: "TODO",
            assigneeId: "",
            dueDate: "",
            ...overrides,
        },
    });
}

let consoleError: jest.SpyInstance;

beforeEach(() => {
    mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    mockRequireAccess.mockResolvedValue(access);
    mockRequirePermission.mockResolvedValue(access);
    mockUserCanAccess.mockResolvedValue(true);
    mockRequireEditor.mockResolvedValue(access);
    mockCanEdit.mockReturnValue(true);
    mockEndOfDay.mockReturnValue(new Date("2026-10-20T23:59:59.999Z"));
    parsedTask();

    mockRunSerializable.mockImplementation((cb: any) => cb(tx));
    db.$transaction.mockImplementation((cb: any) => cb(tx));

    tx.task.findFirst.mockResolvedValue(null); // empty column, so position 0
    tx.task.create.mockResolvedValue({ id: "t1" });
    tx.task.update.mockResolvedValue({});
    tx.task.deleteMany.mockResolvedValue({ count: 1 });
    tx.activity.create.mockResolvedValue({});

    db.project.findFirst.mockResolvedValue({ id: "p1", workspace: { slug: "acme" } });
    db.project.delete.mockResolvedValue({});
    db.project.update.mockResolvedValue({});
    db.workspaceMember.findFirst.mockResolvedValue({ id: "wm1" });

    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
    jest.clearAllMocks(); // keeps the throwing redirect implementation
    consoleError.mockRestore();
});

// ---------- deleteProjectAction ----------
describe("deleteProjectAction", () => {
    it("redirects to /signin when signed out", async () => {
        mockGetSession.mockResolvedValue(null);

        await expect(deleteProjectAction("p1")).rejects.toThrow("NEXT_REDIRECT:/signin");
        expect(db.project.findFirst).not.toHaveBeenCalled();
    });

    it("only finds projects in workspaces the user belongs to", async () => {
        await expect(deleteProjectAction("p1")).rejects.toThrow();

        expect(db.project.findFirst).toHaveBeenCalledWith({
            where: {
                id: "p1",
                workspace: { members: { some: { userId: "u1" } } },
            },
            select: { id: true, workspace: { select: { slug: true } } },
        });
    });

    it("requires the project.delete permission (project or workspace admin)", async () => {
        await expect(deleteProjectAction("p1")).rejects.toThrow();

        expect(mockRequirePermission).toHaveBeenCalledWith("acme", "p1", "project.delete");
    });

    it("returns an error and deletes nothing without the delete permission", async () => {
        mockRequirePermission.mockRejectedValue(new Error("Forbidden"));

        await expect(deleteProjectAction("p1")).resolves.toEqual({
            error: "Project not found or you do not have permission to delete it.",
        });
        expect(db.project.delete).not.toHaveBeenCalled();
    });

    it("returns an error and deletes nothing when not found or not the owner", async () => {
        db.project.findFirst.mockResolvedValue(null);

        await expect(deleteProjectAction("p1")).resolves.toEqual({
            error: "Project not found or you do not have permission to delete it.",
        });
        expect(db.project.delete).not.toHaveBeenCalled();
        expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("deletes, revalidates the workspace and dashboard, then redirects to the workspace", async () => {
        await expect(deleteProjectAction("p1")).rejects.toThrow("NEXT_REDIRECT:/workspace/acme");

        expect(db.project.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
        expect(mockRevalidate).toHaveBeenCalledWith("/workspace/acme");
        expect(mockRevalidate).toHaveBeenCalledWith("/dashboard");
    });

    it("propagates database errors without revalidating", async () => {
        const error = new Error("db down");
        db.project.delete.mockRejectedValue(error);

        await expect(deleteProjectAction("p1")).rejects.toBe(error);
        expect(mockRevalidate).not.toHaveBeenCalled();
    });
});

// ---------- createTaskAction ----------
describe("createTaskAction – permissions", () => {
    it("rethrows redirect errors from requireTaskEditor", async () => {
        const redirectError = Object.assign(new Error("redirect"), {
            digest: "NEXT_REDIRECT;replace;/signin;307;",
        });
        mockRequireEditor.mockRejectedValue(redirectError);

        await expect(createTaskAction("acme", "p1", makeFormData())).rejects.toBe(redirectError);
    });

    it("returns the error message when the user cannot edit", async () => {
        mockRequireEditor.mockRejectedValue(new Error("Viewers can't create tasks."));

        await expect(createTaskAction("acme", "p1", makeFormData())).resolves.toEqual({
            error: "Viewers can't create tasks.",
        });
        expect(mockSafeParse).not.toHaveBeenCalled();
    });

    it("falls back to a generic message for non-Error throws", async () => {
        mockRequireEditor.mockRejectedValue("nope");

        await expect(createTaskAction("acme", "p1", makeFormData())).resolves.toEqual({
            error: "You can't create tasks in this project.",
        });
    });
});

describe("createTaskAction – validation", () => {
    it("passes form values with defaults to the schema", async () => {
        await createTaskAction("acme", "p1", makeFormData({ title: "Hi" }));

        expect(mockSafeParse).toHaveBeenCalledWith({
            title: "Hi",
            description: "",
            priority: "MEDIUM",
            status: "TODO",
            assigneeId: "",
            dueDate: "",
        });
    });

    it("returns the first schema issue", async () => {
        mockSafeParse.mockReturnValue({
            success: false,
            error: { issues: [{ message: "Title is required." }, { message: "Other" }] },
        });

        await expect(createTaskAction("acme", "p1", makeFormData())).resolves.toEqual({
            error: "Title is required.",
        });
        expect(mockRunSerializable).not.toHaveBeenCalled();
    });

    it("falls back to a generic message when there are no issues", async () => {
        mockSafeParse.mockReturnValue({ success: false, error: { issues: [] } });

        await expect(createTaskAction("acme", "p1", makeFormData())).resolves.toEqual({
            error: "Invalid input.",
        });
    });

    it("rejects an assignee who can't open the project", async () => {
        parsedTask({ assigneeId: "u9" });
        mockUserCanAccess.mockResolvedValue(false);

        await expect(createTaskAction("acme", "p1", makeFormData())).resolves.toEqual({
            error: "The selected assignee doesn't have access to this project.",
        });
        expect(mockUserCanAccess).toHaveBeenCalledWith("u9", access.project);
        expect(mockRunSerializable).not.toHaveBeenCalled();
    });

    it("skips the access lookup when there is no assignee", async () => {
        await createTaskAction("acme", "p1", makeFormData());

        expect(mockUserCanAccess).not.toHaveBeenCalled();
    });

    it("rejects an unparseable due date", async () => {
        parsedTask({ dueDate: "not-a-date" });
        mockEndOfDay.mockReturnValue(null);

        await expect(createTaskAction("acme", "p1", makeFormData())).resolves.toEqual({
            error: "Invalid due date.",
        });
        expect(mockRunSerializable).not.toHaveBeenCalled();
    });
});

describe("createTaskAction – creation", () => {
    it("creates a minimal task at position 0 with a TASK_CREATED activity", async () => {
        await expect(createTaskAction("acme", "p1", makeFormData())).resolves.toEqual({
            success: true,
        });

        expect(mockEndOfDay).not.toHaveBeenCalled();
        expect(tx.task.create).toHaveBeenCalledWith({
            data: {
                title: "Write docs",
                description: null,
                priority: "MEDIUM",
                status: "TODO",
                position: 0,
                projectId: "p1",
                creatorId: "u1",
                assigneeId: null,
                dueDate: null,
            },
        });
        expect(tx.activity.create).toHaveBeenCalledTimes(1);
        expect(tx.activity.create).toHaveBeenCalledWith({
            data: {
                action: "TASK_CREATED",
                entityType: "TASK",
                entityId: "t1",
                workspaceId: "w1",
                userId: "u1",
                taskId: "t1",
            },
        });
    });

    it("places the task after the last task in the same status column", async () => {
        parsedTask({ status: "IN_PROGRESS" });
        tx.task.findFirst.mockResolvedValue({ position: 4 });

        await createTaskAction("acme", "p1", makeFormData());

        expect(tx.task.findFirst).toHaveBeenCalledWith({
            where: { projectId: "p1", status: "IN_PROGRESS" },
            orderBy: { position: "desc" },
            select: { position: true },
        });
        expect(tx.task.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ position: 5, status: "IN_PROGRESS" }),
        });
    });

    it("stores the description, assignee and end-of-day due date, and logs an assignment", async () => {
        const due = new Date("2026-10-20T23:59:59.999Z");
        parsedTask({ description: "Details", assigneeId: "u2", dueDate: "2026-10-20" });
        mockEndOfDay.mockReturnValue(due);

        await createTaskAction("acme", "p1", makeFormData());

        expect(mockEndOfDay).toHaveBeenCalledWith("2026-10-20");
        expect(tx.task.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                description: "Details",
                assigneeId: "u2",
                dueDate: due,
            }),
        });
        expect(tx.activity.create).toHaveBeenCalledTimes(2);
        expect(tx.activity.create).toHaveBeenLastCalledWith({
            data: {
                action: "TASK_ASSIGNED",
                entityType: "TASK",
                entityId: "t1",
                workspaceId: "w1",
                userId: "u1",
                taskId: "t1",
                metadata: { from: null, to: "u2" },
            },
        });
    });

    it("revalidates the project page on success", async () => {
        await createTaskAction("acme", "p1", makeFormData());

        expect(mockRevalidate).toHaveBeenCalledWith("/workspace/acme/project/p1");
    });

    it("logs and returns a friendly error when the transaction fails", async () => {
        const error = new Error("serialization failure");
        mockRunSerializable.mockRejectedValue(error);

        await expect(createTaskAction("acme", "p1", makeFormData())).resolves.toEqual({
            error: "Couldn't create the task. Please try again.",
        });
        expect(consoleError).toHaveBeenCalledWith("Failed to create task:", error);
        expect(mockRevalidate).not.toHaveBeenCalled();
    });
});

// ---------- createTaskFromPageAction ----------
describe("createTaskFromPageAction", () => {
    it("redirects to the project page on success", async () => {
        await expect(
            createTaskFromPageAction("acme", "p1", makeFormData()),
        ).rejects.toThrow("NEXT_REDIRECT:/workspace/acme/project/p1");
    });

    it("redirects back to the new-task page with the encoded error", async () => {
        mockRequireEditor.mockRejectedValue(new Error("Not allowed & stop"));

        await expect(
            createTaskFromPageAction("acme", "p1", makeFormData()),
        ).rejects.toThrow(
            `NEXT_REDIRECT:/workspace/acme/project/p1/tasks/new?error=${encodeURIComponent("Not allowed & stop")}`,
        );
    });
});

// ---------- addCardAction ----------
describe("addCardAction", () => {
    const run = (title: string, status: any = "TODO") =>
        addCardAction("acme", "p1", status, makeFormData({ title }));

    it("propagates access errors", async () => {
        const error = new Error("No access");
        mockRequireAccess.mockRejectedValue(error);

        await expect(run("Task")).rejects.toBe(error);
        expect(tx.task.create).not.toHaveBeenCalled();
    });

    it("throws when the user cannot edit tasks", async () => {
        mockCanEdit.mockReturnValue(false);

        await expect(run("Task")).rejects.toThrow(
            "You don't have permission to edit tasks in this project.",
        );
        expect(tx.task.create).not.toHaveBeenCalled();
    });

    it("rejects an invalid status", async () => {
        await expect(run("Task", "ARCHIVED")).rejects.toThrow("Invalid status.");
    });

    it.each([
        ["an empty title", ""],
        ["a whitespace-only title", "   "],
    ])("rejects %s", async (_label, title) => {
        await expect(run(title)).rejects.toThrow("Title is required.");
        expect(tx.task.create).not.toHaveBeenCalled();
    });

    it("rejects a missing title field", async () => {
        await expect(addCardAction("acme", "p1", "TODO", makeFormData())).rejects.toThrow(
            "Title is required.",
        );
    });

    it("rejects titles over 200 characters but accepts exactly 200", async () => {
        await expect(run("a".repeat(201))).rejects.toThrow("Title is too long.");
        await expect(run("a".repeat(200))).resolves.toBeUndefined();
    });

    it("creates a trimmed task at the end of the column with an activity", async () => {
        tx.task.findFirst.mockResolvedValue({ position: 2 });

        await run("  Ship it  ", "IN_REVIEW");

        expect(tx.task.create).toHaveBeenCalledWith({
            data: {
                title: "Ship it",
                status: "IN_REVIEW",
                projectId: "p1",
                position: 3,
                creatorId: "u1",
            },
        });
        expect(tx.activity.create).toHaveBeenCalledWith({
            data: {
                action: "TASK_CREATED",
                entityType: "TASK",
                entityId: "t1",
                workspaceId: "w1",
                userId: "u1",
                taskId: "t1",
            },
        });
        expect(mockRevalidate).toHaveBeenCalledWith("/workspace/acme/project/p1");
    });

    it("does not revalidate when the transaction fails", async () => {
        mockRunSerializable.mockRejectedValue(new Error("tx failed"));

        await expect(run("Task")).rejects.toThrow("tx failed");
        expect(mockRevalidate).not.toHaveBeenCalled();
    });
});

// ---------- moveCardAction ----------
describe("moveCardAction", () => {
    it("throws when the user cannot edit tasks", async () => {
        mockCanEdit.mockReturnValue(false);

        await expect(moveCardAction("acme", "p1", "t1", "DONE")).rejects.toThrow(
            "You don't have permission to edit tasks in this project.",
        );
    });

    it("rejects an invalid status", async () => {
        await expect(moveCardAction("acme", "p1", "t1", "ARCHIVED" as any)).rejects.toThrow(
            "Invalid status.",
        );
        expect(mockRunSerializable).not.toHaveBeenCalled();
    });

    it("throws when the task does not exist in this project", async () => {
        tx.task.findFirst.mockResolvedValueOnce(null);

        await expect(moveCardAction("acme", "p1", "t1", "DONE")).rejects.toThrow(
            "Task not found.",
        );
        expect(tx.task.findFirst).toHaveBeenCalledWith({
            where: { id: "t1", projectId: "p1" },
            select: { id: true, status: true },
        });
        expect(tx.task.update).not.toHaveBeenCalled();
        expect(mockRevalidate).not.toHaveBeenCalled();
    });

    it("moves the task to the end of the new column and logs the status change", async () => {
        tx.task.findFirst
            .mockResolvedValueOnce({ id: "t1", status: "TODO" }) // the task
            .mockResolvedValueOnce({ position: 7 }); // last task in the target column

        await moveCardAction("acme", "p1", "t1", "DONE");

        expect(tx.task.update).toHaveBeenCalledWith({
            where: { id: "t1" },
            data: { status: "DONE", position: 8 },
        });
        expect(tx.activity.create).toHaveBeenCalledWith({
            data: {
                action: "TASK_STATUS_CHANGED",
                entityType: "TASK",
                entityId: "t1",
                workspaceId: "w1",
                userId: "u1",
                taskId: "t1",
                metadata: { from: "TODO", to: "DONE" },
            },
        });
        expect(mockRevalidate).toHaveBeenCalledWith("/workspace/acme/project/p1");
    });

    it("does not log an activity when the status is unchanged", async () => {
        tx.task.findFirst
            .mockResolvedValueOnce({ id: "t1", status: "DONE" })
            .mockResolvedValueOnce(null);

        await moveCardAction("acme", "p1", "t1", "DONE");

        expect(tx.task.update).toHaveBeenCalledWith({
            where: { id: "t1" },
            data: { status: "DONE", position: 0 },
        });
        expect(tx.activity.create).not.toHaveBeenCalled();
    });
});

// ---------- deleteCardAction ----------
describe("deleteCardAction", () => {
    it("throws when the user cannot edit tasks", async () => {
        mockCanEdit.mockReturnValue(false);

        await expect(deleteCardAction("acme", "p1", "t1")).rejects.toThrow(
            "You don't have permission to edit tasks in this project.",
        );
        expect(db.$transaction).not.toHaveBeenCalled();
    });

    it("throws and logs nothing when the task is not in this project", async () => {
        tx.task.deleteMany.mockResolvedValue({ count: 0 });

        await expect(deleteCardAction("acme", "p1", "t1")).rejects.toThrow("Task not found.");
        expect(tx.activity.create).not.toHaveBeenCalled();
        expect(mockRevalidate).not.toHaveBeenCalled();
    });

    it("deletes the task scoped to the project, logs it, and revalidates", async () => {
        await deleteCardAction("acme", "p1", "t1");

        expect(tx.task.deleteMany).toHaveBeenCalledWith({
            where: { id: "t1", projectId: "p1" },
        });
        expect(tx.activity.create).toHaveBeenCalledWith({
            data: {
                action: "TASK_DELETED",
                entityType: "TASK",
                entityId: "t1",
                workspaceId: "w1",
                userId: "u1",
            },
        });
        expect(mockRevalidate).toHaveBeenCalledWith("/workspace/acme/project/p1");
    });
});

// ---------- setProjectVisibilityAction ----------
describe("setProjectVisibilityAction", () => {
    it("requires the project.update permission before updating", async () => {
        await setProjectVisibilityAction("acme", "p1", "PRIVATE");

        expect(mockRequirePermission).toHaveBeenCalledWith("acme", "p1", "project.update");
        expect(mockRequirePermission.mock.invocationCallOrder[0]).toBeLessThan(
            db.project.update.mock.invocationCallOrder[0],
        );
    });

    it("does not update when the role check fails", async () => {
        const error = new Error("Forbidden");
        mockRequirePermission.mockRejectedValue(error);

        await expect(setProjectVisibilityAction("acme", "p1", "PRIVATE")).rejects.toBe(error);
        expect(db.project.update).not.toHaveBeenCalled();
        expect(mockRevalidate).not.toHaveBeenCalled();
    });

    it("rejects an unknown visibility value", async () => {
        await expect(
            setProjectVisibilityAction("acme", "p1", "PUBLIC" as any),
        ).rejects.toThrow("Invalid visibility.");
        expect(db.project.update).not.toHaveBeenCalled();
    });

    it.each(["WORKSPACE", "PRIVATE"] as const)("sets visibility to %s", async (visibility) => {
        await setProjectVisibilityAction("acme", "p1", visibility);

        expect(db.project.update).toHaveBeenCalledWith({
            where: { id: "p1" },
            data: { visibility },
        });
    });

    it("revalidates the project page and the members page", async () => {
        await setProjectVisibilityAction("acme", "p1", "PRIVATE");

        // The sidebar lists projects and workspaces, so the shell refreshes too.
        expect(mockRevalidate).toHaveBeenCalledWith("/", "layout");
        expect(mockRevalidate).toHaveBeenCalledTimes(3);
        expect(mockRevalidate).toHaveBeenCalledWith("/workspace/acme/project/p1");
        expect(mockRevalidate).toHaveBeenCalledWith("/workspace/acme/project/p1/members");
    });
});

// ---------- assignment notifications on create ----------
describe("createTaskAction – assignment notification", () => {
    const mockQueue = queueTaskAssignedNotification as jest.Mock;

    it("notifies the assignee when a task is created for someone else", async () => {
        parsedTask({ title: "Ship it", assigneeId: "u2" });

        await createTaskAction("acme", "p1", makeFormData());

        expect(mockQueue).toHaveBeenCalledWith({
            userId: "u2",
            taskId: "t1",
            taskTitle: "Ship it",
            projectId: "p1",
            workspaceId: "w1",
            workspaceSlug: "acme",
            assignedBy: "u1",
        });
    });

    it("does not notify you about tasks you assign to yourself", async () => {
        parsedTask({ assigneeId: "u1" });

        await createTaskAction("acme", "p1", makeFormData());

        expect(mockQueue).not.toHaveBeenCalled();
    });

    it("does not notify when nobody is assigned", async () => {
        await createTaskAction("acme", "p1", makeFormData());

        expect(mockQueue).not.toHaveBeenCalled();
    });

    it("still succeeds if the notification queue is down", async () => {
        parsedTask({ assigneeId: "u2" });
        mockQueue.mockRejectedValueOnce(new Error("redis down"));

        await expect(createTaskAction("acme", "p1", makeFormData())).resolves.toEqual({
            success: true,
        });
    });
});

// ---------- updateProjectDetailsAction ----------
describe("updateProjectDetailsAction", () => {
    const run = (values: Record<string, string>) =>
        updateProjectDetailsAction("acme", "p1", {}, makeFormData(values));

    it("requires the project.update permission", async () => {
        const { ForbiddenError } = jest.requireActual("@/lib/auth/permissions");
        mockRequirePermission.mockRejectedValue(
            new ForbiddenError("Only project admins can edit project details."),
        );

        await expect(run({ name: "New" })).resolves.toEqual({
            error: "Only project admins can edit project details.",
        });
        expect(db.project.update).not.toHaveBeenCalled();
    });

    it("validates the name and description", async () => {
        await expect(run({ name: "  " })).resolves.toEqual({ error: "Project name is required." });
        await expect(run({ name: "x".repeat(101) })).resolves.toEqual({
            error: "Project name must be 100 characters or fewer.",
        });
        await expect(run({ name: "Ok", description: "x".repeat(501) })).resolves.toEqual({
            error: "Description must be 500 characters or fewer.",
        });
        expect(db.project.update).not.toHaveBeenCalled();
    });

    it("saves trimmed details and refreshes the pages", async () => {
        await expect(run({ name: "  Apollo 2 ", description: " Next phase " })).resolves.toEqual({
            success: true,
        });

        expect(db.project.update).toHaveBeenCalledWith({
            where: { id: "p1" },
            data: { name: "Apollo 2", normalizedName: "apollo 2", description: "Next phase" },
        });
        expect(mockRevalidate).toHaveBeenCalledWith("/workspace/acme/project/p1");
        expect(mockRevalidate).toHaveBeenCalledWith("/workspace/acme");
    });

    it("reports a duplicate name", async () => {
        const { Prisma } = jest.requireActual("@/generated/prisma/client");
        db.project.update.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "test" }),
        );

        await expect(run({ name: "Apollo" })).resolves.toEqual({
            error: "Another project in this workspace already has this name.",
        });
    });
});
