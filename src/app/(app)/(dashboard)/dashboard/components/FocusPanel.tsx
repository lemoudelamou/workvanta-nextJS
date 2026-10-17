import Link from "next/link";
import { ArrowRight, CalendarClock, CircleAlert, CircleCheckBig, Sun } from "lucide-react";

import { projectDot } from "@/lib/navigation/project-color";
import type { Focus } from "./types";

const STATUS_DOT: Record<string, string> = {
    TODO: "bg-status-todo",
    IN_PROGRESS: "bg-status-progress",
    IN_REVIEW: "bg-status-review",
    DONE: "bg-status-done",
};

const STATUS_LABEL: Record<string, string> = {
    TODO: "To do",
    IN_PROGRESS: "In progress",
    IN_REVIEW: "In review",
    DONE: "Done",
};

/** One-line summary for the page header, e.g. "1 overdue and 2 due today." */
export function focusSummary(focus: Focus) {
    const parts: string[] = [];
    if (focus.overdue) parts.push(`${focus.overdue} overdue`);
    if (focus.today) parts.push(`${focus.today} due today`);
    if (!parts.length && focus.week) parts.push(`${focus.week} due this week`);
    if (!parts.length) {
        return focus.upNext.length
            ? "Nothing urgent. Here's what's on your plate."
            : "Nothing assigned to you is open. Enjoy the calm.";
    }
    const list = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts[0];
    return `You have ${list}.`;
}

function Tile({
    href,
    count,
    label,
    icon,
    tone,
}: {
    href: string;
    count: number;
    label: string;
    icon: React.ReactNode;
    tone: "danger" | "amber" | "brand";
}) {
    const active = count > 0;
    const tones = {
        danger: active ? "border-danger/25 bg-danger/[0.06] text-danger" : "",
        amber: active ? "border-amber-500/30 bg-amber-500/[0.08] text-amber-700 dark:text-amber-300" : "",
        brand: active ? "border-brand/25 bg-brand-soft/70 text-brand dark:bg-brand/10" : "",
    } as const;

    return (
        <Link
            href={href}
            className={`group flex min-w-0 flex-col justify-between rounded-xl border p-4 outline-none transition-[transform,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-brand motion-safe:hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-12px_rgba(23,26,33,0.25)] ${
                active ? tones[tone] : "border-border bg-card text-muted-foreground"
            }`}
        >
            <span className="flex items-center justify-between">
                <span aria-hidden="true" className="opacity-80">{icon}</span>
                <ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-70" aria-hidden="true" />
            </span>
            <span className="mt-3 block text-3xl font-semibold tabular-nums tracking-tight">{count}</span>
            <span className="mt-0.5 block truncate text-xs font-medium sm:text-sm">{label}</span>
        </Link>
    );
}

export function FocusPanel({ focus, footer }: { focus: Focus; footer?: React.ReactNode }) {
    return (
        <section aria-labelledby="focus-title" className="mt-8 grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
            <h2 id="focus-title" className="sr-only">
                Your focus
            </h2>

            <div className="self-start">
            <div className="grid grid-cols-3 gap-3">
                <Tile href="/tasks" count={focus.overdue} label="Overdue" tone="danger" icon={<CircleAlert className="size-5" />} />
                <Tile href="/tasks" count={focus.today} label="Due today" tone="amber" icon={<Sun className="size-5" />} />
                <Tile href="/tasks" count={focus.week} label="This week" tone="brand" icon={<CalendarClock className="size-5" />} />
            </div>
            {footer}
            </div>

            <div className="rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <h3 className="text-sm font-semibold text-foreground">Up next for you</h3>
                    <Link href="/tasks" className="group inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                        All my tasks
                        <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </Link>
                </div>

                {focus.upNext.length === 0 ? (
                    <div className="flex items-center gap-3 px-4 py-6 text-sm text-muted-foreground">
                        <span className="flex size-9 items-center justify-center rounded-full bg-status-done/12 text-status-done">
                            <CircleCheckBig className="size-4.5" aria-hidden="true" />
                        </span>
                        Nothing assigned to you is open right now.
                    </div>
                ) : (
                    <ul className="divide-y divide-border">
                        {focus.upNext.map((task) => (
                            <li key={task.id}>
                                <Link
                                    href={task.href}
                                    className="flex items-center gap-3 px-4 py-2.5 outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted/60"
                                >
                                    <span
                                        className={`size-2 shrink-0 rounded-full ${STATUS_DOT[task.status] ?? "bg-status-todo"}`}
                                        title={STATUS_LABEL[task.status]}
                                        aria-label={STATUS_LABEL[task.status]}
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-medium text-foreground">{task.title}</span>
                                        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <span aria-hidden="true" className={`size-1.5 rounded-[2px] ${projectDot(task.project.id)}`} />
                                            <span className="truncate">{task.project.name}</span>
                                        </span>
                                    </span>
                                    {task.dueLabel && (
                                        <span
                                            className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium tabular-nums ${
                                                task.overdue ? "bg-danger/10 text-danger" : "bg-muted text-muted-foreground"
                                            }`}
                                        >
                                            {task.dueLabel}
                                        </span>
                                    )}
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}
