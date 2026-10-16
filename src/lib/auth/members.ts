import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
    canProject,
    effectiveProjectRole,
    ForbiddenError,
    projectAudienceWhere,
    type ProjectPermission,
    type ProjectRoleName,
    type WorkspaceRoleName,
} from "@/lib/auth/permissions";

export type { ProjectRoleName, WorkspaceRoleName } from "@/lib/auth/permissions";

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
    /** The explicit ProjectMember role, if any. */
    projectRole: ProjectRoleName | null;
    /** The role that actually applies (see lib/auth/permissions.ts). */
    effectiveRole: ProjectRoleName;
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
 * Ensures the current user can at least VIEW the given project and returns
 * their resolved roles. See lib/auth/permissions.ts for the rules.
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
        throw new ForbiddenError("You are not a member of this workspace.");
    }

    const workspaceRole = workspaceMembership.role as WorkspaceRoleName;
    const projectRole = (projectMembership?.role as ProjectRoleName) ?? null;

    const effectiveRole = effectiveProjectRole({
        workspaceRole,
        projectRole,
        visibility: project.visibility,
    });

    if (!effectiveRole) {
        throw new ForbiddenError("You do not have access to this project.");
    }

    return {
        userId,
        workspace: project.workspace,
        project,
        workspaceRole,
        projectRole,
        effectiveRole,
    };
}

/** Ensures the current user holds a specific project permission. */
export async function requireProjectPermission(
    slug: string,
    projectId: string,
    permission: ProjectPermission,
    message?: string,
): Promise<ProjectAccessResult> {
    const access = await requireProjectAccess(slug, projectId);

    if (!canProject(access.effectiveRole, permission)) {
        throw new ForbiddenError(message);
    }

    return access;
}

/**
 * Ensures the current user's effective project role is one of `allowedRoles`.
 * Workspace OWNER/ADMIN resolve to project ADMIN, so they pass any check
 * that includes ADMIN.
 */
export async function requireProjectRole(
    slug: string,
    projectId: string,
    allowedRoles: ProjectRoleName[],
): Promise<ProjectAccessResult> {
    const access = await requireProjectAccess(slug, projectId);

    if (!allowedRoles.includes(access.effectiveRole)) {
        throw new ForbiddenError();
    }

    return access;
}

/**
 * Users who can open the project — the only people who may be assigned to
 * its tasks, mentioned in it or notified about it.
 */
export async function listProjectAudience(project: {
    id: string;
    workspaceId: string;
    visibility: "WORKSPACE" | "PRIVATE";
}) {
    const members = await prisma.workspaceMember.findMany({
        where: projectAudienceWhere(project),
        orderBy: { user: { name: "asc" } },
        select: {
            user: {
                select: { id: true, name: true, email: true, image: true },
            },
        },
    });

    return members.map((member) => member.user);
}

/** Can this specific user open the project? Used to validate assignees. */
export async function userCanAccessProject(
    userId: string,
    project: {
        id: string;
        workspaceId: string;
        visibility: "WORKSPACE" | "PRIVATE";
    },
) {
    const match = await prisma.workspaceMember.findFirst({
        where: { ...projectAudienceWhere(project), userId },
        select: { id: true },
    });

    return !!match;
}
