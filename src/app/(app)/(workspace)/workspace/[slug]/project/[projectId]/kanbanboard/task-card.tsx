"use client";

import Link from "next/link";
import { CalendarDays, CheckSquare } from "lucide-react";

import { cn } from "@/lib/utils";
import { useLiveHighlights } from "@/lib/realtime/live-highlight";
import { cardStyles } from "@/components/ui/Card";
import { PRIORITY_META } from "@/lib/task-status";
import { Avatar } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/kanbanboard/avatar";
import type { BoardTask } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/kanbanboard/kanban-types";

// Priority chips: a soft tint of the priority's color, strongest for urgent.
const PRIORITY_CHIP: Record<string, string> = {
    LOW: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    MEDIUM: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
    HIGH: "bg-orange-500/12 text-orange-700 dark:text-orange-300",
    URGENT: "bg-danger/12 text-danger",
};

const PRIORITY_DOT_STYLES: Record<string, string> = {
    LOW: "bg-sky-500",
    MEDIUM: "bg-amber-500",
    HIGH: "bg-orange-500",
    URGENT: "bg-danger",
};

const CHIP = "inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[11.5px] font-medium tabular-nums";

const TITLE_CLASS =
    "min-w-0 flex-1 break-words text-[13.5px] font-medium leading-5 text-foreground";

export function TaskCard({
                             task,
                             href,
                             handle,
                             overlay,
                         }: {
    task: BoardTask;
    href?: string;
    handle?: React.ReactNode;
    overlay?: boolean;
}) {
    const priorityKey = task.priority as keyof typeof PRIORITY_META;
    const priority = PRIORITY_META[priorityKey] ?? PRIORITY_META.MEDIUM;
    const priorityChip = PRIORITY_CHIP[priorityKey] ?? PRIORITY_CHIP.MEDIUM;
    // A teammate just changed this card: let it glow for a moment.
    const justChanged = useLiveHighlights().has(task.id) && !overlay;
    const priorityDot =
        PRIORITY_DOT_STYLES[priorityKey] ?? PRIORITY_DOT_STYLES.MEDIUM;

    return (
        <div
            className={cn(
                cardStyles,
                "group relative rounded-lg p-3",
                "transition-[border-color,box-shadow,transform] duration-200",
                !overlay &&
                    "hover:border-foreground/15 hover:shadow-[0_6px_16px_-8px_rgba(23,26,33,0.18)] motion-safe:hover:-translate-y-px",
                task.status === "DONE" && !overlay && "bg-card/70",
                justChanged && "border-brand/50 motion-safe:animate-[live-glow_2.4s_ease-out]",
                overlay && "rotate-1 shadow-lg ring-1 ring-brand/30",
            )}
        >
            <div className="flex items-start gap-2">
                {handle && (
                    <div className="shrink-0 pt-0.5 opacity-40 transition-opacity group-hover:opacity-100">
                        {handle}
                    </div>
                )}

                {href ? (
                    <Link
                        href={href}
                        className={cn(
                            TITLE_CLASS,
                            "rounded-sm transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                        )}
                    >
                        {task.title}
                    </Link>
                ) : (
                    <p className={TITLE_CLASS}>{task.title}</p>
                )}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <span className={cn(CHIP, priorityChip)}>
                        <span
                            className={cn(
                                "size-1.5 shrink-0 rounded-full",
                                priorityDot,
                            )}
                        />
                        {priority.label}
                    </span>

                    {task.dueLabel && (
                        <span
                            className={cn(
                                CHIP,
                                task.overdue
                                    ? "bg-danger/10 text-danger"
                                    : "bg-muted text-muted-foreground",
                            )}
                        >
                            <CalendarDays className="size-3" aria-hidden="true" />
                            {task.dueLabel}
                        </span>
                    )}

                    {task.subtaskTotal > 0 && (
                        <span
                            className={cn(
                                CHIP,
                                task.subtaskDone === task.subtaskTotal
                                    ? "bg-status-done/12 text-status-done"
                                    : "bg-muted text-muted-foreground",
                            )}
                        >
                            <CheckSquare className="size-3" aria-hidden="true" />
                            {task.subtaskDone}/{task.subtaskTotal}
                        </span>
                    )}
                </div>

                {task.assignee && <Avatar assignee={task.assignee} />}
            </div>
        </div>
    );
}