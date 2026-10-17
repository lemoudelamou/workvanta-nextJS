import { TASK_COLUMNS, type TaskStatus } from "@/lib/task-status";

const SEGMENT: Record<TaskStatus, string> = {
    TODO: "bg-status-todo",
    IN_PROGRESS: "bg-status-progress",
    IN_REVIEW: "bg-status-review",
    DONE: "bg-status-done",
};

/**
 * One bar showing how a project's work is split across the four statuses,
 * with the numbers that matter next to it. Replaces a row of stat cards so
 * the board itself stays near the top of the page.
 */
export function StatusRail({
    counts,
    overdue,
    members,
}: {
    counts: Record<TaskStatus, number>;
    overdue: number;
    members: number;
}) {
    const total = TASK_COLUMNS.reduce((sum, { status }) => sum + counts[status], 0);
    const percentDone = total ? Math.round((counts.DONE / total) * 100) : 0;

    return (
        <section
            aria-label="Project progress"
            className="rounded-xl border border-border bg-card px-5 py-4 shadow-[0_1px_2px_rgba(23,26,33,0.04)]"
        >
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <p className="text-sm text-muted-foreground">
                    <span className="text-lg font-semibold tabular-nums text-foreground">
                        {percentDone}%
                    </span>{" "}
                    done{" "}
                    <span className="tabular-nums">
                        ({counts.DONE} of {total} {total === 1 ? "task" : "tasks"})
                    </span>
                </p>

                <div className="flex items-center gap-4 text-sm">
                    {overdue > 0 ? (
                        <span className="font-medium text-danger tabular-nums">
                            {overdue} overdue
                        </span>
                    ) : (
                        total > 0 && <span className="text-muted-foreground">Nothing overdue</span>
                    )}
                    <span className="text-muted-foreground tabular-nums">
                        {members} {members === 1 ? "member" : "members"}
                    </span>
                </div>
            </div>

            <div
                className="mt-3 flex h-2 origin-left gap-0.5 overflow-hidden rounded-full bg-muted motion-safe:animate-[bar-grow_800ms_cubic-bezier(.2,.8,.2,1)_both]"
                role="img"
                aria-label={TASK_COLUMNS.map(
                    ({ status, label }) => `${label}: ${counts[status]}`,
                ).join(", ")}
            >
                {total > 0 &&
                    TASK_COLUMNS.map(({ status }) =>
                        counts[status] > 0 ? (
                            <div
                                key={status}
                                className={`${SEGMENT[status]} first:rounded-l-full last:rounded-r-full`}
                                style={{ flexGrow: counts[status] }}
                            />
                        ) : null,
                    )}
            </div>

            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                {TASK_COLUMNS.map(({ status, label }) => (
                    <li key={status} className="inline-flex items-center gap-1.5">
                        <span aria-hidden="true" className={`size-2 rounded-full ${SEGMENT[status]}`} />
                        {label}
                        <span className="font-medium tabular-nums text-foreground">
                            {counts[status]}
                        </span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
