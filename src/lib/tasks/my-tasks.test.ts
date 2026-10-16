import { dueBucket, groupByDue, myTasksWhere } from "@/lib/tasks/my-tasks";

// Friday 16 Oct 2026, 10:00 UTC
const NOW = new Date("2026-10-16T10:00:00Z");
const endOf = (day: string) => new Date(`${day}T23:59:59Z`);

describe("dueBucket", () => {
    it.each([
        ["2026-10-15", "overdue"],
        ["2026-10-16", "today"],
        ["2026-10-17", "week"],
        ["2026-10-23", "week"],
        ["2026-10-24", "later"],
    ] as const)("puts a task due %s in %s", (day, bucket) => {
        expect(dueBucket(endOf(day), NOW)).toBe(bucket);
    });

    it("treats a task due earlier today as overdue", () => {
        expect(dueBucket(new Date("2026-10-16T09:00:00Z"), NOW)).toBe("overdue");
    });

    it("handles tasks without a due date", () => {
        expect(dueBucket(null, NOW)).toBe("none");
    });
});

describe("groupByDue", () => {
    it("sorts by due date, then priority", () => {
        const tasks = [
            { id: "a", dueDate: endOf("2026-10-20"), priority: "LOW" },
            { id: "b", dueDate: endOf("2026-10-18"), priority: "LOW" },
            { id: "c", dueDate: endOf("2026-10-18"), priority: "URGENT" },
            { id: "d", dueDate: null, priority: "HIGH" },
            { id: "e", dueDate: endOf("2026-10-01"), priority: "MEDIUM" },
        ];

        const groups = groupByDue(tasks, NOW);

        expect(groups.week.map((t) => t.id)).toEqual(["c", "b", "a"]);
        expect(groups.overdue.map((t) => t.id)).toEqual(["e"]);
        expect(groups.none.map((t) => t.id)).toEqual(["d"]);
        expect(groups.today).toEqual([]);
    });
});

describe("myTasksWhere", () => {
    it("only includes projects the user can still open", () => {
        const where = myTasksWhere("u1", [
            { workspaceId: "w1", role: "ADMIN" },
            { workspaceId: "w2", role: "GUEST" },
        ]);

        expect(where).toEqual({
            assigneeId: "u1",
            status: { not: "DONE" },
            OR: [
                { project: { workspaceId: "w1" } },
                { project: { workspaceId: "w2", members: { some: { userId: "u1" } } } },
            ],
        });
    });

    it("can include completed tasks", () => {
        expect(myTasksWhere("u1", [], { includeDone: true })).not.toHaveProperty("status");
    });
});
