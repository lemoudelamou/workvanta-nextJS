import Link from "next/link";
import { notFound } from "next/navigation";
import {
    LayoutGrid,
    List,
    User,
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
import { EditDetailsForm } from "@/components/ui/EditDetailsForm";
import {
    setProjectVisibilityAction,
    updateProjectDetailsAction,
} from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/project-actions";
import { KanbanBoard, type BoardTask } from "./kanbanboard/kanban-board";
import { ProjectListView } from "./listview/project-list-view";
import { PageBody } from "@/components/ui/PageBody";
import { ProjectMark } from "@/components/ui/ProjectMark";
import { projectHex } from "@/lib/navigation/project-color";
import { PageHeader } from "@/components/ui/PageHeader";
import { Breadcrumb } from "@/components/ui/BreadCrumb";
import { AccessDeniedNotice } from "@/components/ui/AccessDenied";
import { StatusRail } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/components/StatusRail";
import { buttonStyles } from "@/app/style/button-style";



const DUE_DATE_FORMAT = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
});

export default async function ProjectPage({
                                              params,
                                              searchParams,
                                          }: {
    params: Promise<{ slug: string; projectId: string }>;
    searchParams?: Promise<{ view?: string }>;
}) {
    const { slug, projectId } = await params;
    const view = (await searchParams)?.view === "list" ? "list" : "board";

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
        dueAt: t.dueDate ? t.dueDate.toISOString() : null,
        overdue: !!t.dueDate && t.status !== "DONE" && t.dueDate < now,
        assignee: t.assignee,
        subtaskTotal: t.subtasks.length,
        subtaskDone: t.subtasks.filter((s) => s.completed).length,
    }));

    const doneTasks = tasks.filter((t) => t.status === "DONE").length;
    const overdueTasks = boardTasks.filter((t) => t.overdue).length;

    return (
        <PageBody glow={projectHex(project.id)}>
            <Breadcrumb
                items={[
                    { label: project.workspace.name, href: `/workspace/${project.workspace.slug}` },
                    { label: project.name },
                ]}
            />

            <PageHeader
                eyebrow="Project"
                icon={<ProjectMark projectId={project.id} size="lg" />}
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
                            className={buttonStyles({ variant: "secondary" })}
                        >
                            <User className="size-4" aria-hidden="true" />
                            Members
                        </Link>
                    </div>
                }
            />

            <div className="mt-6">
                <StatusRail
                    counts={{
                        TODO: tasks.filter((t) => t.status === "TODO").length,
                        IN_PROGRESS: tasks.filter((t) => t.status === "IN_PROGRESS").length,
                        IN_REVIEW: tasks.filter((t) => t.status === "IN_REVIEW").length,
                        DONE: doneTasks,
                    }}
                    overdue={overdueTasks}
                    members={memberCount}
                />
            </div>

            <nav aria-label="Task views" className="mt-8 border-b border-border">
                <div className="-mb-px flex gap-5">
                    {(
                        [
                            { key: "board", label: "Board", icon: <LayoutGrid className="size-4" aria-hidden="true" /> },
                            { key: "list", label: "List", icon: <List className="size-4" aria-hidden="true" /> },
                        ] as const
                    ).map((option) => (
                        <Link
                            key={option.key}
                            href={
                                option.key === "list"
                                    ? `/workspace/${project.workspace.slug}/project/${project.id}?view=list`
                                    : `/workspace/${project.workspace.slug}/project/${project.id}`
                            }
                            aria-current={view === option.key ? "page" : undefined}
                            className={`inline-flex h-10 items-center gap-1.5 border-b-2 text-sm font-medium transition-colors ${
                                view === option.key
                                    ? "border-brand text-foreground"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {option.icon}
                            {option.label}
                        </Link>
                    ))}
                </div>
            </nav>

            {view === "list" ? (
                <section aria-label="Task list" className="mt-6">
                    <ProjectListView
                        slug={project.workspace.slug}
                        projectId={project.id}
                        tasks={boardTasks}
                        members={members}
                        canEdit={canEdit}
                    />
                </section>
            ) : (
                <section aria-label="Task board" className="mt-6">
                    <KanbanBoard
                        slug={project.workspace.slug}
                        projectId={project.id}
                        tasks={boardTasks}
                        members={members}
                        canEdit={canEdit}
                    />
                </section>
            )}

            {canChangeVisibility && (
                <EditDetailsForm
                    action={updateProjectDetailsAction.bind(
                        null,
                        project.workspace.slug,
                        project.id,
                    )}
                    title="Project details"
                    description="Rename this project or change its description."
                    nameLabel="Project name"
                    defaultName={project.name}
                    defaultDescription={project.description}
                    nameMaxLength={100}
                    descriptionMaxLength={500}
                />
            )}

            {canDeleteProject && (
                <section
                    aria-labelledby="danger-zone"
                    className="mt-12 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between"
                >
                    <div className="flex items-start gap-3">
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