"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    pointerWithin,
    rectIntersection,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
    type CollisionDetection,
    type DragEndEvent,
    type DragStartEvent,
} from "@dnd-kit/core";
import { ChevronLeft, ChevronRight, CircleSlash, Lock, Repeat } from "lucide-react";

import { cn } from "@/lib/utils";
import { beginInteraction, endInteraction } from "@/lib/realtime/interaction-lock";
import type { BoardTask } from "../kanbanboard/kanban-types";
import { rescheduleTaskAction } from "../planning-actions";
import {
    dueDay,
    longDayLabel,
    monthGrid,
    monthLabel,
    shiftMonth,
    shortDayLabel,
    tasksByDay,
    WEEKDAYS,
} from "./calendar-utils";

const STATUS_DOT: Record<string, string> = {
    TODO: "bg-status-todo",
    IN_PROGRESS: "bg-status-progress",
    IN_REVIEW: "bg-status-review",
    DONE: "bg-status-done",
};

/** Drop on the day under the pointer; keyboard moves use the chip's position. */
const dropTarget: CollisionDetection = (args) => (args.pointerCoordinates ? pointerWithin(args) : rectIntersection(args));

/** Tasks shown in a day before "+N more". */
const PER_DAY = 3;
const UNSCHEDULED = "unscheduled";

type Props = {
    slug: string;
    projectId: string;
    tasks: BoardTask[];
    /** "2026-10" */
    month: string;
    /** "2026-10-17", worked out on the server so both renders agree. */
    today: string;
    canEdit: boolean;
    /** Shown at the start of the toolbar, e.g. the view switch. */
    leading?: ReactNode;
};

function withDay(task: BoardTask, day: string | null, today: string): BoardTask {
    return {
        ...task,
        dueAt: day ? `${day}T23:59:59.000Z` : null,
        dueLabel: day ? shortDayLabel(day) : null,
        overdue: !!day && day < today && task.status !== "DONE",
    };
}

/**
 * The project's tasks on a month calendar, by due date. Editors drag a task
 * to another day, or onto "No due date" to take it off the calendar. Phones
 * get the same month as a list of days.
 */
export function ProjectCalendar({ slug, projectId, tasks, month, today, canEdit, leading }: Props) {
    const [items, setItems] = useState(tasks);
    const [syncedFrom, setSyncedFrom] = useState(tasks);
    if (syncedFrom !== tasks) {
        setSyncedFrom(tasks);
        setItems(tasks);
    }
    const [dragging, setDragging] = useState<BoardTask | null>(null);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        // Space picks a task up; Enter still opens it.
        useSensor(KeyboardSensor, { keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] } }),
    );

    // Live refreshes wait while a task is held; leaving mid-drag lets them go.
    const holding = useRef(false);
    useEffect(
        () => () => {
            if (holding.current) endInteraction();
        },
        [],
    );
    function release() {
        if (holding.current) endInteraction();
        holding.current = false;
    }

    const weeks = useMemo(() => monthGrid(month), [month]);
    const byDay = useMemo(() => tasksByDay(items), [items]);
    const unscheduled = items.filter((t) => !t.dueAt && t.status !== "DONE");
    const base = `/workspace/${slug}/project/${projectId}`;
    const monthHref = (m: string) => `${base}?view=calendar&month=${m}`;
    const taskHref = (task: BoardTask) => `${base}/tasks/${task.id}`;
    const inMonth = [...byDay.keys()].filter((d) => d.startsWith(month)).sort();
    const monthCount = inMonth.reduce((n, d) => n + (byDay.get(d)?.length ?? 0), 0);

    function onDragStart(event: DragStartEvent) {
        beginInteraction();
        holding.current = true;
        setError(null);
        setDragging(items.find((t) => t.id === event.active.id) ?? null);
    }

    function onDragEnd(event: DragEndEvent) {
        const task = dragging;
        setDragging(null);
        release();
        const target = event.over?.id;
        if (!task || typeof target !== "string") return;

        const day = target === UNSCHEDULED ? null : target.replace(/^day:/, "");
        if (day === dueDay(task.dueAt)) return;

        const previous = items;
        setItems((all) => all.map((t) => (t.id === task.id ? withDay(t, day, today) : t)));
        startTransition(async () => {
            const result = await rescheduleTaskAction(slug, projectId, task.id, day);
            if (result.error) {
                setItems(previous);
                setError(`Couldn't move “${task.title}”: ${result.error}`);
            }
        });
    }

    const toolbar = (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
                {/* Its own slot: it comes from the server page, next to static siblings. */}
                <div className="contents">{leading}</div>
                <div className="flex items-center gap-1">
                    <Link
                        href={monthHref(shiftMonth(month, -1))}
                        aria-label="Previous month"
                        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand"
                    >
                        <ChevronLeft className="size-4" aria-hidden="true" />
                    </Link>
                    <h2 className="min-w-[9.5rem] text-center text-[15px] font-semibold tracking-tight text-foreground" aria-live="polite">
                        {monthLabel(month)}
                    </h2>
                    <Link
                        href={monthHref(shiftMonth(month, 1))}
                        aria-label="Next month"
                        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand"
                    >
                        <ChevronRight className="size-4" aria-hidden="true" />
                    </Link>
                </div>
                {month !== today.slice(0, 7) && (
                    <Link
                        href={monthHref(today.slice(0, 7))}
                        className="inline-flex h-8 items-center rounded-lg border border-border bg-card px-3 text-[13px] font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-brand"
                    >
                        Today
                    </Link>
                )}
            </div>
            <p className="text-xs text-muted-foreground">
                {monthCount === 0
                    ? "Nothing due this month."
                    : `${monthCount} ${monthCount === 1 ? "task" : "tasks"} due this month`}
                {canEdit && monthCount + unscheduled.length > 0 && (
                    <span className="hidden md:inline"> · Drag a task to change its due date</span>
                )}
            </p>
        </div>
    );

    return (
        <div>
            {toolbar}
            {error && (
                <p role="alert" className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
                    {error}
                </p>
            )}

            {/* Phones: the month as a list of days. */}
            <div className="md:hidden">
                <Agenda days={inMonth} byDay={byDay} today={today} unscheduled={unscheduled} taskHref={taskHref} />
            </div>

            <div className="hidden md:block">
                <DndContext
                    id="project-calendar"
                    sensors={sensors}
                    collisionDetection={dropTarget}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    onDragCancel={() => {
                        setDragging(null);
                        release();
                    }}
                >
                    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
                        <div
                            role="grid"
                            aria-label={`Tasks due in ${monthLabel(month)}`}
                            className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(23,26,33,0.04)]"
                        >
                            <div role="row" className="grid grid-cols-7 border-b border-border bg-muted/40">
                                {WEEKDAYS.map((name) => (
                                    <div
                                        key={name}
                                        role="columnheader"
                                        className="px-2.5 py-2 text-[11.5px] font-medium text-muted-foreground"
                                    >
                                        {name}
                                    </div>
                                ))}
                            </div>
                            {weeks.map((week) => (
                                <div role="row" key={week[0].day} className="grid grid-cols-7 border-b border-border last:border-b-0">
                                    {week.map((cell) => (
                                        <DayCell
                                            key={cell.day}
                                            day={cell.day}
                                            date={cell.date}
                                            inMonth={cell.inMonth}
                                            isToday={cell.day === today}
                                            isPast={cell.day < today}
                                            tasks={byDay.get(cell.day) ?? []}
                                            expanded={expanded === cell.day}
                                            onExpand={() => setExpanded(expanded === cell.day ? null : cell.day)}
                                            canEdit={canEdit}
                                            taskHref={taskHref}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>

                        <Unscheduled tasks={unscheduled} canEdit={canEdit} taskHref={taskHref} />
                    </div>

                    <DragOverlay dropAnimation={null}>
                        {dragging && <Chip task={dragging} overlay />}
                    </DragOverlay>
                </DndContext>
            </div>
        </div>
    );
}

function DayCell({
    day,
    date,
    inMonth,
    isToday,
    isPast,
    tasks,
    expanded,
    onExpand,
    canEdit,
    taskHref,
}: {
    day: string;
    date: number;
    inMonth: boolean;
    isToday: boolean;
    isPast: boolean;
    tasks: BoardTask[];
    expanded: boolean;
    onExpand: () => void;
    canEdit: boolean;
    taskHref: (task: BoardTask) => string;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: `day:${day}`, disabled: !canEdit });
    const shown = expanded ? tasks : tasks.slice(0, PER_DAY);
    const hidden = tasks.length - shown.length;

    return (
        <div
            ref={setNodeRef}
            role="gridcell"
            aria-label={`${longDayLabel(day)}${tasks.length ? `, ${tasks.length} due` : ""}`}
            className={cn(
                "min-h-[7.5rem] border-r border-border p-1.5 transition-colors last:border-r-0",
                !inMonth && "bg-muted/35",
                isOver && "bg-brand-soft/70 ring-2 ring-inset ring-brand/40 dark:bg-brand/10",
            )}
        >
            <div className="mb-1 flex items-center justify-between px-1">
                <span
                    className={cn(
                        "flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                        isToday
                            ? "bg-brand font-semibold text-white dark:text-[#0f1115]"
                            : inMonth
                              ? isPast
                                  ? "text-muted-foreground"
                                  : "font-medium text-foreground"
                              : "text-muted-foreground/60",
                    )}
                >
                    {date}
                </span>
            </div>
            <ul className="space-y-1">
                {shown.map((task) => (
                    <li key={task.id}>
                        <DraggableChip task={task} canEdit={canEdit} href={taskHref(task)} />
                    </li>
                ))}
            </ul>
            {(hidden > 0 || expanded) && tasks.length > PER_DAY && (
                <button
                    type="button"
                    onClick={onExpand}
                    className="mt-1 w-full rounded-md px-1.5 py-0.5 text-left text-[11.5px] font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand"
                >
                    {expanded ? "Show less" : `+${hidden} more`}
                </button>
            )}
        </div>
    );
}

function Unscheduled({
    tasks,
    canEdit,
    taskHref,
}: {
    tasks: BoardTask[];
    canEdit: boolean;
    taskHref: (task: BoardTask) => string;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: UNSCHEDULED, disabled: !canEdit });
    return (
        <section
            ref={setNodeRef}
            aria-labelledby="unscheduled-heading"
            className={cn(
                "rounded-xl border border-dashed border-border bg-card/60 p-3 transition-colors",
                isOver && "border-brand/50 bg-brand-soft/60 dark:bg-brand/10",
            )}
        >
            <h3 id="unscheduled-heading" className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
                <CircleSlash className="size-3.5 text-muted-foreground" aria-hidden="true" />
                No due date
                <span className="ml-auto text-xs font-normal tabular-nums text-muted-foreground">{tasks.length}</span>
            </h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {tasks.length === 0
                    ? canEdit
                        ? "Every open task has a date. Drop one here to clear it."
                        : "Every open task has a date."
                    : canEdit
                      ? "Drag onto a day to schedule."
                      : "Open tasks without a date."}
            </p>
            {tasks.length > 0 && (
                <ul className="mt-2.5 max-h-[28rem] space-y-1 overflow-y-auto">
                    {tasks.map((task) => (
                        <li key={task.id}>
                            <DraggableChip task={task} canEdit={canEdit} href={taskHref(task)} />
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

function DraggableChip({ task, canEdit, href }: { task: BoardTask; canEdit: boolean; href: string }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, disabled: !canEdit });
    // It's a link first: keep the link role, borrow the drag hints.
    const { role: _role, tabIndex: _tabIndex, ...dragAttributes } = attributes;
    return (
        <Link
            ref={setNodeRef}
            href={href}
            {...(canEdit ? listeners : {})}
            {...(canEdit ? dragAttributes : {})}
            aria-roledescription={canEdit ? "draggable task" : undefined}
            className={cn(
                "block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand",
                canEdit && "touch-none",
                isDragging && "opacity-30",
            )}
        >
            <Chip task={task} />
        </Link>
    );
}

function Chip({ task, overlay, plain }: { task: BoardTask; overlay?: boolean; plain?: boolean }) {
    const done = task.status === "DONE";
    const blocked = (task.openBlockers ?? 0) > 0 && !done;
    return (
        <span
            className={cn(
                "flex min-w-0 gap-1.5 transition-colors",
                plain ? "items-center" : "items-start",
                plain
                    ? cn("w-full text-sm", task.overdue ? "text-danger" : "text-foreground")
                    : cn(
                          "rounded-md border px-1.5 py-1 text-[12px] leading-4",
                          task.overdue
                              ? "border-danger/25 bg-danger/[0.07] text-danger hover:bg-danger/[0.12]"
                              : "border-border bg-background text-foreground hover:border-foreground/20 dark:bg-white/[0.03]",
                      ),
                done && "text-muted-foreground",
                overlay && "w-48 rotate-1 shadow-lg ring-1 ring-brand/30",
            )}
            title={task.title}
        >
            <span
                aria-hidden="true"
                className={cn("size-1.5 shrink-0 rounded-full", !plain && "mt-[5px]", STATUS_DOT[task.status] ?? "bg-status-todo")}
            />
            <span
                className={cn(
                    "min-w-0 flex-1 font-medium",
                    plain ? "truncate" : "line-clamp-2 break-words",
                    done && "line-through decoration-foreground/30",
                )}
            >
                {task.title}
            </span>
            {blocked && <Lock className="mt-0.5 size-3 shrink-0 text-amber-600 dark:text-amber-400" aria-label="Blocked" />}
            {task.recurrence && <Repeat className="mt-0.5 size-3 shrink-0 text-muted-foreground" aria-label="Repeats" />}
        </span>
    );
}

function Agenda({
    days,
    byDay,
    today,
    unscheduled,
    taskHref,
}: {
    days: string[];
    byDay: Map<string, BoardTask[]>;
    today: string;
    unscheduled: BoardTask[];
    taskHref: (task: BoardTask) => string;
}) {
    if (days.length === 0 && unscheduled.length === 0) {
        return (
            <p className="rounded-xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
                Nothing due this month.
            </p>
        );
    }
    const groups = [
        ...days.map((day) => ({ key: day, title: day === today ? `Today, ${shortDayLabel(day)}` : longDayLabel(day), tasks: byDay.get(day) ?? [] })),
        ...(unscheduled.length ? [{ key: UNSCHEDULED, title: "No due date", tasks: unscheduled }] : []),
    ];
    return (
        <div className="space-y-4">
            {groups.map((group) => (
                <section key={group.key} aria-label={group.title}>
                    <h3 className={cn("mb-1.5 px-1 text-xs font-semibold", group.key === today ? "text-brand" : "text-muted-foreground")}>
                        {group.title}
                    </h3>
                    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                        {group.tasks.map((task) => (
                            <li key={task.id}>
                                <Link
                                    href={taskHref(task)}
                                    className="flex items-center gap-2.5 px-3.5 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
                                >
                                    <Chip task={task} plain />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    );
}
