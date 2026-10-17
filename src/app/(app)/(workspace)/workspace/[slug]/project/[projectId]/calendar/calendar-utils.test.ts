import { dueDay, monthGrid, monthLabel, parseMonth, shiftMonth, tasksByDay } from "./calendar-utils";

describe("calendar-utils", () => {
    it("reads ?month= and falls back to the current month", () => {
        const now = new Date("2026-10-17T10:00:00Z");
        expect(parseMonth("2026-12", now)).toBe("2026-12");
        expect(parseMonth("2026-13", now)).toBe("2026-10");
        expect(parseMonth(undefined, now)).toBe("2026-10");
    });

    it("moves between months across years", () => {
        expect(shiftMonth("2026-12", 1)).toBe("2027-01");
        expect(shiftMonth("2026-01", -1)).toBe("2025-12");
        expect(monthLabel("2026-10")).toBe("October 2026");
    });

    it("lays the month out in whole weeks starting on Monday", () => {
        const weeks = monthGrid("2026-10"); // Oct 1, 2026 is a Thursday
        expect(weeks).toHaveLength(5);
        expect(weeks[0][0]).toEqual({ day: "2026-09-28", inMonth: false, date: 28 });
        expect(weeks[0][3]).toEqual({ day: "2026-10-01", inMonth: true, date: 1 });
        expect(weeks[4][6]).toEqual({ day: "2026-11-01", inMonth: false, date: 1 });
        // February 2027 starts on a Monday and fits in four weeks.
        expect(monthGrid("2027-02")).toHaveLength(4);
    });

    it("buckets tasks by due day, open and urgent first", () => {
        const task = (id: string, dueAt: string | null, status = "TODO", priority = "MEDIUM") => ({ id, dueAt, status, priority });
        const byDay = tasksByDay([
            task("done", "2026-10-20T23:59:59.000Z", "DONE", "URGENT"),
            task("low", "2026-10-20T23:59:59.000Z", "TODO", "LOW"),
            task("urgent", "2026-10-20T21:59:59.000Z", "TODO", "URGENT"),
            task("none", null),
        ]);
        expect(byDay.get("2026-10-20")!.map((t) => t.id)).toEqual(["urgent", "low", "done"]);
        expect([...byDay.keys()]).toEqual(["2026-10-20"]);
        expect(dueDay(null)).toBeNull();
    });
});
