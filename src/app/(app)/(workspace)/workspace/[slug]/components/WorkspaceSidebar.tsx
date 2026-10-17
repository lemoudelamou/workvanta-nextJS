import Link from "next/link";
import { CalendarDays, CircleCheckBig } from "lucide-react";

import { AvatarStack } from "@/components/ui/AvatarStack";
import { projectDot } from "@/lib/navigation/project-color";
import { timeAgo } from "@/app/(app)/(workspace)/workspace/components/helpers";

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

const DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export type MyTask = {
    id: string;
    title: string;
    status: string;
    dueDate: Date | null;
    project: { id: string; name: string };
};

export type WorkspaceEvent = {
    id: string;
    action: string;
    metadata: unknown;
    createdAt: Date;
    user: { id: string; name: string | null; email: string; image: string | null };
    task: { id: string; title: string; projectId: string } | null;
};

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
    return (
        <section className="rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(23,26,33,0.04)]">
            <div className="flex items-center justify-between gap-3 px-4 pb-1 pt-3.5">
                <h2 className="text-sm font-semibold text-foreground">{title}</h2>
                {action}
            </div>
            {children}
        </section>
    );
}

/** Open tasks assigned to you in this workspace, soonest due first. */
export function MyTasksPanel({ tasks, slug, now }: { tasks: MyTask[]; slug: string; now: Date }) {
    return (
        <Panel
            title="Your tasks here"
            action={
                <Link href="/tasks" className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline">
                    All my tasks
                </Link>
            }
        >
            {tasks.length === 0 ? (
                <div className="flex items-center gap-3 px-4 pb-4 pt-2 text-sm text-muted-foreground">
                    <CircleCheckBig className="size-4 shrink-0 text-status-done" aria-hidden="true" />
                    Nothing assigned to you here.
                </div>
            ) : (
                <ul className="px-2 pb-2">
                    {tasks.map((task) => {
                        const overdue = !!task.dueDate && task.dueDate < now;
                        return (
                            <li key={task.id}>
                                <Link
                                    href={`/workspace/${slug}/project/${task.project.id}/tasks/${task.id}`}
                                    className="flex items-start gap-2.5 rounded-lg px-2 py-2 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-brand"
                                >
                                    <span
                                        aria-label={STATUS_LABEL[task.status] ?? task.status}
                                        className={`mt-1.5 size-2 shrink-0 rounded-full ${STATUS_DOT[task.status] ?? "bg-muted-foreground"}`}
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[13px] font-medium text-foreground">{task.title}</span>
                                        <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="flex min-w-0 items-center gap-1.5">
                                                <span aria-hidden="true" className={`size-2 shrink-0 rounded-[2px] ${projectDot(task.project.id)}`} />
                                                <span className="truncate">{task.project.name}</span>
                                            </span>
                                            {task.dueDate && (
                                                <span
                                                    className={`flex shrink-0 items-center gap-1 ${overdue ? "font-medium text-danger" : ""}`}
                                                >
                                                    <CalendarDays className="size-3" aria-hidden="true" />
                                                    {overdue ? "Overdue, " : ""}
                                                    {DAY.format(task.dueDate)}
                                                </span>
                                            )}
                                        </span>
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </Panel>
    );
}

function describe(event: WorkspaceEvent) {
    const meta = (event.metadata && typeof event.metadata === "object" ? event.metadata : {}) as {
        to?: string | null;
        filename?: string | null;
    };
    switch (event.action) {
        case "TASK_CREATED":
            return "created";
        case "TASK_STATUS_CHANGED":
            return "changed the status of";
        case "TASK_PRIORITY_CHANGED":
            return "changed the priority of";
        case "TASK_ASSIGNED":
            return meta.to ? "assigned" : "unassigned";
        case "COMMENT_UPDATED":
        case "COMMENT_CREATED":
            return "commented on";
        case "COMMENT_DELETED":
            return "removed a comment on";
        case "ATTACHMENT_UPLOADED":
            return "attached a file to";
        case "ATTACHMENT_DELETED":
            return "removed a file from";
        default:
            return "updated";
    }
}

/** The latest changes across the projects you can open. */
export function ActivityPanel({ events, slug }: { events: WorkspaceEvent[]; slug: string }) {
    return (
        <Panel title="Recent activity">
            {events.length === 0 ? (
                <p className="px-4 pb-4 pt-2 text-sm text-muted-foreground">Changes to tasks will show up here.</p>
            ) : (
                <ol className="space-y-0.5 px-2 pb-2">
                    {events.map((event) => {
                        const status = event.action === "TASK_STATUS_CHANGED";
                        const to = (event.metadata as { to?: string } | null)?.to;
                        return (
                            <li key={event.id} className="flex gap-2.5 px-2 py-2">
                                <AvatarStack people={[event.user]} max={1} />
                                <p className="min-w-0 flex-1 text-[13px] leading-5 text-muted-foreground">
                                    <span className="font-medium text-foreground">{event.user.name ?? event.user.email}</span>{" "}
                                    {status && to ? "moved " : `${describe(event)} `}
                                    {event.task ? (
                                        <Link
                                            href={`/workspace/${slug}/project/${event.task.projectId}/tasks/${event.task.id}`}
                                            className="font-medium text-foreground hover:underline"
                                        >
                                            {event.task.title}
                                        </Link>
                                    ) : (
                                        "a task"
                                    )}
                                    {status && to && (
                                        <>
                                            {" "}to{" "}
                                            <span className="inline-flex items-center gap-1 font-medium text-foreground">
                                                <span aria-hidden="true" className={`size-1.5 rounded-full ${STATUS_DOT[to] ?? ""}`} />
                                                {STATUS_LABEL[to] ?? to}
                                            </span>
                                        </>
                                    )}
                                    <span className="block text-xs">{timeAgo(event.createdAt)}</span>
                                </p>
                            </li>
                        );
                    })}
                </ol>
            )}
        </Panel>
    );
}
