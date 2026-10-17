import type { BoardTask, Filters } from "../kanbanboard/kanban-types";

export type SortKey = "title" | "status" | "priority" | "assignee" | "due";
export type SortDirection = "asc" | "desc";

const STATUS_ORDER: Record<string, number> = {
    TODO: 0,
    IN_PROGRESS: 1,
    IN_REVIEW: 2,
    DONE: 3,
};

// "Ascending" priority means most urgent first, which is what people expect
// when they click the column once.
const PRIORITY_ORDER: Record<string, number> = {
    URGENT: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
};

export const DEFAULT_SORT: { key: SortKey; direction: SortDirection } = {
    key: "due",
    direction: "asc",
};

/** Waiting on tasks that aren't done yet (a done task isn't held up any more). */
export function isBlocked(task: BoardTask) {
    return (task.openBlockers ?? 0) > 0 && task.status !== "DONE";
}

/** Same matching rules as the board's filters. */
export function filterTasks(tasks: BoardTask[], filters: Filters) {
    const search = filters.search.trim().toLowerCase();

    return tasks.filter((task) => {
        if (search && !task.title.toLowerCase().includes(search)) return false;
        if (filters.priority !== "ALL" && task.priority !== filters.priority) return false;
        if (filters.status !== "ALL" && task.status !== filters.status) return false;
        if (filters.label && filters.label !== "ALL" && !task.labels.some((l) => l.id === filters.label)) return false;
        if (filters.blocked === "BLOCKED" && !isBlocked(task)) return false;
        if (filters.blocked === "NOT_BLOCKED" && isBlocked(task)) return false;

        if (filters.assignee === "UNASSIGNED") return !task.assignee;
        if (filters.assignee !== "ALL") return task.assignee?.email === filters.assignee;

        return true;
    });
}

function assigneeName(task: BoardTask) {
    return task.assignee ? (task.assignee.name ?? task.assignee.email).toLowerCase() : null;
}

/**
 * Sorts a copy of the tasks. Empty values (no due date, unassigned) always
 * go last, whichever direction is chosen; ties fall back to title.
 */
export function sortTasks(
    tasks: BoardTask[],
    key: SortKey,
    direction: SortDirection,
): BoardTask[] {
    const sign = direction === "asc" ? 1 : -1;

    const compareValues = (a: BoardTask, b: BoardTask): number => {
        switch (key) {
            case "title":
                return sign * a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
            case "status":
                return sign * ((STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));
            case "priority":
                return sign * ((PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));
            case "assignee": {
                const x = assigneeName(a);
                const y = assigneeName(b);
                if (x === y) return 0;
                if (x === null) return 1;
                if (y === null) return -1;
                return sign * x.localeCompare(y);
            }
            case "due": {
                if (a.dueAt === b.dueAt) return 0;
                if (!a.dueAt) return 1;
                if (!b.dueAt) return -1;
                return sign * (Date.parse(a.dueAt) - Date.parse(b.dueAt));
            }
        }
    };

    return [...tasks].sort(
        (a, b) =>
            compareValues(a, b) ||
            a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
    );
}

/** Clicking the active column flips direction; a new column starts ascending. */
export function nextSort(
    current: { key: SortKey; direction: SortDirection },
    clicked: SortKey,
): { key: SortKey; direction: SortDirection } {
    if (current.key === clicked) {
        return { key: clicked, direction: current.direction === "asc" ? "desc" : "asc" };
    }
    return { key: clicked, direction: "asc" };
}
