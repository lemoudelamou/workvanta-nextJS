import {
    canChangeWorkspaceRole,
    canProject,
    canRemoveWorkspaceMember,
    canWorkspace,
    compareWorkspaceRoles,
    effectiveProjectRole,
    invitableWorkspaceRoles,
    isAssignableWorkspaceRole,
    projectAudienceWhere,
    visibleProjectsWhere,
    type WorkspaceRoleName,
} from "@/lib/auth/permissions";

const actor = (role: WorkspaceRoleName, memberId = "actor") => ({ role, memberId });
const target = (role: WorkspaceRoleName, memberId = "target") => ({ role, memberId });

describe("effectiveProjectRole", () => {
    it("gives workspace owners and admins ADMIN on every project", () => {
        for (const workspaceRole of ["OWNER", "ADMIN"] as const) {
            for (const visibility of ["WORKSPACE", "PRIVATE"] as const) {
                expect(
                    effectiveProjectRole({ workspaceRole, projectRole: "VIEWER", visibility }),
                ).toBe("ADMIN");
            }
        }
    });

    it("lets members edit shared projects by default", () => {
        expect(
            effectiveProjectRole({ workspaceRole: "MEMBER", projectRole: null, visibility: "WORKSPACE" }),
        ).toBe("EDITOR");
    });

    it("respects an explicit VIEWER role for members", () => {
        expect(
            effectiveProjectRole({ workspaceRole: "MEMBER", projectRole: "VIEWER", visibility: "WORKSPACE" }),
        ).toBe("VIEWER");
    });

    it("hides private projects from members who are not on them", () => {
        expect(
            effectiveProjectRole({ workspaceRole: "MEMBER", projectRole: null, visibility: "PRIVATE" }),
        ).toBeNull();
    });

    it("only lets guests into projects they were added to", () => {
        expect(
            effectiveProjectRole({ workspaceRole: "GUEST", projectRole: null, visibility: "WORKSPACE" }),
        ).toBeNull();
        expect(
            effectiveProjectRole({ workspaceRole: "GUEST", projectRole: "EDITOR", visibility: "PRIVATE" }),
        ).toBe("EDITOR");
    });

    it("denies non-members", () => {
        expect(
            effectiveProjectRole({ workspaceRole: null, projectRole: "ADMIN", visibility: "WORKSPACE" }),
        ).toBeNull();
    });
});

describe("project permissions", () => {
    it("lets viewers read and comment but not edit", () => {
        expect(canProject("VIEWER", "project.view")).toBe(true);
        expect(canProject("VIEWER", "task.comment")).toBe(true);
        expect(canProject("VIEWER", "task.edit")).toBe(false);
        expect(canProject("VIEWER", "attachment.upload")).toBe(false);
    });

    it("lets editors manage tasks but not the project", () => {
        expect(canProject("EDITOR", "task.create")).toBe(true);
        expect(canProject("EDITOR", "task.delete")).toBe(true);
        expect(canProject("EDITOR", "project.members.manage")).toBe(false);
        expect(canProject("EDITOR", "project.delete")).toBe(false);
        expect(canProject("EDITOR", "comment.moderate")).toBe(false);
    });

    it("gives project admins full control", () => {
        expect(canProject("ADMIN", "project.delete")).toBe(true);
        expect(canProject("ADMIN", "project.update")).toBe(true);
        expect(canProject("ADMIN", "comment.moderate")).toBe(true);
    });

    it("denies everything without a role", () => {
        expect(canProject(null, "project.view")).toBe(false);
    });
});

describe("workspace permissions", () => {
    it("blocks guests from creating projects", () => {
        expect(canWorkspace("GUEST", "projects.create")).toBe(false);
        expect(canWorkspace("MEMBER", "projects.create")).toBe(true);
    });

    it("keeps destructive actions with the owner", () => {
        expect(canWorkspace("OWNER", "workspace.delete")).toBe(true);
        expect(canWorkspace("ADMIN", "workspace.delete")).toBe(false);
        expect(canWorkspace("ADMIN", "workspace.transfer")).toBe(false);
    });

    it("makes the owner transfer before leaving", () => {
        expect(canWorkspace("OWNER", "workspace.leave")).toBe(false);
        expect(canWorkspace("GUEST", "workspace.leave")).toBe(true);
    });

    it("only lets the owner invite admins", () => {
        expect(invitableWorkspaceRoles("OWNER")).toEqual(["ADMIN", "MEMBER", "GUEST"]);
        expect(invitableWorkspaceRoles("ADMIN")).toEqual(["MEMBER", "GUEST"]);
        expect(invitableWorkspaceRoles("MEMBER")).toEqual([]);
    });
});

describe("canChangeWorkspaceRole", () => {
    it("never allows promoting someone to OWNER", () => {
        expect(canChangeWorkspaceRole(actor("OWNER"), target("MEMBER"), "OWNER")).toBe(false);
    });

    it("rejects values outside the enum", () => {
        expect(canChangeWorkspaceRole(actor("OWNER"), target("MEMBER"), "SUPERUSER")).toBe(false);
        expect(isAssignableWorkspaceRole(undefined)).toBe(false);
    });

    it("only lets the owner change roles", () => {
        expect(canChangeWorkspaceRole(actor("OWNER"), target("MEMBER"), "ADMIN")).toBe(true);
        expect(canChangeWorkspaceRole(actor("ADMIN"), target("MEMBER"), "GUEST")).toBe(false);
    });

    it("blocks changing your own role or the owner's", () => {
        expect(canChangeWorkspaceRole(actor("OWNER", "a"), target("OWNER", "a"), "ADMIN")).toBe(false);
        expect(canChangeWorkspaceRole(actor("OWNER"), target("OWNER"), "ADMIN")).toBe(false);
    });
});

describe("canRemoveWorkspaceMember", () => {
    it("lets admins remove members and guests, not other admins", () => {
        expect(canRemoveWorkspaceMember(actor("ADMIN"), target("MEMBER"))).toBe(true);
        expect(canRemoveWorkspaceMember(actor("ADMIN"), target("GUEST"))).toBe(true);
        expect(canRemoveWorkspaceMember(actor("ADMIN"), target("ADMIN"))).toBe(false);
    });

    it("never removes the owner or yourself", () => {
        expect(canRemoveWorkspaceMember(actor("OWNER"), target("OWNER"))).toBe(false);
        expect(canRemoveWorkspaceMember(actor("OWNER", "a"), target("ADMIN", "a"))).toBe(false);
    });

    it("does not let members remove anyone", () => {
        expect(canRemoveWorkspaceMember(actor("MEMBER"), target("GUEST"))).toBe(false);
    });
});

describe("query helpers", () => {
    it("scopes visible projects by role", () => {
        expect(visibleProjectsWhere("u1", "OWNER")).toEqual({});
        expect(visibleProjectsWhere("u1", "GUEST")).toEqual({
            members: { some: { userId: "u1" } },
        });
        expect(visibleProjectsWhere("u1", "MEMBER")).toEqual({
            OR: [{ visibility: "WORKSPACE" }, { members: { some: { userId: "u1" } } }],
        });
    });

    it("excludes plain members from private project audiences", () => {
        const where = projectAudienceWhere({ id: "p1", workspaceId: "w1", visibility: "PRIVATE" });
        expect(where.OR).not.toContainEqual({ role: "MEMBER" });

        const shared = projectAudienceWhere({ id: "p1", workspaceId: "w1", visibility: "WORKSPACE" });
        expect(shared.OR).toContainEqual({ role: "MEMBER" });
    });

    it("ranks roles from owner down", () => {
        expect(compareWorkspaceRoles("OWNER", "GUEST")).toBeLessThan(0);
        expect(compareWorkspaceRoles("GUEST", "MEMBER")).toBeGreaterThan(0);
    });
});
