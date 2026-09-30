import {
    ArrowRight,
    Building2,
    FolderKanban,
    Lock,
    Plus,
    UsersRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { accentFor, accentVars } from "@/lib/accent";
import { PageBody } from "@/components/ui/PageBody";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { CardLink } from "@/components/ui/CardLink";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { buttonStyles } from "@/app/style/button-style";

export default async function DashboardPage() {
    const session = await getSession();

    if (!session?.user) {
        redirect("/signin");
    }

    const memberships = await prisma.workspaceMember.findMany({
        where: { userId: session.user.id },
        orderBy: { workspace: { updatedAt: "desc" } },
        select: {
            role: true,
            workspace: {
                select: {
                    id: true,
                    slug: true,
                    name: true,
                    description: true,
                    updatedAt: true,
                    _count: { select: { members: true } },
                },
            },
        },
    });

    const workspaceIds = memberships.map((m) => m.workspace.id);

    const ownerOrAdminWorkspaceIds = new Set(
        memberships
            .filter((m) => m.role === "OWNER" || m.role === "ADMIN")
            .map((m) => m.workspace.id),
    );

    const guestWorkspaceIds = new Set(
        memberships
            .filter((m) => m.role === "GUEST")
            .map((m) => m.workspace.id),
    );

    const [allProjects, ownProjectMemberships] = workspaceIds.length
        ? await Promise.all([
              prisma.project.findMany({
                  where: {
                      workspaceId: { in: workspaceIds },
                  },
                  select: {
                      id: true,
                      workspaceId: true,
                      visibility: true,
                  },
              }),
              prisma.projectMember.findMany({
                  where: {
                      userId: session.user.id,
                  },
                  select: {
                      projectId: true,
                  },
              }),
          ])
        : [[], []];

    const explicitProjectIds = new Set(
        ownProjectMemberships.map((m) => m.projectId),
    );

    const accessibleProjectIds = new Set(
        allProjects
            .filter((project) => {
                if (ownerOrAdminWorkspaceIds.has(project.workspaceId)) {
                    return true;
                }

                if (explicitProjectIds.has(project.id)) {
                    return true;
                }

                if (
                    !guestWorkspaceIds.has(project.workspaceId) &&
                    project.visibility === "WORKSPACE"
                ) {
                    return true;
                }

                return false;
            })
            .map((project) => project.id),
    );

    const displayableProjectIds = new Set(
        allProjects
            .filter((project) => {
                if (guestWorkspaceIds.has(project.workspaceId)) {
                    return accessibleProjectIds.has(project.id);
                }

                return true;
            })
            .map((project) => project.id),
    );

    const accessibleProjectCountByWorkspace = new Map<string, number>();

    for (const project of allProjects) {
        if (!accessibleProjectIds.has(project.id)) continue;

        accessibleProjectCountByWorkspace.set(
            project.workspaceId,
            (accessibleProjectCountByWorkspace.get(project.workspaceId) ?? 0) + 1,
        );
    }

    const rawRecentProjects = displayableProjectIds.size
        ? await prisma.project.findMany({
              where: {
                  id: {
                      in: Array.from(displayableProjectIds),
                  },
              },
              orderBy: {
                  updatedAt: "desc",
              },
              take: 5,
              select: {
                  id: true,
                  name: true,
                  description: true,
                  updatedAt: true,
                  visibility: true,
                  workspace: {
                      select: {
                          id: true,
                          slug: true,
                          name: true,
                      },
                  },
              },
          })
        : [];

    const recentProjects: RecentProject[] = rawRecentProjects.map(
        (project) => ({
            ...project,
            isLocked:
                project.visibility === "PRIVATE" &&
                !accessibleProjectIds.has(project.id),
        }),
    );

    return (
        <PageBody>
            <MemberDashboardView
                session={session}
                memberships={memberships}
                recentProjects={recentProjects}
                accessibleProjectCountByWorkspace={
                    accessibleProjectCountByWorkspace
                }
                totalAccessibleProjectCount={accessibleProjectIds.size}
            />
        </PageBody>
    );
}

type Membership = {
    role: string;
    workspace: {
        id: string;
        slug: string;
        name: string;
        description: string | null;
        updatedAt: Date;
        _count: {
            members: number;
        };
    };
};

type RecentProject = {
    id: string;
    name: string;
    description: string | null;
    updatedAt: Date;
    visibility: string;
    isLocked: boolean;
    workspace: {
        id: string;
        slug: string;
        name: string;
    };
};

function MemberDashboardView({
    session,
    memberships,
    recentProjects,
    accessibleProjectCountByWorkspace,
    totalAccessibleProjectCount,
}: {
    session: {
        user: {
            name?: string | null;
            email?: string | null;
        };
    };
    memberships: Membership[];
    recentProjects: RecentProject[];
    accessibleProjectCountByWorkspace: Map<string, number>;
    totalAccessibleProjectCount: number;
}) {
    const teammateCount = memberships.reduce(
        (total, membership) => total + membership.workspace._count.members,
        0,
    );

    const firstName =
        session.user.name?.trim().split(" ")[0] ||
        session.user.email?.split("@")[0] ||
        "there";

    const workspaceCount = memberships.length;

    return (
        <>
            <PageHeader
                eyebrow="Your workspace"
                title={`Good to see you, ${firstName}.`}
                description={
                    workspaceCount
                        ? "Here's what's happening across the places you work."
                        : "Create a workspace and start bringing your team's work together."
                }
                actions={
                    workspaceCount ? (
                        <Link href="/workspace" className={buttonStyles()}>
                            View workspaces
                            <ArrowRight className="size-4" />
                        </Link>
                    ) : (
                        <Link
                            href="/workspace/new"
                            className={buttonStyles()}
                        >
                            <Plus className="size-4" />
                            Create workspace
                        </Link>
                    )
                }
            />

            {memberships.length ? (
                <>
                    <section className="mt-8 grid gap-4 sm:grid-cols-3">
                        <StatCard
                            icon={<Building2 />}
                            label="Workspaces"
                            value={workspaceCount}
                            detail={
                                workspaceCount === 1
                                    ? "You're part of one workspace"
                                    : "Workspaces you're part of"
                            }
                        />

                        <StatCard
                            icon={<FolderKanban />}
                            label="Projects"
                            value={totalAccessibleProjectCount}
                            detail="Projects you can access"
                        />

                        <StatCard
                            icon={<UsersRound />}
                            label="People"
                            value={teammateCount}
                            detail="Across your workspaces"
                        />
                    </section>

                    <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
                        <Card as="div" className="p-5 sm:p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-semibold">
                                        Pick up where you left off
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        Recently updated projects from your
                                        workspaces.
                                    </p>
                                </div>

                                <Link
                                    href="/workspace"
                                    className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
                                >
                                    Browse all
                                    <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
                                </Link>
                            </div>

                            {recentProjects.length ? (
                                <div className="-mx-3 mt-4 divide-y divide-slate-100 dark:divide-white/[0.07]">
                                    {recentProjects.map((project) =>
                                        project.isLocked ? (
                                            <div
                                                key={project.id}
                                                title="This private project isn't available to you."
                                                className="flex cursor-not-allowed items-center gap-4 px-3 py-3.5 opacity-60"
                                            >
                                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-white/[0.06] dark:text-slate-500">
                                                    <Lock className="size-4" />
                                                </span>

                                                <div className="min-w-0 flex-1">
                                                    <h3 className="truncate text-sm font-semibold text-slate-500 dark:text-slate-400">
                                                        {project.name}
                                                    </h3>

                                                    <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-500">
                                                        {project.workspace.name}{" "}
                                                        · Private project
                                                    </p>
                                                </div>

                                                <time className="hidden text-xs text-slate-500 sm:block">
                                                    {project.updatedAt.toLocaleDateString()}
                                                </time>
                                            </div>
                                        ) : (
                                            <Link
                                                key={project.id}
                                                href={`/workspace/${project.workspace.slug}`}
                                                style={accentVars(
                                                    accentFor(
                                                        project.workspace.slug,
                                                    ),
                                                )}
                                                className="
                                                    group flex items-center gap-4 rounded-xl px-3 py-3.5
                                                    outline-none transition-colors
                                                    hover:bg-[rgb(var(--accent)/0.07)]
                                                    focus-visible:bg-[rgb(var(--accent)/0.07)]
                                                    focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.5)]
                                                "
                                            >
                                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--accent)/0.12)] text-[rgb(var(--accent))]">
                                                    <FolderKanban className="size-5" />
                                                </span>

                                                <div className="min-w-0 flex-1">
                                                    <h3 className="truncate text-sm font-semibold text-slate-900 transition-colors group-hover:text-[rgb(var(--accent))] dark:text-white">
                                                        {project.name}
                                                    </h3>

                                                    <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                                                        {project.workspace.name}{" "}
                                                        ·{" "}
                                                        {project.description ||
                                                            "No description yet."}
                                                    </p>
                                                </div>

                                                <time className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
                                                    {project.updatedAt.toLocaleDateString()}
                                                </time>

                                                <ArrowRight className="size-4 shrink-0 text-slate-400 transition-all group-hover:translate-x-1 group-hover:text-[rgb(var(--accent))]" />
                                            </Link>
                                        ),
                                    )}
                                </div>
                            ) : (
                                <EmptyState
                                    className="mt-6 rounded-xl border border-dashed border-slate-200 dark:border-white/10"
                                    icon={<FolderKanban />}
                                    title="Nothing here yet"
                                    description="Projects you can access will show up here as your team starts working."
                                />
                            )}
                        </Card>

                        <Card as="aside" className="p-5 sm:p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-semibold">
                                        Your workspaces
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        The teams and spaces you work in.
                                    </p>
                                </div>

                                <Building2 className="size-5 text-slate-400" />
                            </div>

                            <div className="mt-5 space-y-3">
                                {memberships.slice(0, 4).map(
                                    ({ role, workspace }, i) => {
                                        const accessibleCount =
                                            accessibleProjectCountByWorkspace.get(
                                                workspace.id,
                                            ) ?? 0;

                                        return (
                                            <CardLink
                                                key={workspace.id}
                                                href={`/workspace/${workspace.slug}`}
                                                interactive
                                                reveal
                                                delay={i * 60}
                                                accent={accentFor(
                                                    workspace.slug,
                                                )}
                                                className="block p-4 shadow-none"
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <h3 className="truncate text-sm font-semibold text-slate-900 transition-colors group-hover:text-[rgb(var(--accent))] dark:text-white">
                                                        {workspace.name}
                                                    </h3>

                                                    <RoleBadge
                                                        role={role}
                                                        className="px-2 py-0.5 text-[10px]"
                                                    />
                                                </div>

                                                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                                    {accessibleCount}{" "}
                                                    {accessibleCount === 1
                                                        ? "project"
                                                        : "projects"}{" "}
                                                    ·{" "}
                                                    {workspace._count.members}{" "}
                                                    {workspace._count.members ===
                                                    1
                                                        ? "person"
                                                        : "people"}
                                                </p>
                                            </CardLink>
                                        );
                                    },
                                )}
                            </div>

                            {memberships.length > 4 && (
                                <Link
                                    href="/workspace"
                                    className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400"
                                >
                                    See all {memberships.length} workspaces
                                    <ArrowRight className="size-4" />
                                </Link>
                            )}
                        </Card>
                    </section>
                </>
            ) : (
                <Card className="mt-8 border-dashed border-slate-300 dark:border-white/15">
                    <EmptyState
                        className="sm:py-16"
                        icon={<Building2 />}
                        title="You don't have a workspace yet"
                        description="Create one for your team, invite a few people, and start organizing your projects."
                        action={
                            <Link
                                href="/workspace/new"
                                className={buttonStyles()}
                            >
                                <Plus className="size-4" />
                                Create workspace
                            </Link>
                        }
                    />
                </Card>
            )}
        </>
    );
}

