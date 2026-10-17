"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, Filter, Plus, Search, UserRound } from "lucide-react";

import { buttonStyles } from "@/app/style/button-style";
import { useLiveHighlights } from "@/lib/realtime/live-highlight";
import type { TaskFormMember } from "@/components/ui/TaskFormFields";
import { TASK_COLUMNS, type TaskStatus } from "@/lib/task-status";
import { moveCardAction } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/project-actions";
import { CreateTaskDialog } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/create-task-dialog";

import { Avatar } from "../kanbanboard/avatar";
import { FilterSelect } from "../kanbanboard/filter-select";
import { COLUMN_DOTS } from "../kanbanboard/board-utils";
import { getPriorityLabel } from "../kanbanboard/kanban-helpers";
import type { BoardTask, Filters } from "../kanbanboard/kanban-types";
import {
    DEFAULT_SORT,
    filterTasks,
    nextSort,
    sortTasks,
    type SortKey,
} from "./list-utils";

const EMPTY_FILTERS: Filters = { search: "", priority: "ALL", status: "ALL", assignee: "ALL" };

const PRIORITY_DOTS: Record<string, string> = {
    URGENT: "bg-danger",
    HIGH: "bg-orange-500",
    MEDIUM: "bg-amber-400",
    LOW: "bg-sky-400",
};

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
    { key: "title", label: "Task" },
    { key: "status", label: "Status", className: "w-40" },
    { key: "priority", label: "Priority", className: "w-28" },
    { key: "assignee", label: "Assignee", className: "w-44" },
    { key: "due", label: "Due", className: "w-28" },
];

export function ProjectListView({
    slug,
    projectId,
    tasks,
    members,
    canEdit,
    leading,
}: {
    slug: string;
    projectId: string;
    tasks: BoardTask[];
    members: TaskFormMember[];
    canEdit: boolean;
    /** Shown at the start of the toolbar, e.g. the Board/List switch. */
    leading?: React.ReactNode;
}) {
    // Local copy so status changes show instantly; reset when the server
    // sends new data (after a refresh), using the render-time sync pattern.
    const [rows, setRows] = useState(tasks);
    const [syncedFrom, setSyncedFrom] = useState(tasks);
    if (syncedFrom !== tasks) {
        setSyncedFrom(tasks);
        setRows(tasks);
    }

    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
    // Rows a teammate just changed flash briefly after the live refresh.
    const justChanged = useLiveHighlights();
    const flash = (task: BoardTask) =>
        justChanged.has(task.id) ? "motion-safe:animate-[row-flash_2.4s_ease-out]" : "";
    const [sort, setSort] = useState(DEFAULT_SORT);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    const visible = useMemo(
        () => sortTasks(filterTasks(rows, filters), sort.key, sort.direction),
        [rows, filters, sort],
    );

    const assignees = useMemo(() => {
        const seen = new Map<string, string>();
        for (const task of rows) {
            if (task.assignee) {
                seen.set(task.assignee.email, task.assignee.name ?? task.assignee.email);
            }
        }
        return [...seen].sort((a, b) => a[1].localeCompare(b[1]));
    }, [rows]);

    const hasFilters =
        filters.search.trim() !== "" ||
        filters.priority !== "ALL" ||
        filters.status !== "ALL" ||
        filters.assignee !== "ALL";

    function update<K extends keyof Filters>(key: K, value: Filters[K]) {
        setFilters((current) => ({ ...current, [key]: value }));
    }

    function changeStatus(task: BoardTask, status: TaskStatus) {
        if (status === task.status) return;

        const previous = rows;
        setError(null);
        setRows((current) =>
            current.map((row) => (row.id === task.id ? { ...row, status } : row)),
        );

        startTransition(async () => {
            try {
                await moveCardAction(slug, projectId, task.id, status);
            } catch {
                setRows(previous);
                setError(`Couldn't update "${task.title}". Please try again.`);
            }
        });
    }

    // A render helper, not a component, so the select keeps its identity across renders.
    function renderStatus(task: BoardTask) {
        if (!canEdit) {
            return (
                <span className="inline-flex items-center gap-2 text-xs font-medium">
                    <span aria-hidden="true" className={`size-1.5 rounded-full ${COLUMN_DOTS[task.status]}`} />
                    {TASK_COLUMNS.find((c) => c.status === task.status)?.label}
                </span>
            );
        }

        return (
            <div className="relative inline-flex items-center">
                <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute left-2.5 size-1.5 rounded-full ${COLUMN_DOTS[task.status]}`}
                />
                <select
                    value={task.status}
                    onChange={(event) => changeStatus(task, event.target.value as TaskStatus)}
                    aria-label={`Status of ${task.title}`}
                    className="h-8 rounded-lg border border-border bg-card py-0 pl-6 pr-7 text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    {TASK_COLUMNS.map((column) => (
                        <option key={column.status} value={column.status}>
                            {column.label}
                        </option>
                    ))}
                </select>
            </div>
        );
    }

    const taskHref = (task: BoardTask) => `/workspace/${slug}/project/${projectId}/tasks/${task.id}`;
    const emptyMessage = rows.length === 0 ? "No tasks yet." : "No tasks match these filters.";

    return (
        <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
                {/* Its own slot: it comes from the server page, next to static siblings. */}
                <div className="contents">{leading}</div>
                <span className="hidden text-[13px] tabular-nums text-muted-foreground sm:inline">
                    {hasFilters ? `${visible.length} of ${rows.length}` : rows.length} {rows.length === 1 ? "task" : "tasks"}
                </span>
                {!canEdit && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        View only
                    </span>
                )}
                {canEdit && (
                    <button
                        type="button"
                        onClick={() => setDialogOpen(true)}
                        className={`${buttonStyles()} ml-auto whitespace-nowrap`}
                    >
                        <Plus className="size-4" aria-hidden="true" />
                        <span className="sr-only sm:not-sr-only">New task</span>
                    </button>
                )}
            </div>

            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="grid flex-1 grid-cols-2 gap-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
                    <div className="relative col-span-2 lg:col-span-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="search"
                            value={filters.search}
                            onChange={(event) => update("search", event.target.value)}
                            placeholder="Search tasks..."
                            aria-label="Search tasks"
                            className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/15"
                        />
                    </div>

                    <FilterSelect
                        ariaLabel="Filter by status"
                        value={filters.status}
                        onChange={(value) => update("status", value)}
                        icon={<Filter className="size-4 text-muted-foreground" />}
                    >
                        <option value="ALL">All statuses</option>
                        {TASK_COLUMNS.map((column) => (
                            <option key={column.status} value={column.status}>
                                {column.label}
                            </option>
                        ))}
                    </FilterSelect>

                    <FilterSelect
                        ariaLabel="Filter by priority"
                        value={filters.priority}
                        onChange={(value) => update("priority", value)}
                        icon={<Filter className="size-4 text-muted-foreground" />}
                    >
                        <option value="ALL">All priorities</option>
                        <option value="URGENT">Urgent</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                    </FilterSelect>

                    <FilterSelect
                        ariaLabel="Filter by assignee"
                        value={filters.assignee}
                        onChange={(value) => update("assignee", value)}
                        icon={<UserRound className="size-4 text-muted-foreground" />}
                    >
                        <option value="ALL">All assignees</option>
                        <option value="UNASSIGNED">Unassigned</option>
                        {assignees.map(([email, name]) => (
                            <option key={email} value={email}>
                                {name}
                            </option>
                        ))}
                    </FilterSelect>
                </div>

                <div className="flex items-center gap-2">
                    {hasFilters && (
                        <button
                            type="button"
                            onClick={() => setFilters(EMPTY_FILTERS)}
                            className={buttonStyles({ variant: "secondary" })}
                        >
                            Clear filters
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <p role="alert" className="mb-3 text-sm font-medium text-danger">
                    {error}
                </p>
            )}

            {/* Phones: one row per task, stacked. */}
            <ul aria-label="Tasks" className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card md:hidden">
                {visible.length === 0 ? (
                    <li className="px-4 py-10 text-center text-sm text-muted-foreground">{emptyMessage}</li>
                ) : (
                    visible.map((task) => (
                        <li key={task.id} className={`px-4 py-3 ${flash(task)}`}>
                            <Link
                                href={taskHref(task)}
                                className={`text-sm font-medium ${task.status === "DONE" ? "text-muted-foreground line-through" : "text-foreground"}`}
                            >
                                {task.title}
                            </Link>
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
                                {renderStatus(task)}
                                <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                                    <span aria-hidden="true" className={`size-1.5 rounded-full ${PRIORITY_DOTS[task.priority] ?? "bg-status-todo"}`} />
                                    {getPriorityLabel(task.priority)}
                                </span>
                                {task.dueLabel && (
                                    <span className={`tabular-nums ${task.overdue ? "font-medium text-danger" : ""}`}>
                                        {task.overdue ? `Overdue, ${task.dueLabel}` : `Due ${task.dueLabel}`}
                                    </span>
                                )}
                                <span className="truncate">
                                    {task.assignee ? (task.assignee.name ?? task.assignee.email) : "Unassigned"}
                                </span>
                            </div>
                        </li>
                    ))
                )}
            </ul>

            <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block shadow-[0_1px_2px_rgba(23,26,33,0.04)]">
                <table className="w-full min-w-[720px] text-sm">
                    <caption className="sr-only">
                        Tasks in this project, sorted by {sort.key} ({sort.direction === "asc" ? "ascending" : "descending"})
                    </caption>
                    <thead className="border-b border-border bg-muted/40 text-left text-xs font-semibold text-muted-foreground">
                        <tr>
                            {COLUMNS.map((column) => {
                                const active = sort.key === column.key;
                                const Icon = !active ? ArrowUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;

                                return (
                                    <th
                                        key={column.key}
                                        scope="col"
                                        className={`px-4 py-2.5 ${column.className ?? ""}`}
                                        aria-sort={
                                            active
                                                ? sort.direction === "asc"
                                                    ? "ascending"
                                                    : "descending"
                                                : "none"
                                        }
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setSort((current) => nextSort(current, column.key))}
                                            className={`inline-flex items-center gap-1.5 hover:text-foreground ${active ? "text-foreground" : ""}`}
                                        >
                                            {column.label}
                                            <Icon className="size-3.5" aria-hidden="true" />
                                        </button>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-border">
                        {visible.length === 0 ? (
                            <tr>
                                <td colSpan={COLUMNS.length} className="px-4 py-12 text-center text-sm text-muted-foreground">
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            visible.map((task) => (
                                <tr key={task.id} className={`transition-colors hover:bg-muted/40 ${flash(task)}`}>
                                    <td className="px-4 py-3">
                                        <Link
                                            href={taskHref(task)}
                                            className={`font-medium hover:underline ${task.status === "DONE" ? "text-muted-foreground line-through" : "text-foreground"}`}
                                        >
                                            {task.title}
                                        </Link>
                                        {task.subtaskTotal > 0 && (
                                            <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                                                {task.subtaskDone}/{task.subtaskTotal} subtasks
                                            </span>
                                        )}
                                    </td>

                                    <td className="px-4 py-3">
                                        {renderStatus(task)}
                                    </td>

                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center gap-2 text-xs font-medium">
                                            <span aria-hidden="true" className={`size-1.5 rounded-full ${PRIORITY_DOTS[task.priority] ?? "bg-status-todo"}`} />
                                            {getPriorityLabel(task.priority)}
                                        </span>
                                    </td>

                                    <td className="px-4 py-3 text-xs">
                                        {task.assignee ? (
                                            <span className="flex min-w-0 items-center gap-2 text-foreground">
                                                <span aria-hidden="true" className="flex shrink-0 [&>*]:size-6 [&>*]:text-[9px]">
                                                    <Avatar assignee={task.assignee} />
                                                </span>
                                                <span className="truncate">{task.assignee.name ?? task.assignee.email}</span>
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2 text-muted-foreground">
                                                <span aria-hidden="true" className="size-6 shrink-0 rounded-full border border-dashed border-muted-foreground/50" />
                                                Unassigned
                                            </span>
                                        )}
                                    </td>

                                    <td
                                        className={`px-4 py-3 text-xs tabular-nums ${task.overdue ? "font-medium text-danger" : "text-muted-foreground"}`}
                                    >
                                        {task.dueLabel ?? "—"}
                                        {task.overdue && <span className="sr-only"> (overdue)</span>}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
                Showing {visible.length} of {rows.length} {rows.length === 1 ? "task" : "tasks"}
            </p>

            {canEdit && (
                <CreateTaskDialog
                    open={dialogOpen}
                    onClose={() => setDialogOpen(false)}
                    slug={slug}
                    projectId={projectId}
                    defaultStatus="TODO"
                    members={members}
                />
            )}
        </div>
    );
}
