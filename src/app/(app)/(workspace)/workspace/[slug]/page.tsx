import { FolderKanban, Plus, UserPlus } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { PageBody } from "@/components/ui/PageBody";
import { EmptyState } from "@/components/ui/EmptyState";
import { AvatarStack } from "@/components/ui/AvatarStack";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { buttonStyles } from "@/app/style/button-style";
import { NewProjectTile } from "@/app/(app)/(workspace)/workspace/[slug]/components/NewProjectTile";
import { ProjectsBrowser } from "@/app/(app)/(workspace)/workspace/[slug]/components/ProjectsBrowser";
import { WorkspaceActions } from "@/app/(app)/(workspace)/workspace/[slug]/components/WorkspaceActions";
import { ActivityPanel, MyTasksPanel } from "@/app/(app)/(workspace)/workspace/[slug]/components/WorkspaceSidebar";
import { timeAgo } from "@/app/(app)/(workspace)/workspace/components/helpers";
import { WorkspaceBadge } from "@/app/(app)/(workspace)/workspace/components/WorkspaceCard";
import { ProjectItem } from "@/types/project-item";
import { projectHex } from "@/lib/navigation/project-color";
import {
    canWorkspace,
    effectiveProjectRole,
    visibleProjectsWhere,
    WORKSPACE_ROLE_DESCRIPTIONS,
} from "@/lib/auth/permissions";
import { updateWorkspaceDetailsAction } from "@/app/(app)/(workspace)/workspace/workspace-actions";
import { workspaceTitle } from "@/lib/navigation/page-titles";

const USER = { id: true, name: true, email: true, image: true } as const;

export default async function WorkspacePage({
                                                params,
                                            }: {
    params: Promise<{ slug: string }>;
}) {
    const session = await getSession();
    if (!session?.user) redirect("/signin");

    const { slug } = await params;

    const membership = await prisma.workspaceMember.findFirst({
        where: { userId: session.user.id, workspace: { slug } },
        select: {
            role: true,
            workspace: {
                select: {
                    id: true,
                    slug: true,
                    name: true,
                    description: true,
                    _count: { select: { members: true } },
                    members: {
                        orderBy: { createdAt: "asc" },
                        take: 5,
                        select: { user: { select: USER } },
                    },
                },
            },
        },
    });

    if (!membership) notFound();

    const { workspace, role } = membership;
    const userId = session.user.id;

    // Only load projects this user may see — private projects they're not
    // on are never sent to the page, so their names can't leak.
    const visibleProjects = await prisma.project.findMany({
        where: { workspaceId: workspace.id, ...visibleProjectsWhere(userId, role) },
        orderBy: { updatedAt: "desc" },
        select: {
            id: true,
            name: true,
            description: true,
            visibility: true,
            updatedAt: true,
            members: { where: { userId }, select: { role: true }, take: 1 },
        },
    });

    const projects: ProjectItem[] = visibleProjects
        .map(({ members, ...project }) => ({
            ...project,
            accessible: !!effectiveProjectRole({
                workspaceRole: role,
                projectRole: members[0]?.role ?? null,
                visibility: project.visibility,
            }),
        }))
        .filter((project) => project.accessible);

    // Progress and people for each card: one grouped count, one distinct
    // lookup, both limited to projects this user can open.
    const projectIds = projects.map((project) => project.id);
    const now = new Date();
    const [statusCounts, assigned, overdueCounts, myTasks, events] = projectIds.length
        ? await Promise.all([
              prisma.task.groupBy({
                  by: ["projectId", "status"],
                  where: { projectId: { in: projectIds } },
                  _count: { _all: true },
              }),
              prisma.task.findMany({
                  where: { projectId: { in: projectIds }, assigneeId: { not: null } },
                  distinct: ["projectId", "assigneeId"],
                  orderBy: { updatedAt: "desc" },
                  select: {
                      projectId: true,
                      assignee: { select: { id: true, name: true, email: true, image: true } },
                  },
              }),
              prisma.task.groupBy({
                  by: ["projectId"],
                  where: { projectId: { in: projectIds }, status: { not: "DONE" }, dueDate: { lt: now } },
                  _count: { _all: true },
              }),
              prisma.task.findMany({
                  where: { projectId: { in: projectIds }, assigneeId: userId, status: { not: "DONE" } },
                  orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
                  take: 6,
                  select: {
                      id: true,
                      title: true,
                      status: true,
                      dueDate: true,
                      project: { select: { id: true, name: true } },
                  },
              }),
              // Only changes to tasks in projects this person can open.
              prisma.activity.findMany({
                  where: { workspaceId: workspace.id, task: { projectId: { in: projectIds } } },
                  orderBy: { createdAt: "desc" },
                  take: 8,
                  select: {
                      id: true,
                      action: true,
                      metadata: true,
                      createdAt: true,
                      user: { select: USER },
                      task: { select: { id: true, title: true, projectId: true } },
                  },
              }),
          ])
        : [[], [], [], [], []];

    for (const project of projects) {
        project.counts = { TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0 };
        project.people = [];
        project.overdue = 0;
        project.updatedLabel = timeAgo(project.updatedAt);
    }
    const byId = new Map(projects.map((project) => [project.id, project]));
    for (const row of statusCounts) {
        const counts = byId.get(row.projectId)?.counts;
        if (counts && row.status in counts) counts[row.status as keyof typeof counts] = row._count._all;
    }
    for (const row of overdueCounts) {
        const project = byId.get(row.projectId);
        if (project) project.overdue = row._count._all;
    }
    for (const row of assigned) {
        const people = byId.get(row.projectId)?.people;
        if (people && row.assignee && people.length < 4) people.push(row.assignee);
    }

    const canCreateProject = canWorkspace(role, "projects.create");
    const canInvite = canWorkspace(role, "members.invite");
    const newProjectHref = `/workspace/${workspace.slug}/project/new`;
    const teamHref = `/workspace/${workspace.slug}/team`;
    const members = workspace.members.map((m) => m.user);

    return (
        <PageBody glow={projectHex(workspace.id)}>
            <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                    <WorkspaceBadge id={workspace.id} name={workspace.name} size="lg" />
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
                                {workspace.name}
                            </h1>
                            <RoleBadge role={role} className="mt-1" />
                        </div>
                        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                            {workspace.description || WORKSPACE_ROLE_DESCRIPTIONS[role]}
                        </p>
                    </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Link
                        href={teamHref}
                        className="mr-1 hidden items-center gap-2 rounded-full py-1 pl-1 pr-2.5 text-[13px] sm:flex font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand"
                        aria-label={`${workspace._count.members} members. Open team`}
                    >
                        <AvatarStack people={members} max={4} total={workspace._count.members} size="md" label="" />
                        <span className="hidden md:inline">{workspace._count.members} members</span>
                    </Link>
                    {canInvite && (
                        <Link href={teamHref} className={buttonStyles({ variant: "secondary" })}>
                            <UserPlus className="size-4" aria-hidden="true" />
                            <span className="sr-only sm:not-sr-only">Invite</span>
                        </Link>
                    )}
                    {canCreateProject && (
                        <Link href={newProjectHref} className={`${buttonStyles()} whitespace-nowrap`}>
                            <Plus className="size-4" aria-hidden="true" />
                            New project
                        </Link>
                    )}
                    <WorkspaceActions
                        workspace={{
                            id: workspace.id,
                            slug: workspace.slug,
                            name: workspace.name,
                            description: workspace.description,
                        }}
                        updateDetails={
                            canWorkspace(role, "workspace.update")
                                ? updateWorkspaceDetailsAction.bind(null, workspace.slug)
                                : undefined
                        }
                        canEdit={canWorkspace(role, "workspace.update")}
                        canLeave={canWorkspace(role, "workspace.leave")}
                        canDelete={canWorkspace(role, "workspace.delete")}
                    />
                </div>
            </header>

            <div className="mt-8 grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
                <section aria-labelledby="projects">
                    <h2 id="projects" className="mb-3 flex items-baseline gap-2 text-base font-semibold text-foreground">
                        Projects
                        <span className="text-sm font-normal text-muted-foreground">{projects.length}</span>
                    </h2>

                    {projects.length ? (
                        <ProjectsBrowser
                            projects={projects}
                            workspaceSlug={workspace.slug}
                            trailing={canCreateProject ? <NewProjectTile href={newProjectHref} /> : undefined}
                        />
                    ) : (
                        <EmptyState
                            className="rounded-xl border border-dashed border-border"
                            icon={<FolderKanban />}
                            title={canCreateProject ? "Create your first project" : "No projects yet"}
                            description={
                                canCreateProject
                                    ? "Projects organize the work your team needs to deliver."
                                    : "You haven't been added to any projects in this workspace yet."
                            }
                            action={
                                canCreateProject ? (
                                    <Link href={newProjectHref} className={buttonStyles()}>
                                        <Plus className="size-4" aria-hidden="true" />
                                        Create project
                                    </Link>
                                ) : undefined
                            }
                        />
                    )}
                </section>

                <aside aria-label="Your work and recent activity" className="space-y-4 xl:sticky xl:top-6">
                    <MyTasksPanel tasks={myTasks} slug={workspace.slug} now={now} />
                    <ActivityPanel events={events} slug={workspace.slug} />
                </aside>
            </div>
        </PageBody>
    );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    return workspaceTitle(slug);
}
