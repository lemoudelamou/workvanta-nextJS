import {
    ArrowRight,
    Building2,
    FolderKanban,
    Plus,
    ShieldCheck,
    UsersRound,
} from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { buttonStyles } from "@/app/style/button-style";

import type {
    Membership,
    RecentProject,
} from "@/app/(app)/(dashboard)/dashboard/components/types";

import { Kpi } from "./Kpi";
import { ProjectRow } from "./ProjectRow";
import { SectionTitle } from "./SectionTitle";
import { WorkspaceCard } from "./WorkspaceCard";

const KPI_STRIP =
    "grid gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-sm sm:grid-cols-2 xl:grid-cols-4";



export function DashboardView({
    session,
    memberships,
    recentProjects,
    accessibleProjectCountByWorkspace,
    totalAccessibleProjectCount,
}: {
    session: { user: { name?: string | null; email?: string | null } };
    memberships: Membership[];
    recentProjects: RecentProject[];
    accessibleProjectCountByWorkspace: Map<string, number>;
    totalAccessibleProjectCount: number;
}) {
    const teammateCount = memberships.reduce(
        (total, m) => total + m.workspace._count.members,
        0,
    );

    const managedCount = memberships.filter(
        (m) => m.role === "OWNER" || m.role === "ADMIN",
    ).length;

    const firstName =
        session.user.name?.trim().split(" ")[0] ||
        session.user.email?.split("@")[0] ||
        "there";

    return (
        <>
            <PageHeader
                eyebrow="Dashboard"
                title={`Welcome back, ${firstName}`}
                description="Everything you're working on, across all of your workspaces."
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href="/workspace/new"
                            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <Plus className="size-4" aria-hidden="true" />
                            New workspace
                        </Link>
                        <Link href="/workspace" className={buttonStyles()}>
                            All workspaces
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                    </div>
                }
            />

            <section aria-label="Summary" className={`mt-8 ${KPI_STRIP}`}>
                <Kpi
                    tone="blue"
                    icon={<Building2 />}
                    label="Workspaces"
                    value={memberships.length}
                    helper="Teams you belong to"
                />
                <Kpi
                    tone="violet"
                    icon={<FolderKanban />}
                    label="Projects"
                    value={totalAccessibleProjectCount}
                    helper="Projects you can open"
                />
                <Kpi
                    tone="amber"
                    icon={<UsersRound />}
                    label="Teammates"
                    value={teammateCount}
                    helper="People across your workspaces"
                />
                <Kpi
                    tone="green"
                    icon={<ShieldCheck />}
                    label="Managed by you"
                    value={managedCount}
                    helper="Workspaces where you're owner or admin"
                />
            </section>

            {memberships.length ? (
                <div className="mt-12 grid gap-x-12 gap-y-12 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
                    <section aria-labelledby="recent-projects">
                        <div className="flex items-end justify-between gap-4">
                            <div id="recent-projects">
                                <SectionTitle
                                    title="Recent projects"
                                    description="Latest activity across your workspaces."
                                />
                            </div>
                            <Link
                                href="/workspace"
                                className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                            >
                                Browse all
                                <ArrowRight
                                    className="size-3.5 transition-transform group-hover:translate-x-0.5"
                                    aria-hidden="true"
                                />
                            </Link>
                        </div>

                        {recentProjects.length ? (
                            <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-sm">
                                <div className="divide-y divide-border">
                                    {recentProjects.map((project) => (
                                        <ProjectRow key={project.id} project={project} />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <EmptyState
                                className="mt-5 rounded-2xl border border-dashed border-border"
                                icon={<FolderKanban />}
                                title="No projects yet"
                                description="Create a project in one of your workspaces and it will show up here."
                            />
                        )}
                    </section>

                    <aside aria-labelledby="your-workspaces">
                        <div id="your-workspaces">
                            <SectionTitle
                                title="Your workspaces"
                                description="Jump back into a team."
                            />
                        </div>

                        <div className="mt-5 space-y-3">
                            {memberships.slice(0, 4).map((membership) => (
                                <WorkspaceCard
                                    key={membership.workspace.id}
                                    membership={membership}
                                    accessibleCount={
                                        accessibleProjectCountByWorkspace.get(
                                            membership.workspace.id,
                                        ) ?? 0
                                    }
                                />
                            ))}
                        </div>

                        {memberships.length > 4 && (
                            <Link
                                href="/workspace"
                                className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-foreground underline-offset-4 hover:underline"
                            >
                                View all {memberships.length} workspaces
                                <ArrowRight className="size-4" aria-hidden="true" />
                            </Link>
                        )}
                    </aside>
                </div>
            ) : (
                <Card className="mt-12 border-dashed border-border bg-card">
                    <EmptyState
                        className="sm:py-16"
                        icon={<Building2 />}
                        title="Create your first workspace"
                        description="A workspace is a shared home for your team. Add people, then organize work into projects."
                        action={
                            <Link href="/workspace/new" className={buttonStyles()}>
                                <Plus className="size-4" aria-hidden="true" />
                                Create workspace
                            </Link>
                        }
                    />
                </Card>
            )}
        </>
    );
}