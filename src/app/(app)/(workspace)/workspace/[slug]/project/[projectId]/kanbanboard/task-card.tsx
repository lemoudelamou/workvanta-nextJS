import Link from "next/link";
import { CalendarDays, CheckSquare } from "lucide-react";

import { cn } from "@/lib/utils";
import { cardStyles } from "@/components/ui/Card";
import { PRIORITY_META } from "@/lib/task-status";
import { Avatar } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/kanbanboard/avatar";
import type { BoardTask } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/kanbanboard/kanban-types";

// Priority is a quiet signal; only urgent work is allowed to shout.
const PRIORITY_TEXT: Record<string, string> = {
    LOW: "text-muted-foreground",
    MEDIUM: "text-muted-foreground",
    HIGH: "text-foreground",
    URGENT: "text-danger",
};

const PRIORITY_DOT_STYLES: Record<string, string> = {
    LOW: "bg-sky-400",
    MEDIUM: "bg-amber-400",
    HIGH: "bg-orange-500",
    URGENT: "bg-danger",
};

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
    const priorityText = PRIORITY_TEXT[priorityKey] ?? PRIORITY_TEXT.MEDIUM;
    const priorityDot =
        PRIORITY_DOT_STYLES[priorityKey] ?? PRIORITY_DOT_STYLES.MEDIUM;

    return (
        <div
            className={cn(
                cardStyles,
                "group relative rounded-lg p-3",
                "transition-colors",
                !overlay && "hover:border-foreground/20",
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
                    <span
                        className={cn(
                            "inline-flex items-center gap-1.5 text-xs font-medium",
                            priorityText,
                        )}
                    >
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
                                "inline-flex items-center gap-1 text-xs tabular-nums",
                                task.overdue
                                    ? "font-medium text-danger"
                                    : "text-muted-foreground",
                            )}
                        >
                            <CalendarDays className="size-3" />
                            {task.dueLabel}
                        </span>
                    )}

                    {task.subtaskTotal > 0 && (
                        <span
                            className={cn(
                                "inline-flex items-center gap-1 text-xs tabular-nums",
                                task.subtaskDone === task.subtaskTotal
                                    ? "text-status-done"
                                    : "text-muted-foreground",
                            )}
                        >
                            <CheckSquare className="size-3" />
                            {task.subtaskDone}/{task.subtaskTotal}
                        </span>
                    )}
                </div>

                {task.assignee && <Avatar assignee={task.assignee} />}
            </div>
        </div>
    );
}