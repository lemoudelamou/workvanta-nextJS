import {
    visibleProjectsWhere,
    type WorkspaceRoleName,
} from "@/lib/auth/permissions";

export type DueBucket = "overdue" | "today" | "week" | "later" | "none";

export const DUE_BUCKETS: { key: DueBucket; label: string; empty: string }[] = [
    { key: "overdue", label: "Overdue", empty: "Nothing overdue." },
    { key: "today", label: "Due today", empty: "Nothing due today." },
    { key: "week", label: "Next 7 days", empty: "Nothing due this week." },
    { key: "later", label: "Later", empty: "Nothing scheduled later." },
    { key: "none", label: "No due date", empty: "Every task has a date." },
];

const PRIORITY_ORDER: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Tasks assigned to the user, limited to projects they can still open.
 * (Being assigned doesn't grant access: if someone is taken off a private
 * project, its tasks drop off their list.)
 */
export function myTasksWhere(
    userId: string,
    memberships: { workspaceId: string; role: WorkspaceRoleName }[],
    { includeDone = false }: { includeDone?: boolean } = {},
) {
    return {
        assigneeId: userId,
        ...(includeDone ? {} : { status: { not: "DONE" as const } }),
        OR: memberships.map(({ workspaceId, role }) => ({
            project: { workspaceId, ...visibleProjectsWhere(userId, role) },
        })),
    };
}

/**
 * Due dates are stored as the end of the chosen day in UTC (see
 * lib/due-date.ts), so buckets are computed in UTC to match what the board
 * shows.
 */
export function dueBucket(dueDate: Date | null, now: Date): DueBucket {
    if (!dueDate) return "none";

    const endOfToday = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        23,
        59,
        59,
        999,
    );

    const due = dueDate.getTime();

    if (due < now.getTime()) return "overdue";
    if (due <= endOfToday) return "today";
    if (due <= endOfToday + 7 * DAY_MS) return "week";
    return "later";
}

/** Groups tasks into due-date buckets, soonest and most urgent first. */
export function groupByDue<T extends { dueDate: Date | null; priority: string }>(
    tasks: T[],
    now: Date,
): Record<DueBucket, T[]> {
    const groups: Record<DueBucket, T[]> = {
        overdue: [],
        today: [],
        week: [],
        later: [],
        none: [],
    };

    for (const task of tasks) groups[dueBucket(task.dueDate, now)].push(task);

    const byDueThenPriority = (a: T, b: T) =>
        (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity) ||
        (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);

    for (const key of Object.keys(groups) as DueBucket[]) {
        groups[key].sort(byDueThenPriority);
    }

    return groups;
}
