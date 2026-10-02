import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { PageBody } from "@/components/ui/PageBody";
import type { RecentProject,  } from "@/app/(app)/(dashboard)/dashboard/components/types";
import { DashboardView } from "@/app/(app)/(dashboard)/dashboard/components/DashboardView";



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
        memberships.filter((m) => m.role === "GUEST").map((m) => m.workspace.id),
    );

    const [allProjects, ownProjectMemberships] = workspaceIds.length
        ? await Promise.all([
            prisma.project.findMany({
                where: { workspaceId: { in: workspaceIds } },
                select: {
                    id: true,
                    workspaceId: true,
                    visibility: true,
                    updatedAt: true,
                },
            }),
            prisma.projectMember.findMany({
                where: { userId: session.user.id },
                select: { projectId: true },
            }),
        ])
        : [[], []];

    const explicitProjectIds = new Set(
        ownProjectMemberships.map((m) => m.projectId),
    );

    const accessibleProjectIds = new Set(
        allProjects
            .filter((project) => {
                if (ownerOrAdminWorkspaceIds.has(project.workspaceId)) return true;
                if (explicitProjectIds.has(project.id)) return true;
                return (
                    !guestWorkspaceIds.has(project.workspaceId) &&
                    project.visibility === "WORKSPACE"
                );
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

    // Pick the five most recent displayable projects in memory, then fetch
    // full details for only those five (instead of an unbounded `IN` query).
    const recentIds = allProjects
        .filter(
            (project) =>
                !guestWorkspaceIds.has(project.workspaceId) ||
                accessibleProjectIds.has(project.id),
        )
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, 5)
        .map((project) => project.id);

    const rawRecentProjects = recentIds.length
        ? await prisma.project.findMany({
            where: { id: { in: recentIds } },
            orderBy: { updatedAt: "desc" },
            select: {
                id: true,
                name: true,
                description: true,
                updatedAt: true,
                visibility: true,
                workspace: { select: { id: true, slug: true, name: true } },
            },
        })
        : [];

    const recentProjects: RecentProject[] = rawRecentProjects.map((project) => ({
        ...project,
        isLocked:
            project.visibility === "PRIVATE" &&
            !accessibleProjectIds.has(project.id),
    }));

    return (
        <PageBody>
            <DashboardView
                session={session}
                memberships={memberships}
                recentProjects={recentProjects}
                accessibleProjectCountByWorkspace={accessibleProjectCountByWorkspace}
                totalAccessibleProjectCount={accessibleProjectIds.size}
            />
        </PageBody>
    );
}


