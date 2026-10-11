import Link from "next/link";
import { CalendarDays, CheckSquare } from "lucide-react";

import { cn } from "@/lib/utils";
import { cardStyles } from "@/components/ui/Card";
import { PRIORITY_META } from "@/lib/task-status";
import { Avatar } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/kanbanboard/avatar";
import type { BoardTask } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/kanbanboard/kanban-types";

const PRIORITY_STYLES: Record<string, string> = {
    LOW: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300",
    MEDIUM:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300",
    HIGH: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300",
    URGENT:
        "border-red-300 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300",
};

const PRIORITY_DOT_STYLES: Record<string, string> = {
    LOW: "bg-emerald-500",
    MEDIUM: "bg-amber-500",
    HIGH: "bg-rose-500",
    URGENT: "bg-red-500",
};

const TITLE_CLASS =
    "min-w-0 flex-1 break-words text-[13px] font-semibold leading-5 text-slate-900 dark:text-slate-100";

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
    const priorityStyle = PRIORITY_STYLES[priorityKey] ?? PRIORITY_STYLES.MEDIUM;
    const priorityDot =
        PRIORITY_DOT_STYLES[priorityKey] ?? PRIORITY_DOT_STYLES.MEDIUM;

    return (
        <div
            className={cn(
                cardStyles,
                "group relative overflow-hidden rounded-xl p-3.5",
                "transition-all duration-200",
                !overlay &&
                "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:hover:border-white/15",
                overlay && "rotate-2 shadow-xl",
            )}
        >
            {/* Priority accent */}
            <div
                className={cn(
                    "absolute inset-y-0 left-0 w-0.5 opacity-70",
                    priorityDot,
                )}
            />

            <div className="flex items-start gap-2.5 pl-1">
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
                            "transition-colors hover:text-violet-700 dark:hover:text-violet-300",
                        )}
                    >
                        {task.title}
                    </Link>
                ) : (
                    <p className={TITLE_CLASS}>{task.title}</p>
                )}
            </div>

            <div className="mt-3.5 flex items-center justify-between gap-2 pl-1">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <span
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide",
                            priorityStyle,
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
                                "inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-medium",
                                task.overdue
                                    ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300"
                                    : "text-slate-500 dark:text-slate-400",
                            )}
                        >
                            <CalendarDays className="size-3" />
                            {task.dueLabel}
                        </span>
                    )}

                    {task.subtaskTotal > 0 && (
                        <span
                            className={cn(
                                "inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-medium",
                                task.subtaskDone === task.subtaskTotal
                                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
                                    : "text-slate-500 dark:text-slate-400",
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