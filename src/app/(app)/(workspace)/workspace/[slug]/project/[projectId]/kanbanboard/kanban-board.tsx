"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    closestCorners,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragOverEvent,
    type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Filter, Plus, Search, Tag, UserRound, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonStyles } from "@/app/style/button-style";
import type { TaskFormMember } from "@/components/ui/TaskFormFields";
import { TASK_COLUMNS, TASK_STATUSES, type TaskStatus } from "@/lib/task-status";
import { reorderTasksAction } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/tasks/[taskId]/task-actions";
import { CreateTaskDialog } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/create-task-dialog";
import { getPriorityLabel, getStatusLabel, getAssigneeLabel } from "./kanban-helpers";
import { findColumn, groupTasks, idsOf } from "./board-utils";
import { filterTasks } from "../listview/list-utils";
import { Column } from "./kanban-column";
import { FilterChip } from "./filter-chip";
import { FilterSelect } from "./filter-select";
import { TaskCard } from "./task-card";
import type { BoardTask, Columns, Filters } from "./kanban-types";
import type { TaskLabelView } from "@/lib/labels/label-colors";
import { beginInteraction, endInteraction } from "@/lib/realtime/interaction-lock";
import { useConfirmDone } from "../components/useConfirmDone";

export type { BoardTask } from "./kanban-types";

const EMPTY_FILTERS: Filters = {
    search: "",
    priority: "ALL",
    status: "ALL",
    assignee: "ALL",
    label: "ALL",
};

export function KanbanBoard({
                                slug,
                                projectId,
                                tasks,
                                members,
                                canEdit,
                                leading,
                                labels = [],
                            }: {
    slug: string;
    projectId: string;
    tasks: BoardTask[];
    members: TaskFormMember[];
    canEdit: boolean;
    /** The project's labels, for the label filter. */
    labels?: TaskLabelView[];
    /** Shown at the start of the toolbar, e.g. the Board/List switch. */
    leading?: React.ReactNode;
}) {
    const [columns, setColumns] = useState(() => groupTasks(tasks));
    const [syncedFrom, setSyncedFrom] = useState(tasks);

    const [activeId, setActiveId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [dialog, setDialog] = useState<{ open: boolean; status: TaskStatus }>({
        open: false,
        status: "TODO",
    });

    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
    const [showFilters, setShowFilters] = useState(false);

    const [, startTransition] = useTransition();
    const confirmDone = useConfirmDone();

    const dragStart = useRef<{
        status: TaskStatus;
        snapshot: Columns;
    } | null>(null);

    if (tasks !== syncedFrom) {
        setSyncedFrom(tasks);
        setColumns(groupTasks(tasks));
    }

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 4 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const allTasks = useMemo(
        () => TASK_STATUSES.flatMap((status) => columns[status]),
        [columns],
    );

    const filteredTasks = useMemo(
        () => filterTasks(allTasks, filters),
        [allTasks, filters],
    );

    const filteredColumns = useMemo(() => {
        const filteredIds = new Set(filteredTasks.map((task) => task.id));

        return Object.fromEntries(
            TASK_STATUSES.map((status) => [
                status,
                columns[status].filter((task) => filteredIds.has(task.id)),
            ]),
        ) as Columns;
    }, [columns, filteredTasks]);

    const hasFilters =
        filters.search.trim() !== "" ||
        filters.priority !== "ALL" ||
        filters.status !== "ALL" ||
        filters.assignee !== "ALL" ||
        filters.label !== "ALL";

    const uniqueAssignees = useMemo(() => {
        const map = new Map<string, { email: string; name: string | null }>();

        for (const task of allTasks) {
            if (!task.assignee) continue;

            if (!map.has(task.assignee.email)) {
                map.set(task.assignee.email, {
                    email: task.assignee.email,
                    name: task.assignee.name,
                });
            }
        }

        return Array.from(map.values()).sort((a, b) =>
            (a.name ?? a.email).localeCompare(b.name ?? b.email),
        );
    }, [allTasks]);

    function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
        setFilters((current) => ({ ...current, [key]: value }));
    }

    function clearFilters() {
        setFilters(EMPTY_FILTERS);
    }

    function openDialog(status: TaskStatus) {
        setDialog({ open: true, status });
    }

    function closeDialog() {
        setDialog((current) => ({ ...current, open: false }));
    }

    // Leaving the page mid-drag must not keep live refreshes on hold.
    useEffect(
        () => () => {
            if (dragStart.current) endInteraction();
        },
        [],
    );

    function handleDragStart({ active }: DragStartEvent) {
        const id = String(active.id);
        const status = findColumn(columns, id);

        if (!status) return;

        dragStart.current = { status, snapshot: columns };
        // Hold live refreshes until the card is dropped.
        beginInteraction();

        setActiveId(id);
        setError(null);
    }

    function handleDragOver({ active, over }: DragOverEvent) {
        if (!over) return;

        const activeKey = String(active.id);
        const overKey = String(over.id);

        setColumns((prev) => {
            const from = findColumn(prev, activeKey);
            const to = findColumn(prev, overKey);

            if (!from || !to || from === to) {
                return prev;
            }

            const item = prev[from].find((task) => task.id === activeKey);

            if (!item) return prev;

            const overIndex = prev[to].findIndex((task) => task.id === overKey);
            const insertAt = overIndex >= 0 ? overIndex : prev[to].length;

            return {
                ...prev,
                [from]: prev[from].filter((task) => task.id !== activeKey),
                [to]: [
                    ...prev[to].slice(0, insertAt),
                    { ...item, status: to },
                    ...prev[to].slice(insertAt),
                ],
            };
        });
    }

    function handleDragEnd({ active, over }: DragEndEvent) {
        const start = dragStart.current;

        if (start) endInteraction();
        dragStart.current = null;
        setActiveId(null);

        if (!start) return;

        const taskId = String(active.id);
        const to = findColumn(columns, taskId);

        if (!to) return;

        let next = columns;

        if (over) {
            const overId = String(over.id);

            if (findColumn(columns, overId) === to) {
                const oldIndex = columns[to].findIndex((task) => task.id === taskId);
                const newIndex = columns[to].findIndex((task) => task.id === overId);

                if (newIndex >= 0 && oldIndex !== newIndex) {
                    next = {
                        ...columns,
                        [to]: arrayMove(columns[to], oldIndex, newIndex),
                    };
                }
            }
        }

        setColumns(next);

        const from = start.status;
        const sameColumn = from === to;

        if (
            sameColumn &&
            idsOf(next[to]).join() === idsOf(start.snapshot[to]).join()
        ) {
            return;
        }

        const persist = () =>
            startTransition(async () => {
                try {
                    // Persist the exact order the user dropped into, for both the
                    // column it left and the column it landed in.
                    await reorderTasksAction({
                        slug,
                        projectId,
                        taskId,
                        sourceStatus: from,
                        destinationStatus: to,
                        sourceTaskIds: idsOf(next[from]),
                        destinationTaskIds: idsOf(next[to]),
                    });
                } catch {
                    setColumns(start.snapshot);
                    setError("Couldn't move that task. Please try again.");
                }
            });

        if (to === "DONE" && from !== "DONE") {
            // The card stays in Done while we ask; backing out puts it back.
            const task = next[to].find((t) => t.id === taskId);
            confirmDone.guard({
                title: task?.title ?? "This task",
                openBlockers: task?.openBlockers ?? 0,
                confirm: persist,
                cancel: () => setColumns(start.snapshot),
            });
            return;
        }
        persist();
    }

    function handleDragCancel() {
        if (dragStart.current) {
            setColumns(dragStart.current.snapshot);
            endInteraction();
        }

        dragStart.current = null;
        setActiveId(null);
    }

    const activeTask = activeId
        ? (allTasks.find((task) => task.id === activeId) ?? null)
        : null;

    const activeFilterCount = [
        filters.search,
        filters.priority !== "ALL" ? filters.priority : "",
        filters.status !== "ALL" ? filters.status : "",
        filters.assignee !== "ALL" ? filters.assignee : "",
        filters.label !== "ALL" ? filters.label : "",
    ].filter(Boolean).length;
    // Search has its own box; this counts the filters behind the Filters button.
    const panelFilterCount = activeFilterCount - (filters.search ? 1 : 0);

    return (
        <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
                {/* Its own slot: it comes from the server page, next to static siblings. */}
                <div className="contents">{leading}</div>
                <span className="hidden text-[13px] tabular-nums text-muted-foreground sm:inline">
                    {hasFilters ? `${filteredTasks.length} of ${allTasks.length}` : allTasks.length}{" "}
                    {allTasks.length === 1 ? "task" : "tasks"}
                </span>
                {!canEdit && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        View only
                    </span>
                )}

                <div className="ml-auto flex min-w-0 items-center gap-2">
                    <label className="relative min-w-0">
                        <span className="sr-only">Search tasks</span>
                        <Search
                            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                            aria-hidden="true"
                        />
                        <input
                            type="search"
                            value={filters.search}
                            onChange={(event) => updateFilter("search", event.target.value)}
                            placeholder="Search tasks"
                            className="h-9 w-36 rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground outline-none transition-[width,box-shadow] placeholder:text-muted-foreground focus:w-52 focus:border-brand focus:ring-4 focus:ring-brand/15 sm:w-48 sm:focus:w-60"
                        />
                    </label>

                    <button
                        type="button"
                        onClick={() => setShowFilters((value) => !value)}
                        aria-expanded={showFilters}
                        className={cn(
                            buttonStyles({ variant: "secondary" }),
                            "gap-2",
                            showFilters && "border-brand/40 bg-brand-soft text-brand dark:bg-brand/15",
                        )}
                    >
                        <Filter className="size-4" aria-hidden="true" />
                        <span className="sr-only sm:not-sr-only">Filters</span>
                        {panelFilterCount > 0 && (
                            <span className="flex size-5 items-center justify-center rounded-full bg-brand text-[10px] font-semibold text-white dark:text-[#0f1115]">
                                {panelFilterCount}
                            </span>
                        )}
                    </button>

                    {canEdit && (
                        <button
                            type="button"
                            onClick={() => openDialog("TODO")}
                            className={cn(buttonStyles(), "whitespace-nowrap")}
                        >
                            <Plus className="size-4" aria-hidden="true" />
                            <span className="sr-only sm:not-sr-only">New task</span>
                        </button>
                    )}
                </div>
            </div>

            {showFilters && (
                <div className="mb-5 rounded-xl border border-border bg-card p-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                        <FilterSelect
                            icon={<span className="size-2 rounded-full bg-amber-500" />}
                            ariaLabel="Filter by priority"
                            value={filters.priority}
                            onChange={(value) => updateFilter("priority", value)}
                        >
                            <option value="ALL">All priorities</option>
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="URGENT">Urgent</option>
                        </FilterSelect>

                        <FilterSelect
                            icon={<span className="size-2 rounded-full bg-blue-500" />}
                            ariaLabel="Filter by status"
                            value={filters.status}
                            onChange={(value) => updateFilter("status", value)}
                        >
                            <option value="ALL">All statuses</option>
                            {TASK_COLUMNS.map((column) => (
                                <option key={column.status} value={column.status}>
                                    {column.label}
                                </option>
                            ))}
                        </FilterSelect>

                        <FilterSelect
                            icon={<UserRound className="size-3.5 text-slate-400" />}
                            ariaLabel="Filter by assignee"
                            value={filters.assignee}
                            onChange={(value) => updateFilter("assignee", value)}
                        >
                            <option value="ALL">All assignees</option>
                            <option value="UNASSIGNED">Unassigned</option>
                            {uniqueAssignees.map((assignee) => (
                                <option key={assignee.email} value={assignee.email}>
                                    {assignee.name ?? assignee.email}
                                </option>
                            ))}
                        </FilterSelect>

                        {labels.length > 0 && (
                            <FilterSelect
                                icon={<Tag className="size-3.5 text-slate-400" />}
                                ariaLabel="Filter by label"
                                value={filters.label}
                                onChange={(value) => updateFilter("label", value)}
                            >
                                <option value="ALL">All labels</option>
                                {labels.map((label) => (
                                    <option key={label.id} value={label.id}>
                                        {label.name}
                                    </option>
                                ))}
                            </FilterSelect>
                        )}
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-white/[0.06]">
                        <p className="text-xs text-muted-foreground">
                            Showing{" "}
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                                {filteredTasks.length}
                            </span>{" "}
                            of{" "}
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                                {allTasks.length}
                            </span>{" "}
                            tasks
                        </p>

                        {hasFilters && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                            >
                                <X className="size-3.5" />
                                Clear filters
                            </button>
                        )}
                    </div>
                </div>
            )}

            {panelFilterCount > 0 && !showFilters && (
                <div className="mb-4 flex flex-wrap items-center gap-2">

                    {filters.priority !== "ALL" && (
                        <FilterChip
                            label={`Priority: ${getPriorityLabel(filters.priority)}`}
                            onRemove={() => updateFilter("priority", "ALL")}
                        />
                    )}

                    {filters.status !== "ALL" && (
                        <FilterChip
                            label={`Status: ${getStatusLabel(filters.status)}`}
                            onRemove={() => updateFilter("status", "ALL")}
                        />
                    )}

                    {filters.assignee !== "ALL" && (
                        <FilterChip
                            label={`Assignee: ${
                                filters.assignee === "UNASSIGNED"
                                    ? "Unassigned"
                                    : getAssigneeLabel(filters.assignee, uniqueAssignees)
                            }`}
                            onRemove={() => updateFilter("assignee", "ALL")}
                        />
                    )}

                    {filters.label !== "ALL" && (
                        <FilterChip
                            label={`Label: ${labels.find((l) => l.id === filters.label)?.name ?? "Removed label"}`}
                            onRemove={() => updateFilter("label", "ALL")}
                        />
                    )}

                    <button
                        type="button"
                        onClick={clearFilters}
                        className="text-xs font-medium text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200"
                    >
                        Clear all
                    </button>
                </div>
            )}

            {error && (
                <p
                    role="alert"
                    className="mb-4 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger"
                >
                    {error}
                </p>
            )}

            {filteredTasks.length === 0 && allTasks.length > 0 && (
                <div className="mb-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center dark:border-white/10 dark:bg-white/[0.02]">
                    <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/[0.06]">
                        <Search className="size-5 text-slate-400" />
                    </div>

                    <h3 className="mt-3 text-sm font-semibold">No tasks found</h3>

                    <p className="mt-1 text-xs text-muted-foreground">
                        Try changing your filters or search.
                    </p>

                    <button
                        type="button"
                        onClick={clearFilters}
                        className="mt-4 text-xs font-medium text-brand hover:text-brand-strong"
                    >
                        Clear filters
                    </button>
                </div>
            )}

            <DndContext
                id="project-kanban"
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
            >
                <div
                    role="group"
                    aria-label="Board columns"
                    className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-4"
                >
                    {TASK_COLUMNS.map((column) => (
                        <Column
                            key={column.status}
                            status={column.status}
                            label={column.label}
                            tasks={filteredColumns[column.status]}
                            slug={slug}
                            projectId={projectId}
                            canEdit={canEdit}
                            onAdd={openDialog}
                        />
                    ))}
                </div>

                <DragOverlay>
                    {activeTask ? <TaskCard task={activeTask} overlay /> : null}
                </DragOverlay>
            </DndContext>

            {canEdit && (
                <CreateTaskDialog
                    open={dialog.open}
                    onClose={closeDialog}
                    slug={slug}
                    projectId={projectId}
                    defaultStatus={dialog.status}
                    members={members}
                />
            )}
            {confirmDone.dialog}
        </div>
    );
}