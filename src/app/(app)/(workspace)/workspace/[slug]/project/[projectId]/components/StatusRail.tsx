import { AlertCircle, CalendarClock, UserRound } from "lucide-react";

import { ProgressRing } from "@/components/ui/ProgressRing";
import { TASK_COLUMNS, type TaskStatus } from "@/lib/task-status";

const SEGMENT: Record<TaskStatus, string> = {
    TODO: "bg-status-todo",
    IN_PROGRESS: "bg-status-progress",
    IN_REVIEW: "bg-status-review",
    DONE: "bg-status-done",
};

function Stat({ icon, tone, children }: { icon: React.ReactNode; tone?: "danger"; children: React.ReactNode }) {
    return (
        <li
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium [&>svg]:size-3.5 ${
                tone === "danger" ? "bg-danger/10 text-danger" : "bg-foreground/[0.05] text-muted-foreground"
            }`}
        >
            {icon}
            {children}
        </li>
    );
}

/**
 * The project's progress in one line: share done, how the work is split
 * across statuses, and what needs attention (late, due soon, unowned).
 */
export function StatusRail({
    counts,
    overdue,
    dueSoon,
    unassigned,
}: {
    counts: Record<TaskStatus, number>;
    overdue: number;
    /** Open tasks due in the next seven days. */
    dueSoon: number;
    /** Open tasks nobody owns. */
    unassigned: number;
}) {
    const total = TASK_COLUMNS.reduce((sum, { status }) => sum + counts[status], 0);
    const percentDone = total ? Math.round((counts.DONE / total) * 100) : 0;

    return (
        <section
            aria-label="Project progress"
            className="flex flex-col gap-4 rounded-xl border border-border bg-card px-4 py-3.5 shadow-[0_1px_2px_rgba(23,26,33,0.04)] lg:flex-row lg:items-center lg:gap-6"
        >
            <div className="flex items-center gap-3">
                <ProgressRing value={percentDone} size={40} />
                <p className="text-sm leading-tight">
                    <span className="block text-base font-semibold tabular-nums text-foreground">{percentDone}% done</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                        {counts.DONE} of {total} {total === 1 ? "task" : "tasks"}
                    </span>
                </p>
            </div>

            <div className="min-w-0 flex-1">
                <div
                    className="flex h-2 origin-left gap-0.5 overflow-hidden rounded-full bg-muted motion-safe:animate-[bar-grow_800ms_cubic-bezier(.2,.8,.2,1)_both]"
                    role="img"
                    aria-label={TASK_COLUMNS.map(({ status, label }) => `${label}: ${counts[status]}`).join(", ")}
                >
                    {total > 0 &&
                        TASK_COLUMNS.map(({ status }) =>
                            counts[status] > 0 ? (
                                <div key={status} className={SEGMENT[status]} style={{ flexGrow: counts[status] }} />
                            ) : null,
                        )}
                </div>
                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {TASK_COLUMNS.map(({ status, label }) => (
                        <li key={status} className="inline-flex items-center gap-1.5">
                            <span aria-hidden="true" className={`size-2 rounded-full ${SEGMENT[status]}`} />
                            {label}
                            <span className="font-medium tabular-nums text-foreground">{counts[status]}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {total > 0 && (
                <ul aria-label="Needs attention" className="flex flex-wrap items-center gap-1.5">
                    {overdue > 0 ? (
                        <Stat icon={<AlertCircle />} tone="danger">
                            {overdue} overdue
                        </Stat>
                    ) : (
                        <Stat icon={<AlertCircle />}>Nothing overdue</Stat>
                    )}
                    {dueSoon > 0 && <Stat icon={<CalendarClock />}>{dueSoon} due this week</Stat>}
                    {unassigned > 0 && <Stat icon={<UserRound />}>{unassigned} unassigned</Stat>}
                </ul>
            )}
        </section>
    );
}
