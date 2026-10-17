/**
 * @jest-environment node
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { cloudinary } from "@/lib/storage/cloudinary";
import { requireTaskEditor } from "@/lib/auth/task_permission";
import {
    listProjectAudience,
    requireProjectAccess,
    requireProjectPermission,
    userCanAccessProject,
} from "@/lib/auth/members";
import { publishRealtimeEvent } from "@/lib/publisher/publisher";
import { publishTaskChanged } from "@/lib/realtime/task-events";
import { parseMentions } from "@/helpers/parseMentions";
import { createTaskSchema, updateTaskSchema } from "@/lib/validations/tasks";
import { createCommentSchema } from "@/lib/validations/comments";
import { createSubtaskSchema } from "@/lib/validations/subtask";
import {
    notifyTaskAssigned,
    notifyTaskCommented,
    notifyTaskDone,
    notifyMention,
} from "@/lib/notifications/notify";

import {
    createSimpleTaskAction,
    reorderTasksAction,
    updateTaskAction,
    deleteTaskAction,
    createCommentAction,
    deleteCommentAction,
    updateCommentAction,
    createSubtaskAction,
    toggleSubtaskAction,
    deleteSubtaskAction,
    uploadAttachmentAction,
    deleteAttachmentAction,
} from "./task-actions";

// ---------- module mocks ----------
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("next/navigation", () => ({
    // The real redirect() throws; mirroring that stops execution like production
    redirect: jest.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    }),
}));
jest.mock("@/lib/auth/session", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/auth/task_permission", () => ({ requireTaskEditor: jest.fn() }));
jest.mock("@/lib/auth/members", () => ({
    requireProjectAccess: jest.fn(),
    requireProjectPermission: jest.fn(),
    listProjectAudience: jest.fn(),
    userCanAccessProject: jest.fn(),
}));
jest.mock("@/lib/db/prisma", () => ({
    prisma: {
        $transaction: jest.fn(),
        task: { findFirst: jest.fn(), findMany: jest.fn() },
        project: { findFirst: jest.fn() },
        workspaceMember: { findFirst: jest.fn() },
        comment: { findFirst: jest.fn() },
        subtask: {
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        attachment: { findFirst: jest.fn() },
    },
}));
jest.mock("@/lib/storage/cloudinary", () => ({
    cloudinary: { uploader: { upload_stream: jest.fn(), destroy: jest.fn() } },
}));
jest.mock("@/lib/publisher/publisher", () => ({ publishRealtimeEvent: jest.fn() }));
jest.mock("@/lib/realtime/task-events", () => ({ publishTaskChanged: jest.fn() }));
jest.mock("@/lib/tasks/recurrence", () => ({ createNextOccurrence: jest.fn().mockResolvedValue(null) }));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockCreateNextOccurrence = require("@/lib/tasks/recurrence").createNextOccurrence as jest.Mock;
jest.mock("@/helpers/parseMentions", () => ({ parseMentions: jest.fn() }));
jest.mock("@/lib/validations/tasks", () => ({
    createTaskSchema: { safeParse: jest.fn() },
    updateTaskSchema: { safeParse: jest.fn() },
}));
jest.mock("@/lib/validations/comments", () => ({
    createCommentSchema: { safeParse: jest.fn() },
}));
jest.mock("@/lib/validations/subtask", () => ({
    createSubtaskSchema: { safeParse: jest.fn() },
}));
jest.mock("@/lib/notifications/notify", () => ({
    notifyTaskAssigned: jest.fn(),
    notifyTaskCommented: jest.fn(),
    notifyTaskDone: jest.fn(),
    notifyMention: jest.fn(),
}));

// ---------- typed handles ----------
const mockRedirect = redirect as unknown as jest.Mock;
const mockRevalidate = revalidatePath as unknown as jest.Mock;
const mockGetSession = getSession as jest.Mock;
const mockRequireEditor = requireTaskEditor as jest.Mock;
const mockRequireAccess = requireProjectAccess as jest.Mock;
const mockRequirePermission = requireProjectPermission as jest.Mock;
const mockAudience = listProjectAudience as jest.Mock;
const mockUserCanAccess = userCanAccessProject as jest.Mock;

const access = {
    userId: "u1",
    workspaceRole: "MEMBER",
    projectRole: null,
    effectiveRole: "EDITOR",
    project: { id: "p1", workspaceId: "w1", visibility: "WORKSPACE" },
};
const mockPublish = publishRealtimeEvent as jest.Mock;
const mockPublishTaskChanged = publishTaskChanged as jest.Mock;
const mockParseMentions = parseMentions as jest.Mock;
const mockQueueAssigned = notifyTaskAssigned as jest.Mock;
const mockQueueCommented = notifyTaskCommented as jest.Mock;
const mockQueueMention = notifyMention as jest.Mock;
const schema = {
    createTask: createTaskSchema.safeParse as unknown as jest.Mock,
    updateTask: updateTaskSchema.safeParse as unknown as jest.Mock,
    comment: createCommentSchema.safeParse as unknown as jest.Mock,
    subtask: createSubtaskSchema.safeParse as unknown as jest.Mock,
};
const cloud = cloudinary as unknown as {
    uploader: { upload_stream: jest.Mock; destroy: jest.Mock };
};
const db = prisma as unknown as {
    $transaction: jest.Mock;
    task: { findFirst: jest.Mock; findMany: jest.Mock };
    project: { findFirst: jest.Mock };
    workspaceMember: { findFirst: jest.Mock };
    comment: { findFirst: jest.Mock };
    subtask: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock; delete: jest.Mock };
    attachment: { findFirst: jest.Mock };
};

// Fake transaction client passed to $transaction callbacks
const tx = {
    task: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    activity: { create: jest.fn() },
    comment: { create: jest.fn(), delete: jest.fn(), update: jest.fn() },
    workspaceMember: { findMany: jest.fn() },
    attachment: { create: jest.fn(), delete: jest.fn() },
};

// ---------- helpers ----------
const mockStreamEnd = jest.fn();
const uploadResult = {
    secure_url: "https://res.cloudinary.com/demo/image/upload/v1/Workvanta/w1/tasks/t1/a.png",
    public_id: "Workvanta/w1/tasks/t1/a",
    bytes: 5,
    resource_type: "image",
};

const baseTask = {
    id: "t1",
    projectId: "p1",
    status: "TODO",
    priority: "MEDIUM",
    position: 3,
    assigneeId: null as string | null,
    project: { workspaceId: "w1" },
};

function fd(values: Record<string, string> = {}) {
    const f = new FormData();
    Object.entries(values).forEach(([k, v]) => f.append(k, v));
    return f;
}

function ok(mock: jest.Mock, data: Record<string, unknown>) {
    mock.mockReturnValue({ success: true, data });
}

function fail(mock: jest.Mock, message?: string) {
    mock.mockReturnValue({
        success: false,
        error: { issues: message ? [{ message }] : [] },
    });
}

function actionsLogged() {
    return tx.activity.create.mock.calls.map((c) => c[0].data.action);
}

let consoleError: jest.SpyInstance;

beforeEach(() => {
    mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    mockRequireEditor.mockResolvedValue(access);
    mockRequireAccess.mockResolvedValue(access);
    mockRequirePermission.mockResolvedValue(access);
    mockUserCanAccess.mockResolvedValue(true);
    // Everyone referenced in these tests can open the project by default.
    mockAudience.mockResolvedValue(
        ["u1", "c1", "a1", "u2"].map((id) => ({ id, name: null, email: `${id}@x.com`, image: null })),
    );
    mockParseMentions.mockReturnValue([]);
    db.$transaction.mockImplementation((cb: any) => cb(tx));

    db.task.findFirst.mockResolvedValue(baseTask);
    db.project.findFirst.mockResolvedValue({ id: "p1", workspaceId: "w1" });
    db.workspaceMember.findFirst.mockResolvedValue({ id: "wm1" });
    tx.task.findFirst.mockResolvedValue(null); // empty column, so position 0
    tx.task.create.mockResolvedValue({ id: "t9" });
    tx.comment.create.mockResolvedValue({ id: "cm1", content: "hi", author: { id: "u1" } });
    tx.workspaceMember.findMany.mockResolvedValue([]);
    tx.attachment.create.mockResolvedValue({ id: "a1" });

    ok(schema.createTask, { title: "Write docs", description: "", priority: "MEDIUM" });
    ok(schema.updateTask, {
        title: "New title",
        description: "",
        status: "TODO",
        priority: "MEDIUM",
        assigneeId: "",
        dueDate: "",
    });
    ok(schema.comment, { content: "hello" });
    ok(schema.subtask, { title: "Sub" });

    cloud.uploader.upload_stream.mockImplementation((_opts: unknown, cb: any) => ({
        end: (buf: Buffer) => {
            mockStreamEnd(buf);
            cb(null, uploadResult);
        },
    }));
    cloud.uploader.destroy.mockResolvedValue({});

    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
    jest.clearAllMocks(); // keeps the throwing redirect implementation
    consoleError.mockRestore();
});

const TASK_PATH = "/workspace/acme/project/p1/tasks/t1";
const PROJECT_PATH = "/workspace/acme/project/p1";

// ---------- createSimpleTaskAction ----------
describe("createSimpleTaskAction", () => {
    const run = () => createSimpleTaskAction("acme", "p1", fd({ title: "Write docs" }));

    it("redirects to /signin before any permission check when signed out", async () => {
        mockGetSession.mockResolvedValue(null);

        await expect(run()).rejects.toThrow("NEXT_REDIRECT:/signin");
        expect(mockRequireEditor).not.toHaveBeenCalled();
    });

    it("requires a task editor and propagates the failure", async () => {
        const error = new Error("Not an editor");
        mockRequireEditor.mockRejectedValue(error);

        await expect(run()).rejects.toBe(error);
        expect(mockRequireEditor).toHaveBeenCalledWith("acme", "p1");
        expect(schema.createTask.mock.calls).toHaveLength(0);
    });

    it("passes only title, description and priority to the schema", async () => {
        await expect(
            createSimpleTaskAction(
                "acme",
                "p1",
                fd({ title: "T", description: "D", priority: "HIGH", status: "DONE" }),
            ),
        ).rejects.toThrow();

        expect(schema.createTask).toHaveBeenCalledWith({
            title: "T",
            description: "D",
            priority: "HIGH",
        });
    });

    it("throws the first schema message, or a fallback", async () => {
        fail(schema.createTask, "Title is required.");
        await expect(run()).rejects.toThrow("Title is required.");

        fail(schema.createTask);
        await expect(run()).rejects.toThrow("Invalid input");
    });

    it("throws when the project is not in the user's workspace", async () => {
        db.project.findFirst.mockResolvedValue(null);

        await expect(run()).rejects.toThrow("Project not found.");
        expect(db.project.findFirst).toHaveBeenCalledWith({
            where: { id: "p1", workspace: { slug: "acme", members: { some: { userId: "u1" } } } },
            select: { id: true, workspaceId: true },
        });
        expect(tx.task.create).not.toHaveBeenCalled();
    });

    it("creates the task at the end of the project, logs it, and redirects", async () => {
        tx.task.findFirst.mockResolvedValue({ position: 6 });

        await expect(run()).rejects.toThrow(`NEXT_REDIRECT:${PROJECT_PATH}`);

        expect(tx.task.findFirst).toHaveBeenCalledWith({
            where: { projectId: "p1" },
            orderBy: { position: "desc" },
            select: { position: true },
        });
        expect(tx.task.create).toHaveBeenCalledWith({
            data: {
                title: "Write docs",
                description: null,
                priority: "MEDIUM",
                position: 7,
                projectId: "p1",
                creatorId: "u1",
            },
        });
        expect(tx.activity.create).toHaveBeenCalledWith({
            data: {
                action: "TASK_CREATED",
                entityType: "TASK",
                entityId: "t9",
                workspaceId: "w1",
                userId: "u1",
                taskId: "t9",
            },
        });
    });
});

// ---------- reorderTasksAction ----------
describe("reorderTasksAction", () => {
    const args = (overrides: Record<string, unknown> = {}) => ({
        slug: "acme",
        projectId: "p1",
        taskId: "t1",
        sourceStatus: "TODO" as const,
        destinationStatus: "DONE" as const,
        sourceTaskIds: ["t2"],
        destinationTaskIds: ["t3", "t1"],
        ...overrides,
    });

    const rows = [
        { id: "t1", status: "TODO", position: 0 },
        { id: "t2", status: "TODO", position: 1 },
        { id: "t3", status: "DONE", position: 0 },
    ];

    beforeEach(() => {
        // Like the database: only return the rows that were asked for.
        db.task.findMany.mockImplementation(({ where }: any) =>
            Promise.resolve(rows.filter((row) => where.id.in.includes(row.id))),
        );
    });

    it("rejects invalid statuses", async () => {
        await expect(
            reorderTasksAction(args({ destinationStatus: "ARCHIVED" as any })),
        ).rejects.toThrow("Invalid status.");
        expect(db.task.findFirst).not.toHaveBeenCalled();
    });

    it("rejects an ordering that doesn't place the moved task in its destination", async () => {
        await expect(
            reorderTasksAction(args({ destinationTaskIds: ["t3"] })),
        ).rejects.toThrow("Invalid task ordering.");
    });

    it("brings in the next repeat when a card is dragged into Done", async () => {
        mockCreateNextOccurrence.mockResolvedValueOnce("t-next");
        await reorderTasksAction(args());
        expect(mockCreateNextOccurrence).toHaveBeenCalledWith(tx, "t1", expect.any(String));
        expect(mockPublishTaskChanged).toHaveBeenCalledWith("p1", { taskId: "t-next", kind: "created" });
        expect(notifyTaskDone).toHaveBeenCalledWith(expect.objectContaining({ taskId: "t1", workspaceSlug: "acme" }));

        mockCreateNextOccurrence.mockClear();
        (notifyTaskDone as jest.Mock).mockClear();
        await reorderTasksAction(args({ sourceStatus: "DONE", destinationStatus: "DONE", sourceTaskIds: ["t3", "t1"], destinationTaskIds: ["t3", "t1"] }));
        expect(mockCreateNextOccurrence).not.toHaveBeenCalled();
        expect(notifyTaskDone).not.toHaveBeenCalled();
    });

    it("revalidates the board after saving", async () => {
        await reorderTasksAction(args());

        expect(mockRevalidate).toHaveBeenCalledWith(PROJECT_PATH);
        expect(mockPublishTaskChanged).toHaveBeenCalledWith("p1", { taskId: "t1", kind: "moved" });
    });

    it("redirects to /signin when signed out", async () => {
        mockGetSession.mockResolvedValue(null);

        await expect(reorderTasksAction(args())).rejects.toThrow("NEXT_REDIRECT:/signin");
    });

    it("throws when the moved task is not accessible", async () => {
        db.task.findFirst.mockResolvedValue(null);

        await expect(reorderTasksAction(args())).rejects.toThrow("Task not found.");
        expect(db.task.findMany).not.toHaveBeenCalled();
    });

    it("rejects ids that do not all belong to the project", async () => {
        db.task.findMany.mockResolvedValue([{ id: "t1", status: "TODO", position: 0 }]);

        await expect(reorderTasksAction(args())).rejects.toThrow("Invalid task ordering.");
        expect(db.$transaction).not.toHaveBeenCalled();
    });

    it("de-duplicates ids and scopes the lookup to the project", async () => {
        await reorderTasksAction(args());

        const where = db.task.findMany.mock.calls[0][0].where;
        expect(where.projectId).toBe("p1");
        expect([...where.id.in].sort()).toEqual(["t1", "t2", "t3"]);
    });

    it("does nothing when the order already matches", async () => {
        await expect(
            reorderTasksAction(
                args({
                    sourceStatus: "TODO",
                    destinationStatus: "TODO",
                    sourceTaskIds: ["t1", "t2"],
                    destinationTaskIds: ["t1", "t2"],
                }),
            ),
        ).resolves.toBeUndefined();

        expect(db.$transaction).not.toHaveBeenCalled();
    });

    it("updates only the changed tasks and logs a status change across columns", async () => {
        await reorderTasksAction(args());

        expect(tx.task.update).toHaveBeenCalledTimes(2);
        expect(tx.task.update).toHaveBeenCalledWith({
            where: { id: "t2" },
            data: { status: "TODO", position: 0 },
        });
        expect(tx.task.update).toHaveBeenCalledWith({
            where: { id: "t1" },
            data: { status: "DONE", position: 1 },
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
    });

    it("does not log an activity when reordering inside one column", async () => {
        await reorderTasksAction(
            args({
                sourceStatus: "TODO",
                destinationStatus: "TODO",
                sourceTaskIds: ["t2", "t1"],
                destinationTaskIds: ["t2", "t1"],
            }),
        );

        expect(tx.task.update).toHaveBeenCalledTimes(2);
        expect(tx.activity.create).not.toHaveBeenCalled();
    });
});

// ---------- updateTaskAction ----------
describe("updateTaskAction", () => {
    const run = () => updateTaskAction("acme", "p1", "t1", fd());

    it("redirects to /signin when signed out", async () => {
        mockGetSession.mockResolvedValue(null);

        await expect(run()).rejects.toThrow("NEXT_REDIRECT:/signin");
    });

    it("requires a task editor", async () => {
        const error = new Error("Not an editor");
        mockRequireEditor.mockRejectedValue(error);

        await expect(run()).rejects.toBe(error);
        expect(mockRequireEditor).toHaveBeenCalledWith("acme", "p1");
    });

    it("throws the first schema message, or a fallback", async () => {
        fail(schema.updateTask, "Title is required.");
        await expect(run()).rejects.toThrow("Title is required.");

        fail(schema.updateTask);
        await expect(run()).rejects.toThrow("Invalid task data");
    });

    it("throws when the task is not accessible", async () => {
        db.task.findFirst.mockResolvedValue(null);

        await expect(run()).rejects.toThrow("Task not found.");
        expect(db.$transaction).not.toHaveBeenCalled();
    });

    it("rejects an assignee who can't open the project", async () => {
        ok(schema.updateTask, { ...schema.updateTask.mock.results[0]?.value?.data, title: "T", status: "TODO", priority: "MEDIUM", assigneeId: "u9", dueDate: "" });
        mockUserCanAccess.mockResolvedValue(false);

        await expect(run()).rejects.toThrow(
            "The selected assignee doesn't have access to this project.",
        );
        expect(mockUserCanAccess).toHaveBeenCalledWith("u9", access.project);
        expect(db.$transaction).not.toHaveBeenCalled();
    });

    it("rejects an invalid due date", async () => {
        ok(schema.updateTask, { title: "T", description: "", status: "TODO", priority: "MEDIUM", assigneeId: "", dueDate: "2026-13-45" });

        await expect(run()).rejects.toThrow("Invalid due date.");
    });

    it("saves a no-change edit without activities or notifications, then redirects", async () => {
        await expect(run()).rejects.toThrow(`NEXT_REDIRECT:${TASK_PATH}`);

        expect(tx.task.update).toHaveBeenCalledWith({
            where: { id: "t1" },
            data: {
                title: "New title",
                description: null,
                status: "TODO",
                priority: "MEDIUM",
                assigneeId: null,
                dueDate: null,
                position: 3, // unchanged status keeps its position
            },
        });
        expect(tx.activity.create).not.toHaveBeenCalled();
        expect(mockQueueAssigned).not.toHaveBeenCalled();
        expect(mockRevalidate).toHaveBeenCalledWith(PROJECT_PATH);
        expect(mockRevalidate).toHaveBeenCalledWith(TASK_PATH);
    });

    it("stores the due date as the end of the day", async () => {
        ok(schema.updateTask, { title: "T", description: "D", status: "TODO", priority: "MEDIUM", assigneeId: "", dueDate: "2026-10-20" });

        await expect(run()).rejects.toThrow();

        expect(tx.task.update).toHaveBeenCalledWith({
            where: { id: "t1" },
            data: expect.objectContaining({
                description: "D",
                // The end of that day in UTC, the calendar due dates are shown in.
                dueDate: new Date("2026-10-20T23:59:59Z"),
            }),
        });
    });

    it("moves the task to the end of the new column and logs status and priority changes in order", async () => {
        ok(schema.updateTask, { title: "T", description: "", status: "DONE", priority: "HIGH", assigneeId: "", dueDate: "" });
        tx.task.findFirst.mockResolvedValue({ position: 4 });

        await expect(run()).rejects.toThrow();

        expect(tx.task.findFirst).toHaveBeenCalledWith({
            where: { projectId: "p1", status: "DONE", id: { not: "t1" } },
            orderBy: { position: "desc" },
            select: { position: true },
        });
        expect(tx.task.update).toHaveBeenCalledWith({
            where: { id: "t1" },
            data: expect.objectContaining({ status: "DONE", priority: "HIGH", position: 5 }),
        });
        expect(actionsLogged()).toEqual(["TASK_STATUS_CHANGED", "TASK_PRIORITY_CHANGED"]);
        expect(tx.activity.create.mock.calls[0][0].data.metadata).toEqual({
            from: "TODO",
            to: "DONE",
        });
        expect(tx.activity.create.mock.calls[1][0].data.metadata).toEqual({
            from: "MEDIUM",
            to: "HIGH",
        });
        expect(mockPublishTaskChanged).toHaveBeenCalledWith("p1", { taskId: "t1", kind: "updated" });
    });

    it("brings in the next one when a repeating task is marked done", async () => {
        ok(schema.updateTask, { title: "T", description: "", status: "DONE", priority: "MEDIUM", assigneeId: "", dueDate: "" });
        mockCreateNextOccurrence.mockResolvedValueOnce("t-next");

        await expect(run()).rejects.toThrow();

        expect(mockCreateNextOccurrence).toHaveBeenCalledWith(tx, "t1", expect.any(String));
        expect(mockPublishTaskChanged).toHaveBeenCalledWith("p1", { taskId: "t-next", kind: "created" });
        expect(notifyTaskDone).toHaveBeenCalledWith(expect.objectContaining({ taskId: "t1", workspaceId: "w1" }));
    });

    it("doesn't repeat when the status didn't change to done", async () => {
        ok(schema.updateTask, { title: "T", description: "", status: "IN_PROGRESS", priority: "MEDIUM", assigneeId: "", dueDate: "" });
        await expect(run()).rejects.toThrow();
        expect(mockCreateNextOccurrence).not.toHaveBeenCalled();
        expect(notifyTaskDone).not.toHaveBeenCalled();
    });

    it("logs an assignment and notifies the new assignee with the new title", async () => {
        ok(schema.updateTask, { title: "Renamed", description: "", status: "TODO", priority: "MEDIUM", assigneeId: "u2", dueDate: "" });

        await expect(run()).rejects.toThrow();

        expect(actionsLogged()).toEqual(["TASK_ASSIGNED"]);
        expect(tx.activity.create.mock.calls[0][0].data.metadata).toEqual({ from: null, to: "u2" });
        expect(mockQueueAssigned).toHaveBeenCalledWith({
            userId: "u2",
            taskId: "t1",
            taskTitle: "Renamed",
            projectId: "p1",
            workspaceId: "w1",
            workspaceSlug: "acme",
            assignedBy: "u1",
        });
    });

    it("does not notify when assigning to yourself", async () => {
        ok(schema.updateTask, { title: "T", description: "", status: "TODO", priority: "MEDIUM", assigneeId: "u1", dueDate: "" });

        await expect(run()).rejects.toThrow();

        expect(actionsLogged()).toEqual(["TASK_ASSIGNED"]);
        expect(mockQueueAssigned).not.toHaveBeenCalled();
    });

    it("logs an unassignment without notifying anyone", async () => {
        db.task.findFirst.mockResolvedValue({ ...baseTask, assigneeId: "u2" });

        await expect(run()).rejects.toThrow();

        expect(tx.activity.create.mock.calls[0][0].data).toEqual(
            expect.objectContaining({
                action: "TASK_ASSIGNED",
                metadata: { from: "u2", to: null },
            }),
        );
        expect(mockQueueAssigned).not.toHaveBeenCalled();
    });

    it("does not notify again when the assignee is unchanged", async () => {
        db.task.findFirst.mockResolvedValue({ ...baseTask, assigneeId: "u2" });
        ok(schema.updateTask, { title: "T", description: "", status: "TODO", priority: "MEDIUM", assigneeId: "u2", dueDate: "" });

        await expect(run()).rejects.toThrow();

        expect(tx.activity.create).not.toHaveBeenCalled();
        expect(mockQueueAssigned).not.toHaveBeenCalled();
    });
});

// ---------- deleteTaskAction ----------
describe("deleteTaskAction", () => {
    it("requires an editor and a task the user can access", async () => {
        db.task.findFirst.mockResolvedValue(null);

        await expect(deleteTaskAction("acme", "p1", "t1")).rejects.toThrow("Task not found.");
        expect(mockRequireEditor).toHaveBeenCalledWith("acme", "p1");
        expect(tx.task.delete).not.toHaveBeenCalled();
    });

    it("deletes the task, logs it, and redirects to the project", async () => {
        await expect(deleteTaskAction("acme", "p1", "t1")).rejects.toThrow(
            `NEXT_REDIRECT:${PROJECT_PATH}`,
        );

        expect(tx.task.delete).toHaveBeenCalledWith({ where: { id: "t1" } });
        expect(tx.activity.create).toHaveBeenCalledWith({
            data: {
                action: "TASK_DELETED",
                entityType: "TASK",
                entityId: "t1",
                workspaceId: "w1",
                userId: "u1",
            },
        });
        expect(mockPublishTaskChanged).toHaveBeenCalledWith("p1", { taskId: "t1", kind: "deleted" });
    });
});

// ---------- createCommentAction ----------
describe("createCommentAction", () => {
    const task = {
        id: "t1",
        creatorId: "c1",
        assigneeId: "a1",
        project: { id: "p1", workspaceId: "w1", workspace: { slug: "acme" } },
    };
    const run = () => createCommentAction("acme", "p1", "t1", fd({ content: "hello" }));

    beforeEach(() => {
        db.task.findFirst.mockResolvedValue(task);
    });

    it("throws Unauthorized (no redirect) when signed out", async () => {
        mockGetSession.mockResolvedValue(null);

        await expect(run()).rejects.toThrow("Unauthorized");
        expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("returns errors for invalid content, a missing task, and non-members", async () => {
        fail(schema.comment);
        await expect(run()).resolves.toEqual({ error: "Invalid comment" });

        ok(schema.comment, { content: "hello" });
        db.task.findFirst.mockResolvedValue(null);
        await expect(run()).resolves.toEqual({ error: "Task not found" });

        db.task.findFirst.mockResolvedValue(task);
        const { ForbiddenError } = jest.requireActual("@/lib/auth/permissions");
        mockRequirePermission.mockRejectedValue(
            new ForbiddenError("You do not have access to this project."),
        );
        await expect(run()).resolves.toEqual({
            error: "You do not have access to this project.",
        });
        expect(mockRequirePermission).toHaveBeenCalledWith("acme", "p1", "task.comment");
        expect(tx.comment.create).not.toHaveBeenCalled();
    });

    it("creates the comment, publishes a realtime event, and notifies the creator and assignee", async () => {
        const result = await run();

        expect(tx.comment.create).toHaveBeenCalledWith({
            data: { content: "hello", taskId: "t1", authorId: "u1" },
            include: {
                author: { select: { id: true, name: true, email: true, image: true } },
            },
        });
        expect(tx.workspaceMember.findMany).not.toHaveBeenCalled();
        expect(mockPublish).toHaveBeenCalledWith({
            type: "comment-created",
            workspaceId: "w1",
            recipientIds: ["u1", "c1", "a1", "u2"],
            data: { commentId: "cm1", taskId: "t1", projectId: "p1", authorId: "u1" },
        });

        const base = {
            taskId: "t1",
            projectId: "p1",
            workspaceSlug: "acme",
            workspaceId: "w1",
            commentId: "cm1",
            commentedBy: "u1",
        };
        expect(mockQueueCommented).toHaveBeenCalledTimes(2);
        expect(mockQueueCommented).toHaveBeenCalledWith({ ...base, userId: "c1" });
        expect(mockQueueCommented).toHaveBeenCalledWith({ ...base, userId: "a1" });
        expect(mockQueueMention).not.toHaveBeenCalled();
        expect(mockRevalidate).toHaveBeenCalledWith(TASK_PATH);
        expect(result).toEqual({ success: true, comment: expect.objectContaining({ id: "cm1" }) });
    });

    it("does not notify the commenter about their own comment", async () => {
        db.task.findFirst.mockResolvedValue({ ...task, creatorId: "u1" });

        await run();

        expect(mockQueueCommented).toHaveBeenCalledTimes(1);
        expect(mockQueueCommented).toHaveBeenCalledWith(expect.objectContaining({ userId: "a1" }));
    });

    it("sends mentions only to mentioned members, skipping yourself and avoiding double notifications", async () => {
        mockParseMentions.mockReturnValue(["c@x.com", "me@x.com"]);
        tx.workspaceMember.findMany.mockResolvedValue([
            { user: { id: "c1" } }, // the creator is also mentioned
            { user: { id: "u1" } }, // self-mention
        ]);

        await run();

        expect(tx.workspaceMember.findMany).toHaveBeenCalledWith({
            where: { workspaceId: "w1", user: { email: { in: ["c@x.com", "me@x.com"] } } },
            select: { user: { select: { id: true } } },
        });
        expect(mockQueueMention).toHaveBeenCalledTimes(1);
        expect(mockQueueMention).toHaveBeenCalledWith(
            expect.objectContaining({ userId: "c1", mentionedBy: "u1" }),
        );
        expect(mockQueueCommented).toHaveBeenCalledTimes(1);
        expect(mockQueueCommented).toHaveBeenCalledWith(expect.objectContaining({ userId: "a1" }));
    });
});

// ---------- deleteCommentAction / updateCommentAction ----------
describe("comment ownership", () => {
    beforeEach(() => {
        db.comment.findFirst.mockResolvedValue({
            id: "cm1",
            taskId: "t1",
            task: { project: { workspaceId: "w1" } },
        });
    });

    it("looks up only the user's own comment inside their workspace", async () => {
        await deleteCommentAction("acme", "p1", "t1", "cm1");

        expect(db.comment.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    id: "cm1",
                    taskId: "t1",
                    authorId: "u1",
                    task: {
                        id: "t1",
                        projectId: "p1",
                        project: { workspace: { slug: "acme", members: { some: { userId: "u1" } } } },
                    },
                },
            }),
        );
    });

    it("deleteCommentAction throws when the comment is not the user's", async () => {
        db.comment.findFirst.mockResolvedValue(null);

        await expect(deleteCommentAction("acme", "p1", "t1", "cm1")).rejects.toThrow(
            "Comment not found.",
        );
        expect(tx.comment.delete).not.toHaveBeenCalled();
    });

    it("deleteCommentAction deletes, logs, and revalidates", async () => {
        await deleteCommentAction("acme", "p1", "t1", "cm1");

        expect(tx.comment.delete).toHaveBeenCalledWith({ where: { id: "cm1" } });
        expect(tx.activity.create).toHaveBeenCalledWith({
            data: {
                action: "COMMENT_DELETED",
                entityType: "COMMENT",
                entityId: "cm1",
                workspaceId: "w1",
                userId: "u1",
                taskId: "t1",
            },
        });
        expect(mockRevalidate).toHaveBeenCalledWith(TASK_PATH);
        expect(mockPublishTaskChanged).toHaveBeenCalledWith("p1", { taskId: "t1", kind: "comments" });
    });

    it("updateCommentAction validates before looking up the comment", async () => {
        fail(schema.comment, "Comment is too long.");

        await expect(
            updateCommentAction("acme", "p1", "t1", "cm1", fd({ content: "x" })),
        ).rejects.toThrow("Comment is too long.");
        expect(db.comment.findFirst).not.toHaveBeenCalled();
    });

    it("updateCommentAction throws when the comment is not the user's", async () => {
        db.comment.findFirst.mockResolvedValue(null);

        await expect(
            updateCommentAction("acme", "p1", "t1", "cm1", fd({ content: "x" })),
        ).rejects.toThrow("Comment not found.");
    });

    it("updateCommentAction saves the content, logs it, and revalidates", async () => {
        ok(schema.comment, { content: "edited" });

        await updateCommentAction("acme", "p1", "t1", "cm1", fd({ content: "edited" }));

        expect(tx.comment.update).toHaveBeenCalledWith({
            where: { id: "cm1" },
            data: { content: "edited" },
        });
        expect(actionsLogged()).toEqual(["COMMENT_UPDATED"]);
        expect(mockRevalidate).toHaveBeenCalledWith(TASK_PATH);
    });
});

// ---------- subtasks ----------
describe("subtask actions", () => {
    it("require an editor, then a task the user can access", async () => {
        db.task.findFirst.mockResolvedValue(null);

        await expect(createSubtaskAction("acme", "p1", "t1", fd())).rejects.toThrow(
            "Task not found.",
        );
        expect(mockRequireEditor).toHaveBeenCalledWith("acme", "p1");
        expect(mockRequireEditor.mock.invocationCallOrder[0]).toBeLessThan(
            db.task.findFirst.mock.invocationCallOrder[0],
        );
    });

    it("redirect to /signin when signed out", async () => {
        mockGetSession.mockResolvedValue(null);

        await expect(toggleSubtaskAction("acme", "p1", "t1", "s1")).rejects.toThrow(
            "NEXT_REDIRECT:/signin",
        );
    });

    describe("createSubtaskAction", () => {
        it("throws the schema message, or a fallback", async () => {
            fail(schema.subtask, "Title is required.");
            await expect(createSubtaskAction("acme", "p1", "t1", fd())).rejects.toThrow(
                "Title is required.",
            );

            fail(schema.subtask);
            await expect(createSubtaskAction("acme", "p1", "t1", fd())).rejects.toThrow(
                "Invalid subtask.",
            );
            expect(db.subtask.create).not.toHaveBeenCalled();
        });

        it("adds the first subtask at position 0", async () => {
            db.subtask.findFirst.mockResolvedValue(null);

            await createSubtaskAction("acme", "p1", "t1", fd({ title: "Sub" }));

            expect(db.subtask.create).toHaveBeenCalledWith({
                data: { title: "Sub", taskId: "t1", position: 0 },
            });
            expect(mockRevalidate).toHaveBeenCalledWith(TASK_PATH);
        });

        it("appends after the last subtask", async () => {
            db.subtask.findFirst.mockResolvedValue({ position: 4 });

            await createSubtaskAction("acme", "p1", "t1", fd({ title: "Sub" }));

            expect(db.subtask.create).toHaveBeenCalledWith({
                data: { title: "Sub", taskId: "t1", position: 5 },
            });
        });
    });

    describe("toggleSubtaskAction", () => {
        it("throws when the subtask is not on this task", async () => {
            db.subtask.findFirst.mockResolvedValue(null);

            await expect(toggleSubtaskAction("acme", "p1", "t1", "s1")).rejects.toThrow(
                "Subtask not found.",
            );
            expect(db.subtask.findFirst).toHaveBeenCalledWith({ where: { id: "s1", taskId: "t1" } });
        });

        it.each([
            [false, true],
            [true, false],
        ])("flips completed from %s to %s", async (before, after) => {
            db.subtask.findFirst.mockResolvedValue({ id: "s1", completed: before });

            await toggleSubtaskAction("acme", "p1", "t1", "s1");

            expect(db.subtask.update).toHaveBeenCalledWith({
                where: { id: "s1" },
                data: { completed: after },
            });
            expect(mockRevalidate).toHaveBeenCalledWith(TASK_PATH);
        });
    });

    describe("deleteSubtaskAction", () => {
        it("throws when the subtask is not on this task", async () => {
            db.subtask.findFirst.mockResolvedValue(null);

            await expect(deleteSubtaskAction("acme", "p1", "t1", "s1")).rejects.toThrow(
                "Subtask not found.",
            );
            expect(db.subtask.delete).not.toHaveBeenCalled();
        });

        it("deletes the subtask and revalidates", async () => {
            db.subtask.findFirst.mockResolvedValue({ id: "s1" });

            await deleteSubtaskAction("acme", "p1", "t1", "s1");

            expect(db.subtask.delete).toHaveBeenCalledWith({ where: { id: "s1" } });
            expect(mockRevalidate).toHaveBeenCalledWith(TASK_PATH);
            expect(mockPublishTaskChanged).toHaveBeenCalledWith("p1", { taskId: "t1", kind: "subtasks" });
        });
    });
});

// ---------- uploadAttachmentAction ----------
describe("uploadAttachmentAction", () => {
    function withFile(file?: File | string) {
        const f = new FormData();
        if (file !== undefined) f.append("file", file as any);
        return f;
    }
    const png = () => new File(["hello"], "a.png", { type: "image/png" });
    const run = (form: FormData = withFile(png())) =>
        uploadAttachmentAction("acme", "p1", "t1", form);

    it("redirects to /signin when signed out", async () => {
        mockGetSession.mockResolvedValue(null);

        await expect(run()).rejects.toThrow("NEXT_REDIRECT:/signin");
    });

    it("rejects a missing file or a plain string", async () => {
        await expect(run(withFile())).rejects.toThrow("No file selected.");
        await expect(run(withFile("not a file"))).rejects.toThrow("No file selected.");
    });

    it("rejects an empty file", async () => {
        await expect(run(withFile(new File([], "a.png", { type: "image/png" })))).rejects.toThrow(
            "The selected file is empty.",
        );
    });

    it("rejects files over 10 MB but accepts exactly 10 MB", async () => {
        const big = png();
        Object.defineProperty(big, "size", { value: 10 * 1024 * 1024 + 1 });
        await expect(run(withFile(big))).rejects.toThrow("File size must be less than 10 MB.");

        const exact = png();
        Object.defineProperty(exact, "size", { value: 10 * 1024 * 1024 });
        await expect(run(withFile(exact))).resolves.toBeUndefined();
    });

    it("rejects unsupported file types before touching the database or Cloudinary", async () => {
        const exe = new File(["x"], "a.exe", { type: "application/x-msdownload" });

        await expect(run(withFile(exe))).rejects.toThrow("This file type is not supported.");
        expect(db.task.findFirst).not.toHaveBeenCalled();
        expect(cloud.uploader.upload_stream).not.toHaveBeenCalled();
    });

    it.each(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf", "text/plain", "application/zip", "application/x-zip-compressed"])(
        "accepts %s",
        async (type) => {
            await expect(run(withFile(new File(["x"], "f", { type })))).resolves.toBeUndefined();
        },
    );

    it("throws when the task is not accessible and uploads nothing", async () => {
        db.task.findFirst.mockResolvedValue(null);

        await expect(run()).rejects.toThrow("Task not found.");
        expect(cloud.uploader.upload_stream).not.toHaveBeenCalled();
    });

    it("uploads the file bytes into a per-task folder", async () => {
        await run();

        expect(cloud.uploader.upload_stream).toHaveBeenCalledWith(
            expect.objectContaining({
                folder: "Workvanta/w1/tasks/t1",
                resource_type: "auto",
                type: "authenticated",
                use_filename: true,
                unique_filename: true,
            }),
            expect.any(Function),
        );
        const sent = mockStreamEnd.mock.calls[0][0];
        expect(Buffer.isBuffer(sent)).toBe(true);
        expect(sent.toString()).toBe("hello");
    });

    it("stores the Cloudinary URL and size, logs it, and revalidates", async () => {
        await run();

        expect(tx.attachment.create).toHaveBeenCalledWith({
            data: {
                filename: "a.png",
                url: uploadResult.secure_url,
                size: 5,
                mimeType: "image/png",
                taskId: "t1",
                uploadedById: "u1",
            },
        });
        expect(tx.activity.create).toHaveBeenCalledWith({
            data: {
                action: "ATTACHMENT_UPLOADED",
                entityType: "ATTACHMENT",
                entityId: "a1",
                workspaceId: "w1",
                userId: "u1",
                taskId: "t1",
                metadata: { filename: "a.png", size: 5 },
            },
        });
        expect(cloud.uploader.destroy).not.toHaveBeenCalled();
        expect(mockRevalidate).toHaveBeenCalledWith(TASK_PATH);
        expect(mockPublishTaskChanged).toHaveBeenCalledWith("p1", { taskId: "t1", kind: "attachments" });
    });

    it("propagates upload errors without writing to the database", async () => {
        const error = new Error("cloud down");
        cloud.uploader.upload_stream.mockImplementation((_o: unknown, cb: any) => ({
            end: () => cb(error, undefined),
        }));

        await expect(run()).rejects.toBe(error);
        expect(db.$transaction).not.toHaveBeenCalled();
    });

    it("fails when Cloudinary returns neither an error nor a result", async () => {
        cloud.uploader.upload_stream.mockImplementation((_o: unknown, cb: any) => ({
            end: () => cb(null, undefined),
        }));

        await expect(run()).rejects.toThrow("Cloudinary upload failed.");
    });

    it("deletes the orphaned Cloudinary file and rethrows when the database write fails", async () => {
        const error = new Error("db down");
        db.$transaction.mockRejectedValue(error);

        await expect(run()).rejects.toBe(error);
        expect(cloud.uploader.destroy).toHaveBeenCalledWith("Workvanta/w1/tasks/t1/a", {
            resource_type: "image",
            type: "authenticated",
        });
        expect(mockRevalidate).not.toHaveBeenCalled();
    });
});

// ---------- deleteAttachmentAction ----------
describe("deleteAttachmentAction", () => {
    const attachment = (url: string) => ({
        id: "a1",
        filename: "a.png",
        url,
        taskId: "t1",
        task: { project: { workspaceId: "w1" } },
    });
    const run = () => deleteAttachmentAction("acme", "p1", "t1", "a1");

    beforeEach(() => {
        db.attachment.findFirst.mockResolvedValue(attachment(uploadResult.secure_url));
    });

    it("requires an editor", async () => {
        const error = new Error("Not an editor");
        mockRequireEditor.mockRejectedValue(error);

        await expect(run()).rejects.toBe(error);
        expect(db.attachment.findFirst).not.toHaveBeenCalled();
    });

    it("only finds attachments on the user's own workspace task", async () => {
        await run();

        expect(db.attachment.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    id: "a1",
                    taskId: "t1",
                    task: {
                        projectId: "p1",
                        project: { workspace: { slug: "acme", members: { some: { userId: "u1" } } } },
                    },
                },
            }),
        );
    });

    it("throws when the attachment is not found", async () => {
        db.attachment.findFirst.mockResolvedValue(null);

        await expect(run()).rejects.toThrow("Attachment not found.");
        expect(db.$transaction).not.toHaveBeenCalled();
    });

    it("throws on an unrecognised URL before deleting anything", async () => {
        db.attachment.findFirst.mockResolvedValue(attachment("https://example.com/a.png"));

        await expect(run()).rejects.toThrow("Could not determine Cloudinary file.");
        expect(db.$transaction).not.toHaveBeenCalled();
        expect(cloud.uploader.destroy).not.toHaveBeenCalled();
    });

    it.each([
        [
            "an image with a version",
            "https://res.cloudinary.com/demo/image/upload/v123/Workvanta/w1/tasks/t1/a.png",
            "Workvanta/w1/tasks/t1/a",
            "image",
        ],
        [
            "an image without a version",
            "https://res.cloudinary.com/demo/image/upload/Workvanta/w1/a.png",
            "Workvanta/w1/a",
            "image",
        ],
        [
            "a video",
            "https://res.cloudinary.com/demo/video/upload/v9/Workvanta/x/clip.mp4",
            "Workvanta/x/clip",
            "video",
        ],
        [
            "a raw file, which keeps its extension",
            "https://res.cloudinary.com/demo/raw/upload/v1/Workvanta/w1/tasks/t1/notes.txt",
            "Workvanta/w1/tasks/t1/notes.txt",
            "raw",
        ],
    ])("derives the public id for %s", async (_label, url, publicId, resourceType) => {
        db.attachment.findFirst.mockResolvedValue(attachment(url));

        await run();

        expect(cloud.uploader.destroy).toHaveBeenCalledWith(publicId, {
            resource_type: resourceType,
            type: "upload",
        });
    });

    it("deletes private (authenticated) files with the right delivery type", async () => {
        db.attachment.findFirst.mockResolvedValue(
            attachment(
                "https://res.cloudinary.com/demo/image/authenticated/s--abc123--/v1/Workvanta/w1/tasks/t1/a.png",
            ),
        );

        await run();

        expect(cloud.uploader.destroy).toHaveBeenCalledWith("Workvanta/w1/tasks/t1/a", {
            resource_type: "image",
            type: "authenticated",
        });
    });

    it("deletes the record and logs it before removing the Cloudinary file", async () => {
        await run();

        expect(tx.attachment.delete).toHaveBeenCalledWith({ where: { id: "a1" } });
        expect(tx.activity.create).toHaveBeenCalledWith({
            data: {
                action: "ATTACHMENT_DELETED",
                entityType: "ATTACHMENT",
                entityId: "a1",
                workspaceId: "w1",
                userId: "u1",
                taskId: "t1",
                metadata: { filename: "a.png" },
            },
        });
        expect(db.$transaction.mock.invocationCallOrder[0]).toBeLessThan(
            cloud.uploader.destroy.mock.invocationCallOrder[0],
        );
        expect(mockRevalidate).toHaveBeenCalledWith(TASK_PATH);
    });

    it("logs and continues when the Cloudinary delete fails", async () => {
        const error = new Error("cloud down");
        cloud.uploader.destroy.mockRejectedValue(error);

        await expect(run()).resolves.toBeUndefined();
        expect(consoleError).toHaveBeenCalledWith(
            "Failed to delete Cloudinary file:",
            "Workvanta/w1/tasks/t1/a",
            error,
        );
        expect(mockRevalidate).toHaveBeenCalledWith(TASK_PATH);
    });

    it("does not touch Cloudinary when the database delete fails", async () => {
        db.$transaction.mockRejectedValue(new Error("db down"));

        await expect(run()).rejects.toThrow("db down");
        expect(cloud.uploader.destroy).not.toHaveBeenCalled();
    });
});

// ---------- project-scoped comment rules ----------
describe("comment access rules", () => {
    const task = {
        id: "t1",
        creatorId: "c1",
        assigneeId: "a1",
        project: { id: "p1", workspaceId: "w1", workspace: { slug: "acme" } },
    };
    const run = () => createCommentAction("acme", "p1", "t1", fd({ content: "hello" }));

    beforeEach(() => {
        db.task.findFirst.mockResolvedValue(task);
    });

    it("only sends the live update to people who can open the project", async () => {
        mockAudience.mockResolvedValue([{ id: "u1" }, { id: "c1" }]);

        await run();

        expect(mockPublish).toHaveBeenCalledWith(
            expect.objectContaining({ recipientIds: ["u1", "c1"] }),
        );
    });

    it("keeps the comment when realtime publishing fails", async () => {
        mockPublish.mockRejectedValueOnce(new Error("redis down"));

        await expect(run()).resolves.toEqual(
            expect.objectContaining({ success: true }),
        );
        expect(mockQueueCommented).toHaveBeenCalled();
    });

    it("never notifies people who can't open the project", async () => {
        mockParseMentions.mockReturnValue(["outsider@x.com"]);
        tx.workspaceMember.findMany.mockResolvedValue([{ user: { id: "outsider" } }]);
        // Only the creator still has access; the assignee lost it.
        mockAudience.mockResolvedValue([{ id: "c1" }, { id: "u1" }]);

        await run();

        expect(mockQueueMention).not.toHaveBeenCalled();
        expect(mockQueueCommented).toHaveBeenCalledTimes(1);
        expect(mockQueueCommented).toHaveBeenCalledWith(expect.objectContaining({ userId: "c1" }));
    });
});

describe("comment moderation", () => {
    beforeEach(() => {
        db.comment.findFirst.mockResolvedValue({
            id: "cm1",
            taskId: "t1",
            task: { project: { workspaceId: "w1" } },
        });
    });

    it("lets project admins delete anyone's comment", async () => {
        mockRequireAccess.mockResolvedValue({ ...access, effectiveRole: "ADMIN" });

        await deleteCommentAction("acme", "p1", "t1", "cm1");

        const where = db.comment.findFirst.mock.calls[0][0].where;
        expect(where).not.toHaveProperty("authorId");
        expect(tx.comment.delete).toHaveBeenCalledWith({ where: { id: "cm1" } });
    });

    it("keeps editing limited to the author, even for admins", async () => {
        mockRequireAccess.mockResolvedValue({ ...access, effectiveRole: "ADMIN" });

        await updateCommentAction("acme", "p1", "t1", "cm1", fd({ content: "x" }));

        const where = db.comment.findFirst.mock.calls[0][0].where;
        expect(where).toHaveProperty("authorId", "u1");
    });

    it("blocks comment changes once project access is gone", async () => {
        mockRequireAccess.mockRejectedValue(new Error("You do not have access to this project."));

        await expect(deleteCommentAction("acme", "p1", "t1", "cm1")).rejects.toThrow(
            "You do not have access to this project.",
        );
        expect(tx.comment.delete).not.toHaveBeenCalled();
    });
});
