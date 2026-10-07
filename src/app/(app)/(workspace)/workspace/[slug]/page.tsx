import {
    ArrowLeft,
    FolderKanban,
    Plus,
    ShieldCheck,
    TriangleAlert,
    User,
    UsersRound,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { DeleteWorkspaceButton } from "@/app/(app)/(workspace)/workspace/delete-workspace-button";
import { PageBody } from "@/components/ui/PageBody";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonStyles } from "@/app/style/button-style";
import  { Kpi } from "@/app/style/Kpi";
import { NewProjectTile} from "@/app/(app)/(workspace)/workspace/[slug]/components/NewProjectTile";
import { ProjectCard } from "@/app/(app)/(workspace)/workspace/[slug]/components/ProjectCard";
import { ProjectItem } from "@/types/project-item";


const ROLE_HELPER: Record<string, string> = {
    OWNER: "Full access",
    ADMIN: "Manage members and projects",
    MEMBER: "Create and edit projects",
    GUEST: "Invited projects only",
};


const KPI_STRIP =
    "grid gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-sm sm:grid-cols-3";



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
                    projects: {
                        orderBy: { updatedAt: "desc" },
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            visibility: true,
                            updatedAt: true,
                        },
                    },
                },
            },
        },
    });

    if (!membership) notFound();

    const { workspace, role } = membership;

    const isGuest = role === "GUEST";
    const isManager = role === "OWNER" || role === "ADMIN";
    const explicitProjectIds = new Set<string>();

    if (!isManager && workspace.projects.length) {
        const explicit = await prisma.projectMember.findMany({
            where: {
                userId: session.user.id,
                projectId: { in: workspace.projects.map((p) => p.id) },
            },
            select: { projectId: true },
        });
        for (const { projectId } of explicit) explicitProjectIds.add(projectId);
    }

    const projects: ProjectItem[] = workspace.projects
        .map((project) => ({
            ...project,
            accessible:
                isManager ||
                explicitProjectIds.has(project.id) ||
                (!isGuest && project.visibility === "WORKSPACE"),
        }))
        .filter((project) => !isGuest || project.accessible);

    const accessibleCount = projects.filter((p) => p.accessible).length;

    const canCreateProject = !isGuest;
    const newProjectHref = `/workspace/${workspace.slug}/projects/new`;
    const roleLabel = role[0] + role.slice(1).toLowerCase();

    return (
        <div className="min-h-screen bg-background text-foreground">
            <PageBody>
                <Link
                    href="/workspace"
                    className="group mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                    <ArrowLeft
                        className="size-4 transition-transform group-hover:-translate-x-0.5"
                        aria-hidden="true"
                    />
                    All workspaces
                </Link>

                <PageHeader
                    eyebrow="Workspace"
                    title={workspace.name}
                    description={
                        workspace.description ||
                        "Your team's shared place for projects and progress."
                    }
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href={`/workspace/${workspace.slug}/team`}
                                className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <User className="size-4" aria-hidden="true" />
                                Team
                            </Link>

                            {canCreateProject && (
                                <Link href={newProjectHref} className={buttonStyles()}>
                                    <Plus className="size-4" aria-hidden="true" />
                                    Create project
                                </Link>
                            )}
                        </div>
                    }
                />

                <section
                    aria-label="Workspace summary"
                    className={`mt-8 ${KPI_STRIP}`}
                >
                    <Kpi
                        tone="blue"
                        icon={<FolderKanban />}
                        label="Projects"
                        value={accessibleCount}
                        helper={isGuest ? "Shared with you" : "You can open"}
                    />
                    <Kpi
                        tone="violet"
                        icon={<UsersRound />}
                        label="Members"
                        value={workspace._count.members}
                        helper="People in this workspace"
                    />
                    <Kpi
                        tone="amber"
                        icon={<ShieldCheck />}
                        label="Your role"
                        value={roleLabel}
                        helper={ROLE_HELPER[role]}
                    />
                </section>

                <section aria-labelledby="projects" className="mt-12">
                    <div className="mb-5">
                        <div className="flex items-center gap-2.5">
                            <h2
                                id="projects"
                                className="text-lg font-semibold tracking-tight text-foreground"
                            >
                                Projects
                            </h2>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                                {projects.length}
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Plan and track the work that moves your team forward.
                        </p>
                    </div>

                    {projects.length ? (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {projects.map((project) => (
                                <ProjectCard
                                    key={project.id}
                                    project={project}
                                    workspaceSlug={workspace.slug}
                                />
                            ))}
                            {canCreateProject && <NewProjectTile href={newProjectHref} />}
                        </div>
                    ) : (
                        <EmptyState
                            className="rounded-2xl border border-dashed border-border"
                            icon={<FolderKanban />}
                            title={
                                canCreateProject
                                    ? "Create your first project"
                                    : "No projects yet"
                            }
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

                {role === "OWNER" && (
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
                                    Delete this workspace
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    This permanently removes the workspace and can&apos;t
                                    be undone.
                                </p>
                            </div>
                        </div>

                        <DeleteWorkspaceButton
                            workspaceId={workspace.id}
                            workspaceName={workspace.name}
                        />
                    </section>
                )}
            </PageBody>
        </div>
    );
}