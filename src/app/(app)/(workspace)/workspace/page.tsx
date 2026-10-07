import {
    Building2,
    FolderKanban,
    Plus,
    UsersRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Kpi } from "@/app/style/Kpi";
import { WorkspaceSection } from "./components/WorkspaceSection";
import { NewWorkspaceTile } from "./components/NewWorspaceTile";
import { WorkspaceRole } from "@/generated/prisma/enums";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { PageBody } from "@/components/ui/PageBody";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonStyles } from "@/app/style/button-style";


const KPI_STRIP =
    "grid gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-sm sm:grid-cols-3";



export default async function WorkspaceIndexPage() {
    const session = await getSession();

    if (!session?.user) {
        redirect("/signin");
    }

    const memberships = await prisma.workspaceMember.findMany({
        where: {
            userId: session.user.id,
        },
        orderBy: {
            workspace: {
                updatedAt: "desc",
            },
        },
        select: {
            role: true,
            workspace: {
                select: {
                    id: true,
                    slug: true,
                    name: true,
                    description: true,
                    updatedAt: true,
                    _count: {
                        select: {
                            members: true,
                            projects: true,
                        },
                    },
                },
            },
        },
    });

    const ownedWorkspaces = memberships.filter(
        ({ role }) => role === WorkspaceRole.OWNER,
    );

    const sharedWorkspaces = memberships.filter(
        ({ role }) => role !== WorkspaceRole.OWNER,
    );

    const totalProjects = memberships.reduce(
        (sum, m) => sum + m.workspace._count.projects,
        0,
    );

    return (
        <PageBody>
            <PageHeader
                eyebrow="Workspaces"
                title="Your workspaces"
                description="Open a workspace to see its projects and people, or create one for a new team."
                actions={
                    <Link href="/workspace/new" className={buttonStyles()}>
                        <Plus className="size-4" aria-hidden="true" />
                        Create workspace
                    </Link>
                }
            />

            {memberships.length === 0 ? (
                <Card className="mt-10 border-dashed border-border bg-card">
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
            ) : (
                <>
                    <section aria-label="Summary" className={`mt-8 ${KPI_STRIP}`}>
                        <Kpi
                            tone="blue"
                            icon={<Building2 />}
                            label="Owned by you"
                            value={ownedWorkspaces.length}
                            helper="Workspaces you created"
                        />
                        <Kpi
                            tone="violet"
                            icon={<UsersRound />}
                            label="Shared with you"
                            value={sharedWorkspaces.length}
                            helper="Workspaces you've been invited to"
                        />
                        <Kpi
                            tone="amber"
                            icon={<FolderKanban />}
                            label="Projects"
                            value={totalProjects}
                            helper="Across all of your workspaces"
                        />
                    </section>

                    <WorkspaceSection
                        id="my-workspaces"
                        title="Owned by you"
                        description="Workspaces you created and manage."
                        items={ownedWorkspaces}
                        className="mt-12"
                        trailing={<NewWorkspaceTile />}
                        empty={
                            <Card className="border-dashed border-border bg-card">
                                <EmptyState
                                    className="sm:py-12"
                                    icon={<Building2 />}
                                    title="You don't own a workspace yet"
                                    description="Create one to give your team a shared home."
                                    action={
                                        <Link
                                            href="/workspace/new"
                                            className={buttonStyles()}
                                        >
                                            <Plus className="size-4" aria-hidden="true" />
                                            Create workspace
                                        </Link>
                                    }
                                />
                            </Card>
                        }
                    />

                    <WorkspaceSection
                        id="shared-workspaces"
                        title="Shared with you"
                        description="Workspaces where you're a collaborator."
                        items={sharedWorkspaces}
                        className="mt-12"
                        empty={
                            <Card className="border-dashed border-border bg-card">
                                <EmptyState
                                    className="sm:py-12"
                                    icon={<UsersRound />}
                                    title="Nothing shared with you yet"
                                    description="When someone invites you to a workspace, it will appear here."
                                />
                            </Card>
                        }
                    />
                </>
            )}
        </PageBody>
    );
}