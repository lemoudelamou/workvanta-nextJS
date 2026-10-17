import { buildNotificationViews, commentSnippet, dueVerb, notificationVerb } from "./notification-feed";
import { prisma } from "@/lib/db/prisma";

jest.mock("@/lib/db/prisma", () => ({
    prisma: {
        user: { findMany: jest.fn() },
        task: { findMany: jest.fn() },
        comment: { findMany: jest.fn() },
        project: { findMany: jest.fn() },
    },
}));

const db = prisma as unknown as Record<"user" | "task" | "comment" | "project", { findMany: jest.Mock }>;

const NOW = new Date("2026-10-17T12:00:00Z");

function project(id: string, workspaceRole: string | null, visibility = "WORKSPACE", projectRole: string | null = null) {
    return {
        id,
        name: `Project ${id}`,
        visibility,
        workspace: { slug: "acme", members: workspaceRole ? [{ role: workspaceRole }] : [] },
        members: projectRole ? [{ role: projectRole }] : [],
    };
}

function notification(id: string, type: string, data: Record<string, unknown>, createdAt = NOW, readAt: Date | null = null) {
    return { id, type, data, readAt, createdAt };
}

beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
    db.user.findMany.mockResolvedValue([{ id: "u-dag", name: "Daghar Mourad", email: "d@x.com", image: null }]);
    db.task.findMany.mockResolvedValue([{ id: "t1", title: "Design pricing page", projectId: "p1" }]);
    db.comment.findMany.mockResolvedValue([
        { id: "c1", taskId: "t1", content: "Thanks @[Maya Chen](maya@x.com),\n\nlooks   good" },
    ]);
    db.project.findMany.mockResolvedValue([project("p1", "MEMBER")]);
});

afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
});

describe("buildNotificationViews", () => {
    it("says who did what, where, with a snippet and a link", async () => {
        const [view] = await buildNotificationViews("me", [
            notification("n1", "MENTION", { taskId: "t1", projectId: "p1", workspaceSlug: "acme", commentId: "c1", mentionedBy: "u-dag" }),
        ]);

        expect(view).toMatchObject({
            id: "n1",
            read: false,
            actor: { name: "Daghar Mourad", email: "d@x.com", image: null },
            verb: "mentioned you in",
            taskTitle: "Design pricing page",
            projectName: "Project p1",
            projectId: "p1",
            snippet: "Thanks Maya Chen, looks good",
            href: "/workspace/acme/project/p1/tasks/t1",
            group: "Today",
            timeLabel: "just now",
        });
    });

    it("hides the task, comment and link once the reader can't open the project", async () => {
        // A guest without a project role can't open a workspace project.
        db.project.findMany.mockResolvedValue([project("p1", "GUEST")]);

        const [view] = await buildNotificationViews("me", [
            notification("n1", "TASK_ASSIGNED", { taskId: "t1", projectId: "p1", assignedBy: "u-dag", taskTitle: "Secret plan" }),
        ]);

        expect(view.taskTitle).toBeNull();
        expect(view.projectName).toBeNull();
        expect(view.snippet).toBeNull();
        expect(view.href).toBeNull();
        expect(view.actor?.name).toBe("Daghar Mourad");
    });

    it("hides details for people no longer in the workspace", async () => {
        db.project.findMany.mockResolvedValue([project("p1", null)]);
        const [view] = await buildNotificationViews("me", [notification("n1", "MENTION", { taskId: "t1", projectId: "p1" })]);
        expect(view.href).toBeNull();
    });

    it("keeps the stored task title when the task itself is gone", async () => {
        db.task.findMany.mockResolvedValue([]);
        const [view] = await buildNotificationViews("me", [
            notification("n1", "TASK_ASSIGNED", { taskId: "gone", projectId: "p1", assignedBy: "u-dag", taskTitle: "Old task" }),
        ]);
        expect(view.taskTitle).toBe("Old task");
        expect(view.href).toBeNull();
    });

    it("groups by day and reports read state", async () => {
        const views = await buildNotificationViews("me", [
            notification("a", "MENTION", {}, new Date("2026-10-17T01:00:00Z")),
            notification("b", "MENTION", {}, new Date("2026-10-16T23:00:00Z"), NOW),
            notification("c", "MENTION", {}, new Date("2026-10-10T12:00:00Z")),
        ]);
        expect(views.map((v) => [v.group, v.read])).toEqual([
            ["Today", false],
            ["Yesterday", true],
            ["Earlier", false],
        ]);
    });

    it("skips the lookups entirely when there's nothing to show", async () => {
        expect(await buildNotificationViews("me", [])).toEqual([]);
        expect(db.user.findMany).not.toHaveBeenCalled();
    });
});

describe("helpers", () => {
    it("shortens long comments", () => {
        const long = "word ".repeat(60);
        const snippet = commentSnippet(long);
        expect(snippet.length).toBeLessThanOrEqual(140);
        expect(snippet.endsWith("…")).toBe(true);
    });

    it("has a verb for each type", () => {
        expect(notificationVerb("TASK_COMMENTED")).toBe("commented on");
        expect(notificationVerb("TASK_UNBLOCKED")).toBe("unblocked");
        expect(notificationVerb("WHATEVER")).toBe("sent you a notification");
    });
});

describe("due date reminders", () => {
    it("words the reminder as it stood when it was made", () => {
        const at = new Date("2026-10-17T10:00:00Z");
        expect(dueVerb("TASK_DUE_SOON", "2026-10-17T15:00:00Z", at)).toBe("is due in 5 hours");
        expect(dueVerb("TASK_DUE_SOON", "2026-10-17T10:01:00Z", at)).toBe("is due in 1 minute");
        expect(dueVerb("TASK_DUE_SOON", "2026-10-17T09:00:00Z", at)).toBe("is due now");
        expect(dueVerb("TASK_DUE_SOON", "2026-10-18T09:50:00Z", at)).toBe("is due tomorrow");
        expect(dueVerb("TASK_DUE_SOON", undefined, at)).toBe("is due soon");
        expect(dueVerb("TASK_OVERDUE", "2026-10-16T09:00:00Z", at)).toBe("is overdue");
    });

    it("has no actor and keeps the task link", async () => {
        db.user.findMany.mockResolvedValue([]);
        const [view] = await buildNotificationViews("u1", [
            notification("n9", "TASK_DUE_SOON", {
                taskId: "t1",
                projectId: "p1",
                taskTitle: "Design pricing page",
                dueDate: "2026-10-17T14:00:00Z",
            }),
        ]);
        expect(view.actor).toBeNull();
        expect(view.verb).toBe("is due in 2 hours");
        expect(view.taskTitle).toBe("Design pricing page");
        expect(view.href).toBe("/workspace/acme/project/p1/tasks/t1");
    });
});
