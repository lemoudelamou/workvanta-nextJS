import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Globe2, LayoutGrid, List, Lock, UsersRound } from "lucide-react";

import { getSession } from "@/lib/auth/session";
import {
    listProjectAudience,
    requireProjectAccess,
    type ProjectAccessResult,
} from "@/lib/auth/members";
import { projectCapabilities } from "@/lib/auth/permissions";
import { canEditTasks } from "@/lib/auth/task_permission";
import { prisma } from "@/lib/db/prisma";
import { AvatarStack } from "@/components/ui/AvatarStack";
import { ProjectActions } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/components/ProjectActions";
import {
    setProjectVisibilityAction,
    updateProjectDetailsAction,
} from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/project-actions";
import { KanbanBoard, type BoardTask } from "./kanbanboard/kanban-board";
import { ProjectListView } from "./listview/project-list-view";
import { ProjectCalendar } from "./calendar/project-calendar";
import { parseMonth } from "./calendar/calendar-utils";
import { openBlockerCount } from "@/lib/tasks/dependencies";
import { projectPresets, sortLabels } from "@/lib/labels/label-colors";
import { PageBody } from "@/components/ui/PageBody";
import { ProjectMark } from "@/components/ui/ProjectMark";
import { projectHex } from "@/lib/navigation/project-color";
import { Breadcrumb } from "@/components/ui/BreadCrumb";
import { AccessDeniedNotice } from "@/components/ui/AccessDenied";
import { StatusRail } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/components/StatusRail";



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
    searchParams?: Promise<{ view?: string; month?: string }>;
}) {
    const { slug, projectId } = await params;
    const query = (await searchParams) ?? {};
    const view = query.view === "list" ? "list" : query.view === "calendar" ? "calendar" : "board";

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
            labelPresets: true,
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

    const [tasks, assignableMembers, projectLabels] = await Promise.all([
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
                labels: { select: { label: { select: { id: true, name: true, color: true } } } },
                recurrence: true,
                blockedBy: { select: { blockingTask: { select: { status: true } } } },
            },
        }),
        // Only people who can open this project can be assigned to it.
        canEdit ? listProjectAudience(project) : Promise.resolve([]),
        prisma.label.findMany({
            where: { projectId: project.id },
            orderBy: { name: "asc" },
            select: { id: true, name: true, color: true, _count: { select: { tasks: true } } },
        }),
    ]);

    const labelOptions = projectLabels.map(({ id, name, color }) => ({ id, name, color }));

    const members = assignableMembers.map(({ id, name, email }) => ({ id, name, email }));
    const audience = assignableMembers.map(({ id, name, email, image }) => ({ id, name, email, image: image ?? null }));

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
        labels: sortLabels(t.labels.map((l) => l.label)),
        recurrence: t.recurrence,
        openBlockers: openBlockerCount(t.blockedBy.map((d) => d.blockingTask)),
    }));

    const doneTasks = tasks.filter((t) => t.status === "DONE").length;
    const overdueTasks = boardTasks.filter((t) => t.overdue).length;
    const weekAhead = new Date(now.getTime() + 7 * 86_400_000);
    const openTasks = tasks.filter((t) => t.status !== "DONE");
    const dueSoon = openTasks.filter((t) => t.dueDate && t.dueDate >= now && t.dueDate <= weekAhead).length;
    const unassigned = openTasks.filter((t) => !t.assignee).length;

    const projectHref = `/workspace/${project.workspace.slug}/project/${project.id}`;
    const membersHref = `${projectHref}/members`;
    const isPrivate = project.visibility === "PRIVATE";

    const viewTab = (key: "board" | "list" | "calendar") =>
        `inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand ${
            view === key
                ? "bg-card text-foreground shadow-[0_1px_2px_rgba(23,26,33,0.1)] dark:bg-white/10"
                : "text-muted-foreground hover:text-foreground"
        }`;
    const viewSwitch = (
        <nav aria-label="Task views" className="flex rounded-lg bg-foreground/[0.05] p-0.5">
            <Link href={projectHref} aria-current={view === "board" ? "page" : undefined} className={viewTab("board")}>
                <LayoutGrid className="size-4" aria-hidden="true" />
                Board
            </Link>
            <Link
                href={`${projectHref}?view=list`}
                aria-current={view === "list" ? "page" : undefined}
                className={viewTab("list")}
            >
                <List className="size-4" aria-hidden="true" />
                List
            </Link>
            <Link
                href={`${projectHref}?view=calendar`}
                aria-current={view === "calendar" ? "page" : undefined}
                className={viewTab("calendar")}
            >
                <CalendarDays className="size-4" aria-hidden="true" />
                Calendar
            </Link>
        </nav>
    );

    return (
        <PageBody glow={projectHex(project.id)}>
            <Breadcrumb
                items={[
                    { label: project.workspace.name, href: `/workspace/${project.workspace.slug}` },
                    { label: project.name },
                ]}
            />

            <header className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3.5">
                    <ProjectMark projectId={project.id} size="lg" />
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
                                {project.name}
                            </h1>
                            <span
                                className="mt-1 inline-flex items-center gap-1 rounded-full bg-foreground/[0.05] px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                                title={
                                    isPrivate
                                        ? "Only people added to this project can see it."
                                        : "Everyone in the workspace can see this project."
                                }
                            >
                                {isPrivate ? (
                                    <Lock className="size-3" aria-hidden="true" />
                                ) : (
                                    <Globe2 className="size-3" aria-hidden="true" />
                                )}
                                {isPrivate ? "Private" : "Workspace"}
                            </span>
                        </div>
                        <p data-testid="description" className="mt-1 max-w-2xl text-sm text-muted-foreground">
                            {project.description ||
                                "Track tasks from to-do to done and keep everyone on the same page."}
                        </p>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <Link
                        href={membersHref}
                        className={`flex h-9 items-center gap-2 rounded-full text-[13px] font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand ${
                            audience.length ? "py-1 pl-1 pr-3" : "px-3"
                        }`}
                    >
                        {audience.length > 0 ? (
                            <AvatarStack people={audience} max={4} size="md" />
                        ) : (
                            <UsersRound className="size-4" aria-hidden="true" />
                        )}
                        Members
                    </Link>
                    <ProjectActions
                        project={{
                            id: project.id,
                            name: project.name,
                            description: project.description,
                            visibility: project.visibility,
                        }}
                        membersHref={membersHref}
                        updateDetails={
                            canChangeVisibility
                                ? updateProjectDetailsAction.bind(null, project.workspace.slug, project.id)
                                : undefined
                        }
                        setVisibility={canChangeVisibility ? updateProjectVisibility : undefined}
                        canDelete={canDeleteProject}
                        labels={
                            canChangeVisibility
                                ? {
                                      slug: project.workspace.slug,
                                      list: projectLabels.map((l) => ({
                                          id: l.id,
                                          name: l.name,
                                          color: l.color,
                                          taskCount: l._count.tasks,
                                      })),
                                      presets: {
                                          list: projectPresets(project.labelPresets),
                                          customized: project.labelPresets !== null,
                                      },
                                  }
                                : undefined
                        }
                    />
                </div>
            </header>

            <div className="mt-5">
                <StatusRail
                    counts={{
                        TODO: tasks.filter((t) => t.status === "TODO").length,
                        IN_PROGRESS: tasks.filter((t) => t.status === "IN_PROGRESS").length,
                        IN_REVIEW: tasks.filter((t) => t.status === "IN_REVIEW").length,
                        DONE: doneTasks,
                    }}
                    overdue={overdueTasks}
                    dueSoon={dueSoon}
                    unassigned={unassigned}
                />
            </div>

            <section
                aria-label={view === "list" ? "Task list" : view === "calendar" ? "Task calendar" : "Task board"}
                className="mt-6"
            >
                {view === "calendar" ? (
                    <ProjectCalendar
                        slug={project.workspace.slug}
                        projectId={project.id}
                        tasks={boardTasks}
                        month={parseMonth(query.month, now)}
                        today={now.toISOString().slice(0, 10)}
                        canEdit={canEdit}
                        leading={viewSwitch}
                    />
                ) : view === "list" ? (
                    <ProjectListView
                        slug={project.workspace.slug}
                        projectId={project.id}
                        tasks={boardTasks}
                        members={members}
                        canEdit={canEdit}
                        leading={viewSwitch}
                        labels={labelOptions}
                    />
                ) : (
                    <KanbanBoard
                        slug={project.workspace.slug}
                        projectId={project.id}
                        tasks={boardTasks}
                        members={members}
                        canEdit={canEdit}
                        leading={viewSwitch}
                        labels={labelOptions}
                    />
                )}
            </section>
        </PageBody>
    );
}