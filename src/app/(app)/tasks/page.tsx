import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import type { WorkspaceRoleName } from "@/lib/auth/permissions";
import { DUE_BUCKETS, groupByDue, myTasksWhere } from "@/lib/tasks/my-tasks";
import { PageBody } from "@/components/ui/PageBody";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonStyles } from "@/app/style/button-style";
import { NEUTRAL_DOT } from "@/app/style/ui-tokens";

const STATUS: Record<string, { label: string; dot: string }> = {
    TODO: { label: "To do", dot: NEUTRAL_DOT },
    IN_PROGRESS: { label: "In progress", dot: "bg-blue-500" },
    IN_REVIEW: { label: "In review", dot: "bg-amber-500" },
    DONE: { label: "Done", dot: "bg-emerald-500" },
};

const PRIORITY: Record<string, { label: string; dot: string }> = {
    URGENT: { label: "Urgent", dot: "bg-danger" },
    HIGH: { label: "High", dot: "bg-orange-500" },
    MEDIUM: { label: "Medium", dot: "bg-amber-400" },
    LOW: { label: "Low", dot: "bg-sky-400" },
};

const DUE_FORMAT = new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
});

function Pill({ dot, children }: { dot: string; children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-foreground">
            <span aria-hidden="true" className={`size-1.5 rounded-full ${dot}`} />
            {children}
        </span>
    );
}

export default async function MyTasksPage({
    searchParams,
}: {
    searchParams: Promise<{ show?: string }>;
}) {
    const session = await getSession();

    if (!session?.user?.id) {
        redirect("/signin?callbackUrl=%2Ftasks");
    }

    const userId = session.user.id;
    const { show } = await searchParams;
    const includeDone = show === "all";

    const memberships = await prisma.workspaceMember.findMany({
        where: { userId },
        select: { workspaceId: true, role: true },
    });

    const tasks = memberships.length
        ? await prisma.task.findMany({
              where: myTasksWhere(
                  userId,
                  memberships.map((m) => ({
                      workspaceId: m.workspaceId,
                      role: m.role as WorkspaceRoleName,
                  })),
                  { includeDone },
              ),
              take: 500,
              select: {
                  id: true,
                  title: true,
                  status: true,
                  priority: true,
                  dueDate: true,
                  project: {
                      select: {
                          id: true,
                          name: true,
                          workspace: { select: { slug: true, name: true } },
                      },
                  },
              },
          })
        : [];

    const now = new Date();
    const groups = groupByDue(tasks, now);
    const openCount = tasks.filter((t) => t.status !== "DONE").length;

    return (
        <PageBody>
            <PageHeader
                eyebrow="My work"
                title="My tasks"
                description={
                    openCount
                        ? `${openCount} open ${openCount === 1 ? "task" : "tasks"} assigned to you across your workspaces.`
                        : "Everything assigned to you across your workspaces."
                }
                actions={
                    <Link
                        href={includeDone ? "/tasks" : "/tasks?show=all"}
                        className={buttonStyles({ variant: "secondary" })}
                    >
                        {includeDone ? "Hide completed" : "Show completed"}
                    </Link>
                }
            />

            {tasks.length === 0 ? (
                <EmptyState
                    className="mt-10 rounded-xl border border-dashed border-border"
                    icon={<CheckCircle2 />}
                    title="You're all caught up"
                    description="Nothing is assigned to you right now. Tasks you're assigned to in any project will show up here."
                    action={
                        <Link href="/workspace" className={buttonStyles()}>
                            Go to workspaces
                        </Link>
                    }
                />
            ) : (
                <div className="mt-10 space-y-10">
                    {DUE_BUCKETS.filter(({ key }) => groups[key].length > 0).map(
                        ({ key, label }) => (
                            <section key={key} aria-labelledby={`bucket-${key}`}>
                                <div className="mb-3 flex items-center gap-2.5">
                                    <h2
                                        id={`bucket-${key}`}
                                        className={`text-sm font-semibold ${
                                            key === "overdue"
                                                ? "text-danger"
                                                : "text-foreground"
                                        }`}
                                    >
                                        {label}
                                    </h2>
                                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                                        {groups[key].length}
                                    </span>
                                </div>

                                <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                                    {groups[key].map((task) => {
                                        const href = `/workspace/${task.project.workspace.slug}/project/${task.project.id}/tasks/${task.id}`;
                                        const status = STATUS[task.status] ?? STATUS.TODO;
                                        const priority = PRIORITY[task.priority] ?? PRIORITY.MEDIUM;

                                        return (
                                            <li key={task.id}>
                                                <Link
                                                    href={href}
                                                    className="flex flex-col gap-2 px-5 py-3.5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-6"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <p
                                                            className={`truncate text-sm font-medium ${
                                                                task.status === "DONE"
                                                                    ? "text-muted-foreground line-through"
                                                                    : "text-foreground"
                                                            }`}
                                                        >
                                                            {task.title}
                                                        </p>
                                                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                                            {task.project.workspace.name} · {task.project.name}
                                                        </p>
                                                    </div>

                                                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                                                        <Pill dot={status.dot}>{status.label}</Pill>
                                                        <Pill dot={priority.dot}>{priority.label}</Pill>
                                                        <span
                                                            className={`w-24 text-right text-xs tabular-nums ${
                                                                key === "overdue"
                                                                    ? "font-medium text-danger"
                                                                    : "text-muted-foreground"
                                                            }`}
                                                        >
                                                            {task.dueDate
                                                                ? DUE_FORMAT.format(task.dueDate)
                                                                : "—"}
                                                        </span>
                                                    </div>
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        ),
                    )}
                </div>
            )}
        </PageBody>
    );
}

export const metadata = { title: "My tasks · Workvanta" };
