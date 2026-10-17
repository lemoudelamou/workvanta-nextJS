import { createNextOccurrence, isRecurrence, nextDueDate } from "./recurrence";

const at = (iso: string) => new Date(iso);

describe("nextDueDate", () => {
    const now = at("2026-10-17T10:00:00Z"); // a Saturday

    it("steps one period on from the due date", () => {
        expect(nextDueDate(at("2026-10-20T23:59:59Z"), "DAILY", now).toISOString()).toBe("2026-10-21T23:59:59.000Z");
        expect(nextDueDate(at("2026-10-20T23:59:59Z"), "WEEKLY", now).toISOString()).toBe("2026-10-27T23:59:59.000Z");
        expect(nextDueDate(at("2026-10-20T23:59:59Z"), "MONTHLY", now).toISOString()).toBe("2026-11-20T23:59:59.000Z");
    });

    it("skips weekends for weekdays", () => {
        // Friday the 23rd → Monday the 26th
        expect(nextDueDate(at("2026-10-23T23:59:59Z"), "WEEKDAYS", now).toISOString()).toBe("2026-10-26T23:59:59.000Z");
    });

    it("keeps the end of the month for monthly tasks", () => {
        expect(nextDueDate(at("2027-01-31T23:59:59Z"), "MONTHLY", at("2027-01-01T00:00:00Z")).toISOString()).toBe(
            "2027-02-28T23:59:59.000Z",
        );
    });

    it("skips past dates that are already gone", () => {
        // Weekly, due on Sep 25 and finished three weeks late: comes back on
        // the next Friday still ahead, not three times.
        expect(nextDueDate(at("2026-09-25T23:59:59Z"), "WEEKLY", now).toISOString()).toBe("2026-10-23T23:59:59.000Z");
        // A step that lands later today still counts: the day isn't over.
        expect(nextDueDate(at("2026-09-26T23:59:59Z"), "WEEKLY", now).toISOString()).toBe("2026-10-17T23:59:59.000Z");
        // Daily, due earlier today: tomorrow.
        expect(nextDueDate(at("2026-10-17T08:00:00Z"), "DAILY", now).toISOString()).toBe("2026-10-18T08:00:00.000Z");
    });

    it("counts from the end of today when there was no due date", () => {
        expect(nextDueDate(null, "DAILY", now).toISOString()).toBe("2026-10-18T23:59:59.000Z");
        // From Saturday, the next weekday is Monday.
        expect(nextDueDate(null, "WEEKDAYS", now).toISOString()).toBe("2026-10-19T23:59:59.000Z");
    });
});

describe("isRecurrence", () => {
    it("accepts only the known rules", () => {
        expect(isRecurrence("WEEKLY")).toBe(true);
        expect(isRecurrence("YEARLY")).toBe(false);
        expect(isRecurrence(null)).toBe(false);
    });
});

describe("createNextOccurrence", () => {
    const now = at("2026-10-17T10:00:00Z");
    const source = {
        id: "t1",
        title: "Weekly report",
        description: "Numbers for Monday",
        priority: "HIGH",
        dueDate: at("2026-10-16T23:59:59Z"),
        projectId: "p1",
        assigneeId: "u2",
        creatorId: "u1",
        recurrence: "WEEKLY",
        nextOccurrenceId: null,
        project: { workspaceId: "w1" },
        labels: [{ labelId: "l1" }],
        subtasks: [{ title: "Pull numbers", position: 0 }],
    };

    function makeTx(task: object | null, claimed = 1) {
        return {
            task: {
                findUnique: jest.fn().mockResolvedValue(task),
                findFirst: jest.fn().mockResolvedValue({ position: 3 }),
                create: jest.fn().mockResolvedValue({ id: "t2" }),
                updateMany: jest.fn().mockResolvedValue({ count: claimed }),
                delete: jest.fn(),
            },
            activity: { create: jest.fn() },
        };
    }

    it("makes a fresh copy with the next due date, labels and an unticked checklist", async () => {
        const tx = makeTx(source);

        expect(await createNextOccurrence(tx as never, "t1", "u9", now)).toBe("t2");
        expect(tx.task.create).toHaveBeenCalledWith({
            data: {
                title: "Weekly report",
                description: "Numbers for Monday",
                priority: "HIGH",
                status: "TODO",
                position: 4,
                dueDate: at("2026-10-23T23:59:59Z"),
                recurrence: "WEEKLY",
                projectId: "p1",
                assigneeId: "u2",
                creatorId: "u1",
                labels: { create: [{ labelId: "l1" }] },
                subtasks: { create: [{ title: "Pull numbers", position: 0 }] },
            },
            select: { id: true },
        });
        expect(tx.task.updateMany).toHaveBeenCalledWith({
            where: { id: "t1", nextOccurrenceId: null },
            data: { nextOccurrenceId: "t2" },
        });
        expect(tx.activity.create.mock.calls[0][0].data).toMatchObject({
            action: "TASK_REPEATED",
            taskId: "t2",
            userId: "u9",
            metadata: { from: "t1", to: "2026-10-23T23:59:59.000Z" },
        });
    });

    it("does nothing for tasks that don't repeat or already repeated", async () => {
        for (const task of [{ ...source, recurrence: null }, { ...source, nextOccurrenceId: "t0" }, null]) {
            const tx = makeTx(task);
            expect(await createNextOccurrence(tx as never, "t1", "u9", now)).toBeNull();
            expect(tx.task.create).not.toHaveBeenCalled();
        }
    });

    it("backs out when someone else finished it at the same moment", async () => {
        const tx = makeTx(source, 0);
        expect(await createNextOccurrence(tx as never, "t1", "u9", now)).toBeNull();
        expect(tx.task.delete).toHaveBeenCalledWith({ where: { id: "t2" } });
        expect(tx.activity.create).not.toHaveBeenCalled();
    });
});
