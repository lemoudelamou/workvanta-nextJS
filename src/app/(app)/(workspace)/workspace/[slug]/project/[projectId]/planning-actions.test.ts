import {
    addDependencyAction,
    removeDependencyAction,
    rescheduleTaskAction,
    setTaskRecurrenceAction,
} from "./planning-actions";
import { prisma } from "@/lib/db/prisma";
import { requireTaskEditor } from "@/lib/auth/task_permission";
import { ForbiddenError } from "@/lib/auth/permissions";
import { publishTaskChanged } from "@/lib/realtime/task-events";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/realtime/task-events", () => ({ publishTaskChanged: jest.fn() }));
jest.mock("@/lib/auth/task_permission", () => ({ requireTaskEditor: jest.fn() }));
jest.mock("@/lib/db/prisma", () => ({
    prisma: {
        task: { findFirst: jest.fn(), update: jest.fn((x) => ({ op: "task.update", ...x })) },
        activity: { create: jest.fn((x) => ({ op: "activity.create", ...x })) },
        taskDependency: {
            findMany: jest.fn(),
            create: jest.fn((x) => ({ op: "dep.create", ...x })),
            deleteMany: jest.fn(),
        },
        $transaction: jest.fn(),
    },
}));

const db = prisma as any;
const editor = requireTaskEditor as jest.Mock;
const access = { userId: "u1", project: { id: "p1", workspaceId: "w1" } };

const tasks: Record<string, { id: string; title: string; dueDate: Date | null }> = {
    t1: { id: "t1", title: "Launch", dueDate: new Date("2026-10-20T23:59:59Z") },
    t2: { id: "t2", title: "Write copy", dueDate: null },
};

beforeEach(() => {
    editor.mockResolvedValue(access);
    db.task.findFirst.mockImplementation(async ({ where }: any) =>
        where.projectId === "p1" ? (tasks[where.id] ?? null) : null,
    );
    db.taskDependency.findMany.mockResolvedValue([]);
    db.taskDependency.deleteMany.mockResolvedValue({ count: 1 });
    jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => jest.clearAllMocks());

describe("rescheduleTaskAction", () => {
    it("saves the end of that day (UTC) and logs the move", async () => {
        expect(await rescheduleTaskAction("acme", "p1", "t1", "2026-10-24")).toEqual({});

        const [update, log] = db.$transaction.mock.calls[0][0];
        expect(update).toEqual({ op: "task.update", where: { id: "t1" }, data: { dueDate: new Date("2026-10-24T23:59:59Z") } });
        expect(log.data).toMatchObject({
            action: "TASK_DUE_DATE_CHANGED",
            taskId: "t1",
            metadata: { from: "2026-10-20T23:59:59.000Z", to: "2026-10-24T23:59:59.000Z" },
        });
        expect(publishTaskChanged).toHaveBeenCalledWith("p1", { taskId: "t1", kind: "updated" });
    });

    it("clears the date", async () => {
        await rescheduleTaskAction("acme", "p1", "t1", null);
        expect(db.$transaction.mock.calls[0][0][0].data).toEqual({ dueDate: null });
    });

    it("rejects bad dates, other projects' tasks and people who can't edit", async () => {
        expect(await rescheduleTaskAction("acme", "p1", "t1", "next tuesday")).toEqual({ error: "Pick a valid date." });
        expect(await rescheduleTaskAction("acme", "p1", "elsewhere", "2026-10-24")).toEqual({ error: "Task not found." });
        editor.mockRejectedValue(new ForbiddenError("You don't have permission to edit tasks in this project."));
        expect(await rescheduleTaskAction("acme", "p1", "t1", "2026-10-24")).toEqual({
            error: "You don't have permission to edit tasks in this project.",
        });
        expect(db.$transaction).not.toHaveBeenCalled();
    });
});

describe("setTaskRecurrenceAction", () => {
    it("turns repeating on and off", async () => {
        expect(await setTaskRecurrenceAction("acme", "p1", "t1", "WEEKLY")).toEqual({});
        const [update, log] = db.$transaction.mock.calls[0][0];
        expect(update.data).toEqual({ recurrence: "WEEKLY" });
        expect(log.data.metadata).toEqual({ from: null, to: "every week" });

        await setTaskRecurrenceAction("acme", "p1", "t1", null);
        expect(db.$transaction.mock.calls[1][0][0].data).toEqual({ recurrence: null });
    });

    it("rejects unknown rules", async () => {
        expect(await setTaskRecurrenceAction("acme", "p1", "t1", "HOURLY")).toEqual({ error: "Pick how often it repeats." });
    });
});

describe("addDependencyAction", () => {
    it("links two tasks in the project", async () => {
        expect(await addDependencyAction("acme", "p1", "t1", "t2")).toEqual({});
        const [link, log] = db.$transaction.mock.calls[0][0];
        expect(link).toEqual({ op: "dep.create", data: { blockedTaskId: "t1", blockingTaskId: "t2" } });
        expect(log.data).toMatchObject({ action: "DEPENDENCY_ADDED", taskId: "t1", metadata: { from: null, to: "Write copy" } });
        expect(db.taskDependency.findMany).toHaveBeenCalledWith({
            where: { blockedTask: { projectId: "p1" } },
            select: { blockedTaskId: true, blockingTaskId: true },
        });
    });

    it("refuses loops, self links and tasks from elsewhere", async () => {
        db.taskDependency.findMany.mockResolvedValue([{ blockedTaskId: "t2", blockingTaskId: "t1" }]);
        expect(await addDependencyAction("acme", "p1", "t1", "t2")).toEqual({
            error: "“Write copy” already waits on this task, so it can't block it.",
        });
        expect(await addDependencyAction("acme", "p1", "t1", "t1")).toEqual({ error: "A task can't wait on itself." });
        expect(await addDependencyAction("acme", "p1", "t1", "elsewhere")).toEqual({ error: "That task isn't in this project." });
        expect(db.$transaction).not.toHaveBeenCalled();
    });

    it("is quiet about a link that already exists", async () => {
        db.taskDependency.findMany.mockResolvedValue([{ blockedTaskId: "t1", blockingTaskId: "t2" }]);
        expect(await addDependencyAction("acme", "p1", "t1", "t2")).toEqual({});
        expect(db.$transaction).not.toHaveBeenCalled();
    });
});

describe("removeDependencyAction", () => {
    it("removes the link and logs it", async () => {
        expect(await removeDependencyAction("acme", "p1", "t1", "t2")).toEqual({});
        expect(db.taskDependency.deleteMany).toHaveBeenCalledWith({ where: { blockedTaskId: "t1", blockingTaskId: "t2" } });
        expect(db.activity.create.mock.calls[0][0].data).toMatchObject({
            action: "DEPENDENCY_REMOVED",
            metadata: { from: "Write copy", to: null },
        });
    });

    it("doesn't log when there was nothing to remove", async () => {
        db.taskDependency.deleteMany.mockResolvedValue({ count: 0 });
        await removeDependencyAction("acme", "p1", "t1", "t2");
        expect(db.activity.create).not.toHaveBeenCalled();
    });
});
