

export function ProgressBar({
                         done,
                         total,
                         percent,
                     }: {
    done: number;
    total: number;
    percent: number;
}) {
    const complete = total > 0 && done === total;

    return (
        <section
            aria-label="Project progress"
            className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm"
        >
            <div className="flex items-baseline justify-between gap-4">
                <div>
                    <h2 className="text-sm font-semibold text-foreground">
                        Progress
                    </h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        {total === 0
                            ? "Add tasks to start tracking progress."
                            : `${done} of ${total} tasks completed`}
                    </p>
                </div>
                <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                    {percent}%
                </span>
            </div>

            <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                aria-label="Tasks completed"
                className="mt-4 h-2 overflow-hidden rounded-full bg-muted"
            >
                <div
                    className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${complete ? "bg-emerald-500" : "bg-foreground"
                    }`}
                    style={{ width: `${percent}%` }}
                />
            </div>
        </section>
    );
}