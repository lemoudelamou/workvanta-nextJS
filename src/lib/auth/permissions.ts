/**
 * Workvanta authorization model — the single source of truth.
 *
 * Every page (to decide what to show) and every server action (to decide
 * what to allow) should go through these helpers instead of comparing role
 * strings inline. Keeping the rules in one place is what stops the UI and
 * the server from drifting apart.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Workspace roles (ranked, highest first)
 *
 *   OWNER   Everything, including deleting the workspace and transferring
 *           ownership. Exactly one per workspace.
 *   ADMIN   Manage people (invite, remove MEMBER/GUEST, revoke invites),
 *           and act as project ADMIN on every project.
 *   MEMBER  Create projects; EDITOR on every workspace-visible project
 *           unless given a different explicit project role.
 *   GUEST   Only sees projects they were explicitly added to.
 *
 * Project roles (explicit ProjectMember rows)
 *
 *   ADMIN   Manage project members, visibility, and delete the project.
 *   EDITOR  Create, edit, move and delete tasks, subtasks and attachments.
 *   VIEWER  Read the project and take part in discussion (comments).
 *
 * Effective project role
 *
 *   1. Workspace OWNER / ADMIN       -> ADMIN (always, cannot be lowered)
 *   2. Explicit ProjectMember row    -> that role
 *   3. MEMBER on a WORKSPACE project -> EDITOR
 *   4. Anything else                 -> no access
 * ─────────────────────────────────────────────────────────────────────────
 */

export type WorkspaceRoleName = "OWNER" | "ADMIN" | "MEMBER" | "GUEST";
export type ProjectRoleName = "ADMIN" | "EDITOR" | "VIEWER";
export type ProjectVisibilityName = "WORKSPACE" | "PRIVATE";

export const WORKSPACE_ROLES: readonly WorkspaceRoleName[] = [
    "OWNER",
    "ADMIN",
    "MEMBER",
    "GUEST",
];

/** Roles that can be handed out by invitation or role change. */
export const ASSIGNABLE_WORKSPACE_ROLES: readonly Exclude<WorkspaceRoleName, "OWNER">[] = [
    "ADMIN",
    "MEMBER",
    "GUEST",
];

export const PROJECT_ROLES: readonly ProjectRoleName[] = [
    "ADMIN",
    "EDITOR",
    "VIEWER",
];

const WORKSPACE_RANK: Record<WorkspaceRoleName, number> = {
    OWNER: 0,
    ADMIN: 1,
    MEMBER: 2,
    GUEST: 3,
};

const PROJECT_RANK: Record<ProjectRoleName, number> = {
    ADMIN: 0,
    EDITOR: 1,
    VIEWER: 2,
};

export function isWorkspaceRole(value: unknown): value is WorkspaceRoleName {
    return typeof value === "string" && (WORKSPACE_ROLES as readonly string[]).includes(value);
}

export function isAssignableWorkspaceRole(
    value: unknown,
): value is Exclude<WorkspaceRoleName, "OWNER"> {
    return (
        typeof value === "string" &&
        (ASSIGNABLE_WORKSPACE_ROLES as readonly string[]).includes(value)
    );
}

export function isProjectRole(value: unknown): value is ProjectRoleName {
    return typeof value === "string" && (PROJECT_ROLES as readonly string[]).includes(value);
}

export function isProjectVisibility(value: unknown): value is ProjectVisibilityName {
    return value === "WORKSPACE" || value === "PRIVATE";
}

/** True when `a` is a strictly higher workspace role than `b`. */
export function outranks(a: WorkspaceRoleName, b: WorkspaceRoleName) {
    return WORKSPACE_RANK[a] < WORKSPACE_RANK[b];
}

export function isWorkspaceManager(role: WorkspaceRoleName | null | undefined) {
    return role === "OWNER" || role === "ADMIN";
}

/** Returns the higher of two project roles. */
export function maxProjectRole(
    a: ProjectRoleName | null,
    b: ProjectRoleName | null,
): ProjectRoleName | null {
    if (!a) return b;
    if (!b) return a;
    return PROJECT_RANK[a] <= PROJECT_RANK[b] ? a : b;
}

export function compareWorkspaceRoles(a: WorkspaceRoleName, b: WorkspaceRoleName) {
    return WORKSPACE_RANK[a] - WORKSPACE_RANK[b];
}

export function compareProjectRoles(a: ProjectRoleName, b: ProjectRoleName) {
    return PROJECT_RANK[a] - PROJECT_RANK[b];
}

/* ───────────────────────────── Workspace ───────────────────────────── */

export type WorkspacePermission =
    | "workspace.view"
    | "workspace.update"
    | "workspace.delete"
    | "workspace.transfer"
    | "workspace.leave"
    | "members.view"
    | "members.invite"
    | "members.inviteAdmin"
    | "members.changeRole"
    | "members.remove"
    | "invitations.manage"
    | "projects.create";

const WORKSPACE_MATRIX: Record<WorkspacePermission, readonly WorkspaceRoleName[]> = {
    "workspace.view": ["OWNER", "ADMIN", "MEMBER", "GUEST"],
    "workspace.update": ["OWNER", "ADMIN"],
    "workspace.delete": ["OWNER"],
    "workspace.transfer": ["OWNER"],
    // The owner must transfer ownership before leaving.
    "workspace.leave": ["ADMIN", "MEMBER", "GUEST"],
    "members.view": ["OWNER", "ADMIN", "MEMBER", "GUEST"],
    "members.invite": ["OWNER", "ADMIN"],
    "members.inviteAdmin": ["OWNER"],
    "members.changeRole": ["OWNER"],
    "members.remove": ["OWNER", "ADMIN"],
    "invitations.manage": ["OWNER", "ADMIN"],
    "projects.create": ["OWNER", "ADMIN", "MEMBER"],
};

export function canWorkspace(
    role: WorkspaceRoleName | null | undefined,
    permission: WorkspacePermission,
) {
    return !!role && WORKSPACE_MATRIX[permission].includes(role);
}

/**
 * Can `actor` remove `target` from the workspace?
 * You can only remove people ranked strictly below you, never yourself
 * (use "leave" for that) and never the owner.
 */
export function canRemoveWorkspaceMember(
    actor: { role: WorkspaceRoleName; memberId: string },
    target: { role: WorkspaceRoleName; memberId: string },
) {
    if (!canWorkspace(actor.role, "members.remove")) return false;
    if (actor.memberId === target.memberId) return false;
    if (target.role === "OWNER") return false;
    return outranks(actor.role, target.role);
}

/** Can `actor` change `target`'s workspace role to `nextRole`? */
export function canChangeWorkspaceRole(
    actor: { role: WorkspaceRoleName; memberId: string },
    target: { role: WorkspaceRoleName; memberId: string },
    nextRole: unknown,
) {
    if (!canWorkspace(actor.role, "members.changeRole")) return false;
    if (actor.memberId === target.memberId) return false;
    if (target.role === "OWNER") return false;
    // OWNER can only be handed over through an explicit ownership transfer.
    return isAssignableWorkspaceRole(nextRole);
}

/** Which roles may `actor` hand out in a workspace invitation? */
export function invitableWorkspaceRoles(actor: WorkspaceRoleName) {
    if (!canWorkspace(actor, "members.invite")) return [];
    return ASSIGNABLE_WORKSPACE_ROLES.filter(
        (role) => role !== "ADMIN" || canWorkspace(actor, "members.inviteAdmin"),
    );
}

/* ────────────────────────────── Project ────────────────────────────── */

export type ProjectPermission =
    | "project.view"
    | "project.update"
    | "project.delete"
    | "project.members.view"
    | "project.members.manage"
    | "task.create"
    | "task.edit"
    | "task.delete"
    | "task.comment"
    | "comment.moderate"
    | "attachment.upload"
    | "attachment.delete";

const PROJECT_MATRIX: Record<ProjectPermission, readonly ProjectRoleName[]> = {
    "project.view": ["ADMIN", "EDITOR", "VIEWER"],
    "project.update": ["ADMIN"],
    "project.delete": ["ADMIN"],
    "project.members.view": ["ADMIN", "EDITOR", "VIEWER"],
    "project.members.manage": ["ADMIN"],
    "task.create": ["ADMIN", "EDITOR"],
    "task.edit": ["ADMIN", "EDITOR"],
    "task.delete": ["ADMIN", "EDITOR"],
    "task.comment": ["ADMIN", "EDITOR", "VIEWER"],
    "comment.moderate": ["ADMIN"],
    "attachment.upload": ["ADMIN", "EDITOR"],
    "attachment.delete": ["ADMIN", "EDITOR"],
};

export type ProjectAccessInput = {
    workspaceRole: WorkspaceRoleName | null | undefined;
    projectRole: ProjectRoleName | null | undefined;
    visibility: ProjectVisibilityName;
};

/** Resolve the role a user actually has on a project (or null = no access). */
export function effectiveProjectRole({
    workspaceRole,
    projectRole,
    visibility,
}: ProjectAccessInput): ProjectRoleName | null {
    if (!workspaceRole) return null;

    if (isWorkspaceManager(workspaceRole)) return "ADMIN";

    if (projectRole) return projectRole;

    if (workspaceRole === "MEMBER" && visibility === "WORKSPACE") {
        return "EDITOR";
    }

    return null;
}

export function canProject(
    role: ProjectRoleName | null | undefined,
    permission: ProjectPermission,
) {
    return !!role && PROJECT_MATRIX[permission].includes(role);
}

/** Convenience: every project permission resolved to a boolean, for pages. */
export function projectCapabilities(role: ProjectRoleName | null | undefined) {
    return Object.fromEntries(
        (Object.keys(PROJECT_MATRIX) as ProjectPermission[]).map((permission) => [
            permission,
            canProject(role, permission),
        ]),
    ) as Record<ProjectPermission, boolean>;
}

/** Same for workspace permissions. */
export function workspaceCapabilities(role: WorkspaceRoleName | null | undefined) {
    return Object.fromEntries(
        (Object.keys(WORKSPACE_MATRIX) as WorkspacePermission[]).map((permission) => [
            permission,
            canWorkspace(role, permission),
        ]),
    ) as Record<WorkspacePermission, boolean>;
}

/**
 * Prisma `where` fragment selecting the projects a user can see inside a
 * workspace, given their workspace role. Use it in list queries so private
 * projects never leak to people who are not on them.
 */
export function visibleProjectsWhere(userId: string, workspaceRole: WorkspaceRoleName) {
    if (isWorkspaceManager(workspaceRole)) return {};

    if (workspaceRole === "GUEST") {
        return { members: { some: { userId } } };
    }

    return {
        OR: [
            { visibility: "WORKSPACE" as const },
            { members: { some: { userId } } },
        ],
    };
}

/**
 * Prisma `where` fragment selecting the users that can access a project —
 * used to build assignee / mention lists so nobody can be assigned to (or
 * notified about) a project they cannot open.
 */
export function projectAudienceWhere(project: {
    id: string;
    workspaceId: string;
    visibility: ProjectVisibilityName;
}) {
    const orClauses: object[] = [
        { role: { in: ["OWNER", "ADMIN"] } },
        { user: { projectMemberships: { some: { projectId: project.id } } } },
    ];

    if (project.visibility === "WORKSPACE") {
        orClauses.push({ role: "MEMBER" });
    }

    return { workspaceId: project.workspaceId, OR: orClauses };
}

/** Human-readable role descriptions, shared by every page. */
export const WORKSPACE_ROLE_DESCRIPTIONS: Record<WorkspaceRoleName, string> = {
    OWNER: "Full access, including ownership",
    ADMIN: "Manage people and every project",
    MEMBER: "Create projects and edit shared ones",
    GUEST: "Only projects they're invited to",
};

export const PROJECT_ROLE_DESCRIPTIONS: Record<ProjectRoleName, string> = {
    ADMIN: "Manage members, settings and tasks",
    EDITOR: "Create and edit tasks",
    VIEWER: "View and comment",
};

/** Error thrown when an action is not allowed. Message is user-safe. */
export class ForbiddenError extends Error {
    constructor(message = "You do not have permission to perform this action.") {
        super(message);
        this.name = "ForbiddenError";
    }
}
