import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export type ProjectRoleName = "ADMIN" | "EDITOR" | "VIEWER";
export type WorkspaceRoleName = "OWNER" | "ADMIN" | "MEMBER" | "GUEST";

export type ProjectAccessResult = {
    userId: string;
    workspace: { id: string; slug: string; name: string };
    project: {
        id: string;
        name: string;
        visibility: "WORKSPACE" | "PRIVATE";
        workspaceId: string;
    };
    workspaceRole: WorkspaceRoleName;
    projectRole: ProjectRoleName | null;
};

async function loadProjectContext(
    slug: string,
    projectId: string,
    userId: string,
) {
    const project = await prisma.project.findFirst({
        where: {
            id: projectId,
            workspace: { slug },
        },
        include: { workspace: true },
    });

    if (!project) return null;

    const [workspaceMembership, projectMembership] = await Promise.all([
        prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: project.workspaceId,
                    userId,
                },
            },
        }),
        prisma.projectMember.findUnique({
            where: {
                projectId_userId: {
                    projectId: project.id,
                    userId,
                },
            },
        }),
    ]);

    return { project, workspaceMembership, projectMembership };
}

/**
 * Ensures the current user can at least VIEW the given project.
 *
 * Rules:
 *  - Not signed in -> redirect to /signin
 *  - Not a workspace member at all -> throw
 *  - Workspace OWNER/ADMIN -> always allowed (override)
 *  - Project visibility = WORKSPACE -> any workspace member (not GUEST-only-elsewhere) is allowed
 *  - Project visibility = PRIVATE -> must have an explicit ProjectMember row
 */
export async function requireProjectAccess(
    slug: string,
    projectId: string,
): Promise<ProjectAccessResult> {
    const session = await getSession();

    if (!session?.user?.id) {
        redirect(
            `/signin?callbackUrl=/workspace/${slug}/project/${projectId}`,
        );
    }

    const userId = session.user.id;
    const context = await loadProjectContext(slug, projectId, userId);

    if (!context) {
        throw new Error("Project not found.");
    }

    const { project, workspaceMembership, projectMembership } = context;

    if (!workspaceMembership) {
        throw new Error("You are not a member of this workspace.");
    }

    const isWorkspaceOwnerOrAdmin =
        workspaceMembership.role === "OWNER" ||
        workspaceMembership.role === "ADMIN";

    // GUESTs never get the "workspace-visible" free pass — they can only
    // see projects they've been explicitly added to as a ProjectMember,
    // no matter that project's visibility setting.
    const canView =
        isWorkspaceOwnerOrAdmin ||
        !!projectMembership ||
        (workspaceMembership.role !== "GUEST" &&
            project.visibility === "WORKSPACE");

    if (!canView) {
        throw new Error("You do not have access to this project.");
    }

    return {
        userId,
        workspace: project.workspace,
        project,
        workspaceRole: workspaceMembership.role as WorkspaceRoleName,
        projectRole: (projectMembership?.role as ProjectRoleName) ?? null,
    };
}

/**
 * Ensures the current user has one of the given project roles.
 * Workspace OWNER/ADMIN always pass, since they can manage any project.
 */
export async function requireProjectRole(
    slug: string,
    projectId: string,
    allowedRoles: ProjectRoleName[],
): Promise<ProjectAccessResult> {
    const access = await requireProjectAccess(slug, projectId);

    const isWorkspaceOwnerOrAdmin =
        access.workspaceRole === "OWNER" || access.workspaceRole === "ADMIN";

    if (isWorkspaceOwnerOrAdmin) return access;   // <- always passes, no ProjectMember row needed

    if (!access.projectRole || !allowedRoles.includes(access.projectRole)) {
        throw new Error("You do not have permission to perform this action.");
    }

    return access;
}
