import { dayInZone, findDigestTasks, findDueReminders, groupDigest, type DueTask } from "./due-dates";
import { prisma } from "@/lib/db/prisma-client";

jest.mock("@/lib/db/prisma-client", () => ({
    prisma: { task: { findMany: jest.fn() }, workspaceMember: { findFirst: jest.fn() } },
}));

const findMany = prisma.task.findMany as unknown as jest.Mock;
const memberLookup = prisma.workspaceMember.findFirst as unknown as jest.Mock;
/** Stand-in for "can this user open the project": answers by user id. */
const canAccess = {
    mockResolvedValue(value: boolean) {
        memberLookup.mockResolvedValue(value ? { id: "m" } : null);
    },
    mockImplementation(fn: (userId: string) => Promise<boolean>) {
        memberLookup.mockImplementation(async ({ where }: { where: { userId: string } }) => ((await fn(where.userId)) ? { id: "m" } : null));
    },
};

const NOW = new Date("2026-10-17T06:00:00Z");
const project = { id: "p1", name: "Website", workspaceId: "w1", visibility: "WORKSPACE" as const, workspace: { slug: "acme" } };

function task(id: string, due: string, assigneeId = "u1"): DueTask {
    return { id, title: `Task ${id}`, dueDate: new Date(due), assigneeId, project };
}

beforeEach(() => {
    findMany.mockReset();
    memberLookup.mockReset();
    canAccess.mockResolvedValue(true);
});

describe("dayInZone", () => {
    it("uses the calendar of the given time zone", () => {
        expect(dayInZone(new Date("2026-10-17T23:30:00Z"), "UTC")).toBe("2026-10-17");
        expect(dayInZone(new Date("2026-10-17T23:30:00Z"), "Europe/Berlin")).toBe("2026-10-18");
    });
});

describe("findDueReminders", () => {
    it("asks for open, assigned tasks due in the next day and recently overdue", async () => {
        findMany.mockResolvedValueOnce([task("soon", "2026-10-17T15:00:00Z")]).mockResolvedValueOnce([task("late", "2026-10-16T09:00:00Z")]);

        const reminders = await findDueReminders(NOW);

        expect(findMany.mock.calls[0][0].where).toEqual({
            status: { not: "DONE" },
            assigneeId: { not: null },
            dueDate: { gte: NOW, lt: new Date("2026-10-18T06:00:00Z") },
        });
        expect(findMany.mock.calls[1][0].where.dueDate).toEqual({ gte: new Date("2026-10-14T06:00:00Z"), lt: NOW });
        expect(reminders.map((r) => [r.kind, r.dedupeKey])).toEqual([
            ["TASK_DUE_SOON", "due-soon:soon:2026-10-17T15:00:00.000Z"],
            ["TASK_OVERDUE", "overdue:late:2026-10-16T09:00:00.000Z"],
        ]);
    });

    it("skips people who can no longer open the project, checking each pair once", async () => {
        findMany
            .mockResolvedValueOnce([task("a", "2026-10-17T10:00:00Z", "gone"), task("b", "2026-10-17T11:00:00Z", "gone")])
            .mockResolvedValueOnce([]);
        canAccess.mockResolvedValue(false);

        expect(await findDueReminders(NOW)).toEqual([]);
        expect(memberLookup).toHaveBeenCalledTimes(1);
        expect(memberLookup.mock.calls[0][0].where.userId).toBe("gone");
    });
});

describe("groupDigest", () => {
    const tasks = [
        task("late", "2026-10-15T09:00:00Z"),
        task("today-later", "2026-10-17T17:00:00Z"),
        task("earlier-today", "2026-10-17T01:00:00Z"),
        task("in-two-days", "2026-10-19T09:00:00Z"),
        task("too-far", "2026-10-21T09:00:00Z"),
    ];

    it("sorts tasks into overdue, due today and coming up", () => {
        const digest = groupDigest(tasks, NOW, "UTC", "https://app.test")!;
        expect(digest.overdue.map((i) => i.taskId)).toEqual(["late"]);
        // Due earlier today still counts as today, not overdue.
        expect(digest.today.map((i) => i.taskId)).toEqual(["today-later", "earlier-today"]);
        expect(digest.upcoming.map((i) => i.taskId)).toEqual(["in-two-days"]);
        expect(digest.overdue[0]).toEqual({
            taskId: "late",
            title: "Task late",
            projectName: "Website",
            url: "https://app.test/workspace/acme/project/p1/tasks/late",
            dueLabel: "Thu, Oct 15",
        });
    });

    it("follows the time zone's calendar", () => {
        // 23:30 UTC on the 17th is already the 18th in Berlin.
        const digest = groupDigest([task("x", "2026-10-17T23:30:00Z")], NOW, "Europe/Berlin", "")!;
        expect(digest.today).toEqual([]);
        expect(digest.upcoming.map((i) => i.dueLabel)).toEqual(["Sun, Oct 18"]);
    });

    it("returns null when there is nothing to say", () => {
        expect(groupDigest([task("too-far", "2026-10-25T09:00:00Z")], NOW, "UTC", "")).toBeNull();
    });
});

describe("findDigestTasks", () => {
    it("groups tasks by assignee and leaves out projects they can't open", async () => {
        findMany.mockResolvedValue([task("a", "2026-10-17T10:00:00Z", "u1"), task("b", "2026-10-18T10:00:00Z", "u2"), task("c", "2026-10-18T10:00:00Z", "u1")]);
        canAccess.mockImplementation(async (userId: string) => userId === "u1");

        const byUser = await findDigestTasks(NOW);

        expect([...byUser.keys()]).toEqual(["u1"]);
        expect(byUser.get("u1")!.map((t) => t.id)).toEqual(["a", "c"]);
        expect(findMany.mock.calls[0][0].where.dueDate).toEqual({ lt: new Date("2026-10-21T06:00:00Z") });
    });
});
