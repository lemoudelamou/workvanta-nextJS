import { Building2, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

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
import { pageTitle } from "@/lib/navigation/page-title";






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
                    members: {
                        orderBy: { createdAt: "asc" },
                        take: 4,
                        select: { user: { select: { id: true, name: true, email: true, image: true } } },
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

                    <WorkspaceSection
                        id="my-workspaces"
                        title="Owned by you"
                        description="Workspaces you created and manage."
                        items={ownedWorkspaces}
                        className="mt-8"
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

                    {/* Only once someone has invited you somewhere. */}
                    {sharedWorkspaces.length > 0 && (
                        <WorkspaceSection
                            id="shared-workspaces"
                            title="Shared with you"
                            description="Workspaces where you're a collaborator."
                            items={sharedWorkspaces}
                            className="mt-10"
                            empty={null}
                        />
                    )}
                </>
            )}
        </PageBody>
    );
}

export const metadata = pageTitle("Workspaces");
