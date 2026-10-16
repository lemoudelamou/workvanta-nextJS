import Link from "next/link";
import { notFound } from "next/navigation";
import {
    AlarmClock,
    Clock3,
    ListTodo,
    TriangleAlert,
    User,
    UsersRound,
} from "lucide-react";

import { getSession } from "@/lib/auth/session";
import {
    listProjectAudience,
    requireProjectAccess,
    type ProjectAccessResult,
} from "@/lib/auth/members";
import { projectCapabilities } from "@/lib/auth/permissions";
import { canEditTasks } from "@/lib/auth/task_permission";
import { prisma } from "@/lib/db/prisma";
import { DeleteProjectButton } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/components/DeleteProjectButton";
import { ToggleVisibilityButton } from "@/components/ui/ToggleVisibilityButton";
import { setProjectVisibilityAction } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/project-actions";
import { KanbanBoard, type BoardTask } from "./kanbanboard/kanban-board";
import { PageBody } from "@/components/ui/PageBody";
import { PageHeader } from "@/components/ui/PageHeader";
import { Breadcrumb } from "@/components/ui/BreadCrumb";
import { AccessDeniedNotice } from "@/components/ui/AccessDenied";
import { Kpi } from "@/app/style/Kpi";
import { ProgressBar } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/components/ProgressBar";

const KPI_STRIP =
    "grid gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-sm sm:grid-cols-2 lg:grid-cols-4";


const DUE_DATE_FORMAT = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
});

export default async function ProjectPage({
                                              params,
                                          }: {
    params: Promise<{ slug: string; projectId: string }>;
}) {
    const { slug, projectId } = await params;

    let access: ProjectAccessResult;

    try {
        access = await requireProjectAccess(slug, projectId);
    } catch (error) {
        const digest = (error as { digest?: string })?.digest;
        if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
            throw error;
        }

        if (error instanceof Error && error.message === "Project not found.") {
            notFound();
        }

        return (
            <AccessDeniedNotice
                workspaceSlug={slug}
                message={
                    error instanceof Error
                        ? error.message
                        : "Something went wrong loading this project."
                }
            />
        );
    }

    const session = await getSession();

    if (!session?.user) {
        notFound();
    }

    const project = await prisma.project.findUniqueOrThrow({
        where: { id: access.project.id },
        select: {
            id: true,
            name: true,
            description: true,
            visibility: true,
            workspaceId: true,
            workspace: { select: { slug: true, name: true } },
        },
    });

    const can = projectCapabilities(access.effectiveRole);
    const canChangeVisibility = can["project.update"];
    const canDeleteProject = can["project.delete"];
    const canEdit = canEditTasks(access);

    const updateProjectVisibility = setProjectVisibilityAction.bind(
        null,
        project.workspace.slug,
        project.id,
    );

    const [memberCount, tasks, assignableMembers] = await Promise.all([
        prisma.projectMember.count({ where: { projectId: project.id } }),
        prisma.task.findMany({
            where: { projectId: project.id },
            orderBy: [{ position: "asc" }, { createdAt: "asc" }],
            select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                dueDate: true,
                assignee: { select: { name: true, email: true, image: true } },
                subtasks: { select: { completed: true } },
            },
        }),
        // Only people who can open this project can be assigned to it.
        canEdit ? listProjectAudience(project) : Promise.resolve([]),
    ]);

    const members = assignableMembers.map(({ id, name, email }) => ({ id, name, email }));

    const now = new Date();

    const boardTasks: BoardTask[] = tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueLabel: t.dueDate ? DUE_DATE_FORMAT.format(t.dueDate) : null,
        overdue: !!t.dueDate && t.status !== "DONE" && t.dueDate < now,
        assignee: t.assignee,
        subtaskTotal: t.subtasks.length,
        subtaskDone: t.subtasks.filter((s) => s.completed).length,
    }));

    const totalTasks = tasks.length;
    const doneTasks = tasks.filter((t) => t.status === "DONE").length;
    const inProgressTasks = tasks.filter(
        (t) => t.status === "IN_PROGRESS" || t.status === "IN_REVIEW",
    ).length;
    const overdueTasks = boardTasks.filter((t) => t.overdue).length;
    const progress = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

    return (
        <PageBody>
            <Breadcrumb
                items={[
                    { label: project.workspace.name, href: `/workspace/${project.workspace.slug}` },
                    { label: project.name },
                ]}
            />

            <PageHeader
                eyebrow="Project"
                title={project.name}
                description={
                    project.description ||
                    "Track tasks from to-do to done and keep everyone on the same page."
                }
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        {canChangeVisibility && (
                            <ToggleVisibilityButton
                                visibility={project.visibility}
                                onToggle={updateProjectVisibility}
                            />
                        )}

                        <Link
                            href={`/workspace/${project.workspace.slug}/project/${project.id}/members`}
                            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <User className="size-4" aria-hidden="true" />
                            Members
                        </Link>
                    </div>
                }
            />

            <section aria-label="Project summary" className={`mt-8 ${KPI_STRIP}`}>
                <Kpi
                    tone="blue"
                    icon={<ListTodo />}
                    label="Tasks"
                    value={totalTasks}
                    helper={`${doneTasks} completed`}
                />
                <Kpi
                    tone="violet"
                    icon={<Clock3 />}
                    label="In progress"
                    value={inProgressTasks}
                    helper="Being worked on or in review"
                />
                <Kpi
                    tone={overdueTasks > 0 ? "red" : "amber"}
                    icon={<AlarmClock />}
                    label="Overdue"
                    value={overdueTasks}
                    helper={overdueTasks > 0 ? "Past their due date" : "Nothing is late"}
                />
                <Kpi
                    tone="amber"
                    icon={<UsersRound />}
                    label="Members"
                    value={memberCount}
                    helper="People on this project"
                />
            </section>

            <ProgressBar done={doneTasks} total={totalTasks} percent={progress} />

            <section aria-label="Task board" className="mt-8">
                <KanbanBoard
                    slug={project.workspace.slug}
                    projectId={project.id}
                    tasks={boardTasks}
                    members={members}
                    canEdit={canEdit}
                />
            </section>

            {canDeleteProject && (
                <section
                    aria-labelledby="danger-zone"
                    className="mt-14 flex flex-col gap-4 rounded-2xl border border-red-500/30 bg-red-500/5 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                    <div className="flex items-start gap-3">
                        <span
                            aria-hidden="true"
                            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400"
                        >
                            <TriangleAlert className="size-[18px]" />
                        </span>
                        <div>
                            <h2
                                id="danger-zone"
                                className="text-sm font-semibold text-foreground"
                            >
                                Delete this project
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                This permanently removes the project and its tasks. It
                                can&apos;t be undone.
                            </p>
                        </div>
                    </div>

                    <DeleteProjectButton
                        projectId={project.id}
                        projectName={project.name}
                    />
                </section>
            )}
        </PageBody>
    );
}