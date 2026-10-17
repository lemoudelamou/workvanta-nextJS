import { newlyUnblocked, openBlockerCount, wouldCreateCycle } from "./dependencies";

// b waits on a, c waits on b
const edges = [
    { blockedTaskId: "b", blockingTaskId: "a" },
    { blockedTaskId: "c", blockingTaskId: "b" },
];

describe("wouldCreateCycle", () => {
    it("allows new links that don't loop", () => {
        expect(wouldCreateCycle(edges, "c", "a")).toBe(false);
        expect(wouldCreateCycle(edges, "d", "c")).toBe(false);
    });

    it("refuses direct and indirect loops, and a task waiting on itself", () => {
        expect(wouldCreateCycle(edges, "a", "b")).toBe(true);
        expect(wouldCreateCycle(edges, "a", "c")).toBe(true);
        expect(wouldCreateCycle(edges, "a", "a")).toBe(true);
    });
});

describe("openBlockerCount", () => {
    it("counts blockers that aren't done", () => {
        expect(openBlockerCount([{ status: "TODO" }, { status: "DONE" }, { status: "IN_REVIEW" }])).toBe(2);
    });
});

describe("newlyUnblocked", () => {
    const waiting = (id: string, status: string, assigneeId: string | null, blockers: string[]) => ({
        id,
        status,
        assigneeId,
        blockedBy: blockers.map((s) => ({ blockingTask: { status: s } })),
    });

    it("keeps open, assigned tasks whose blockers are all done", () => {
        const result = newlyUnblocked([
            waiting("ready", "TODO", "u1", ["DONE", "DONE"]),
            waiting("still-waiting", "TODO", "u1", ["DONE", "IN_PROGRESS"]),
            waiting("nobody", "TODO", null, ["DONE"]),
            waiting("already-done", "DONE", "u1", ["DONE"]),
        ]);
        expect(result.map((t) => t.id)).toEqual(["ready"]);
    });
});
