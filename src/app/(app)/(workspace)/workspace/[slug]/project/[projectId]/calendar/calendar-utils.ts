/**
 * Month maths for the calendar view. Everything is on the UTC calendar,
 * the one due dates are saved and shown in, so a task lands on the same
 * day here as on its card.
 */

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** "2026-10" from ?month=, falling back to the month `now` is in. */
export function parseMonth(raw: string | undefined, now: Date) {
    if (raw && MONTH.test(raw)) return raw;
    return now.toISOString().slice(0, 7);
}

export function shiftMonth(month: string, delta: number) {
    const [year, m] = month.split("-").map(Number);
    const date = new Date(Date.UTC(year, m - 1 + delta, 1));
    return date.toISOString().slice(0, 7);
}

const MONTH_LABEL = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const SHORT_DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const LONG_DAY = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

export function monthLabel(month: string) {
    return MONTH_LABEL.format(new Date(`${month}-01T12:00:00Z`));
}

/** "Oct 24", like the due chip on cards. */
export function shortDayLabel(day: string) {
    return SHORT_DAY.format(new Date(`${day}T12:00:00Z`));
}

/** "Saturday, October 24", for screen readers and the phone agenda. */
export function longDayLabel(day: string) {
    return LONG_DAY.format(new Date(`${day}T12:00:00Z`));
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type CalendarDay = { day: string; inMonth: boolean; date: number };

/** Whole weeks, Monday first, covering the month. */
export function monthGrid(month: string): CalendarDay[][] {
    const [year, m] = month.split("-").map(Number);
    const first = new Date(Date.UTC(year, m - 1, 1));
    const offset = (first.getUTCDay() + 6) % 7; // days since Monday
    const start = new Date(first);
    start.setUTCDate(1 - offset);

    const weeks: CalendarDay[][] = [];
    const cursor = new Date(start);
    do {
        const week: CalendarDay[] = [];
        for (let i = 0; i < 7; i++) {
            week.push({
                day: cursor.toISOString().slice(0, 10),
                inMonth: cursor.getUTCMonth() === m - 1,
                date: cursor.getUTCDate(),
            });
            cursor.setUTCDate(cursor.getUTCDate() + 1);
        }
        weeks.push(week);
    } while (cursor.getUTCMonth() === m - 1);
    return weeks;
}

/** The calendar day a stored due date falls on. */
export function dueDay(dueAt: string | null) {
    return dueAt ? dueAt.slice(0, 10) : null;
}

/** Tasks bucketed by due day: open ones first, then by priority. */
export function tasksByDay<T extends { dueAt: string | null; status: string; priority: string }>(tasks: T[]) {
    const rank: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const byDay = new Map<string, T[]>();
    for (const task of tasks) {
        const day = dueDay(task.dueAt);
        if (!day) continue;
        const list = byDay.get(day) ?? [];
        list.push(task);
        byDay.set(day, list);
    }
    for (const list of byDay.values()) {
        list.sort(
            (a, b) =>
                Number(a.status === "DONE") - Number(b.status === "DONE") ||
                (rank[a.priority] ?? 2) - (rank[b.priority] ?? 2),
        );
    }
    return byDay;
}
