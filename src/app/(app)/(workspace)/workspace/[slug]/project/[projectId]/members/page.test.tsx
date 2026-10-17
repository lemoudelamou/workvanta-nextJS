/**
 * @jest-environment jsdom
 */
import { render, screen, within } from "@testing-library/react";

import ProjectMembersPage from "./page";
import { requireProjectAccess } from "@/lib/auth/members";
import { prisma } from "@/lib/db/prisma";
import { removeProjectMemberAction } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/members/member-actions";
import { effectiveProjectRole } from "@/lib/auth/permissions";

// ---------- module mocks ----------
jest.mock("next/navigation", () => ({
    notFound: jest.fn(() => {
        throw new Error("NEXT_NOT_FOUND");
    }),
}));
jest.mock("next/link", () => ({
    __esModule: true,
    default: ({ href, children, ...rest }: any) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));
jest.mock("next/image", () => ({
    __esModule: true,
    default: (props: any) => <span data-testid="avatar-image" data-src={props.src} />,
}));
jest.mock("@/lib/auth/members", () => ({ requireProjectAccess: jest.fn() }));
jest.mock("@/lib/db/prisma", () => ({
    prisma: {
        projectMember: { findMany: jest.fn() },
        workspaceMember: { findMany: jest.fn() },
    },
}));
jest.mock("@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/members/member-actions", () => {
    const action: any = jest.fn();
    action.bind = jest.fn((_this: unknown, ...args: unknown[]) => ({ boundTo: args }));
    return { removeProjectMemberAction: action };
});
jest.mock("@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/members/invite-project-member-form", () => ({
    InviteProjectMemberForm: ({ slug, projectId }: any) => (
        <div data-testid="invite-form" data-slug={slug} data-project={projectId} />
    ),
}));
jest.mock("@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/members/role-select", () => ({
    ProjectMemberRoleSelect: ({ slug, projectId, memberId, currentRole }: any) => (
        <div data-testid={`role-select-${memberId}`} data-slug={slug} data-project={projectId} data-role={currentRole} />
    ),
}));
jest.mock("@/components/ui/RowActions", () => ({
    RowActions: ({ label, actions }: any) => (
        <div data-testid={`actions:${label}`}>
            {actions.map((a: any) => (
                <span
                    key={a.label}
                    data-testid={`action:${a.label}`}
                    data-bound={JSON.stringify(a.run?.boundTo ?? null)}
                    data-description={a.confirm?.description ?? ""}
                >
                    {a.label}
                </span>
            ))}
        </div>
    ),
}));
jest.mock("@/components/ui/PageBody", () => ({
    PageBody: ({ children }: any) => <main>{children}</main>,
}));
jest.mock("@/components/ui/BreadCrumb", () => ({
    Breadcrumb: ({ items }: any) => (
        <nav data-testid="breadcrumb">{items.map((i: any) => `${i.label}|${i.href ?? ""}`).join(" > ")}</nav>
    ),
}));
jest.mock("@/components/ui/AccessDenied", () => ({
    AccessDeniedNotice: ({ message, workspaceSlug }: any) => (
        <div data-testid="access-denied" data-slug={workspaceSlug}>
            {message}
        </div>
    ),
}));

// ---------- handles ----------
const mockRequireProjectAccess = requireProjectAccess as jest.Mock;
const mockRemove = removeProjectMemberAction as unknown as { bind: jest.Mock };
const db = prisma as unknown as {
    projectMember: { findMany: jest.Mock };
    workspaceMember: { findMany: jest.Mock };
};

// ---------- helpers ----------
function makeAccess(overrides: Record<string, any> = {}) {
    const access: Record<string, any> = {
        userId: "me",
        workspaceRole: "MEMBER",
        projectRole: "VIEWER",
        workspace: { id: "w1", slug: "acme", name: "Acme Inc" },
        ...overrides,
        project: { id: "p1", name: "Apollo", visibility: "PRIVATE", ...overrides.project },
    };
    return {
        ...access,
        effectiveRole: effectiveProjectRole({
            workspaceRole: access.workspaceRole,
            projectRole: access.projectRole,
            visibility: access.project.visibility,
        }),
    };
}

type Person = { id: string; workspaceRole: string; projectRole?: string; name?: string | null; image?: string | null };

/** Sets up the workspace and project membership tables. */
function people(list: Person[]) {
    db.workspaceMember.findMany.mockResolvedValue(
        list.map((p) => ({
            userId: p.id,
            role: p.workspaceRole,
            user: { id: p.id, name: p.name === undefined ? `User ${p.id}` : p.name, email: `${p.id}@x.com`, image: p.image ?? null },
        })),
    );
    db.projectMember.findMany.mockResolvedValue(
        list.filter((p) => p.projectRole).map((p) => ({ id: `pm-${p.id}`, userId: p.id, role: p.projectRole })),
    );
}

async function renderPage() {
    return render(await ProjectMembersPage({ params: Promise.resolve({ slug: "acme", projectId: "p1" }) }));
}

const list = () => within(screen.getByRole("region", { name: /People with access/ }));
const rowOf = (name: string) => list().getByText(name).closest("li") as HTMLElement;

beforeEach(() => {
    mockRequireProjectAccess.mockResolvedValue(makeAccess());
    people([{ id: "me", workspaceRole: "MEMBER", projectRole: "VIEWER", name: "Me Myself" }]);
});

afterEach(() => jest.clearAllMocks());

// ---------- tests ----------
describe("ProjectMembersPage – access errors", () => {
    it("shows the not-found page when the project is gone", async () => {
        mockRequireProjectAccess.mockRejectedValue(new Error("Project not found."));
        await expect(renderPage()).rejects.toThrow("NEXT_NOT_FOUND");
    });

    it("explains when access is denied", async () => {
        mockRequireProjectAccess.mockRejectedValue(new Error("You do not have access to this project."));
        await renderPage();
        expect(screen.getByTestId("access-denied")).toHaveTextContent("You do not have access to this project.");
    });
});

describe("ProjectMembersPage – header and access", () => {
    it("names the workspace and project in the breadcrumb", async () => {
        await renderPage();

        expect(screen.getByTestId("breadcrumb")).toHaveTextContent(
            "Acme Inc|/workspace/acme > Apollo|/workspace/acme/project/p1 > Members|",
        );
        expect(screen.getByRole("heading", { level: 1, name: "Members & access" })).toBeInTheDocument();
    });

    it("explains a private project", async () => {
        await renderPage();
        expect(screen.getByText(/Private project/).closest("p")).toHaveTextContent(
            "Only people added here, plus Acme Inc's owners and admins, can open it.",
        );
    });

    it("explains a workspace-wide project", async () => {
        mockRequireProjectAccess.mockResolvedValue(makeAccess({ project: { visibility: "WORKSPACE" } }));
        await renderPage();
        expect(screen.getByText(/Shared with the workspace/).closest("p")).toHaveTextContent(
            "Everyone in Acme Inc except guests can open and edit it.",
        );
        expect(screen.getByRole("link", { name: "Change in project settings" })).toHaveAttribute("href", "/workspace/acme/project/p1");
    });
});

describe("ProjectMembersPage – who has access", () => {
    it("on a private project lists managers and added people only, with why they have access", async () => {
        people([
            { id: "own", workspaceRole: "OWNER" },
            { id: "adm", workspaceRole: "ADMIN" },
            { id: "mem", workspaceRole: "MEMBER" },
            { id: "added", workspaceRole: "MEMBER", projectRole: "EDITOR" },
            { id: "guest", workspaceRole: "GUEST" },
            { id: "me", workspaceRole: "MEMBER", projectRole: "VIEWER", name: "Me Myself" },
        ]);

        await renderPage();

        const names = list()
            .getAllByRole("listitem")
            .map((li) => li.querySelector("p span")?.textContent);
        expect(names).toEqual(["User adm", "User own", "User added", "Me Myself"]);
        expect(rowOf("User own")).toHaveTextContent("Workspace owner");
        expect(rowOf("User adm")).toHaveTextContent("Workspace admin");
        expect(rowOf("User added")).toHaveTextContent("Added to this project");
        expect(screen.getByText("2 added to this project directly, 2 through the workspace.")).toBeInTheDocument();
    });

    it("on a workspace-wide project includes every member but not guests without a role", async () => {
        mockRequireProjectAccess.mockResolvedValue(makeAccess({ project: { visibility: "WORKSPACE" } }));
        people([
            { id: "mem", workspaceRole: "MEMBER" },
            { id: "guest", workspaceRole: "GUEST" },
            { id: "guest2", workspaceRole: "GUEST", projectRole: "VIEWER" },
            { id: "me", workspaceRole: "MEMBER", projectRole: "VIEWER", name: "Me Myself" },
        ]);

        await renderPage();

        expect(rowOf("User mem")).toHaveTextContent("Everyone in the workspace");
        expect(rowOf("User mem")).toHaveTextContent("Editor");
        expect(rowOf("User guest2")).toHaveTextContent("Viewer");
        expect(list().queryByText("User guest")).not.toBeInTheDocument();
    });

    it("shows initials, the email fallback and photos", async () => {
        people([
            { id: "a", workspaceRole: "OWNER", name: "Ada Lovelace" },
            { id: "b", workspaceRole: "ADMIN", name: null },
            { id: "c", workspaceRole: "ADMIN", name: "Cy", image: "https://cdn.x/c.png" },
        ]);

        await renderPage();

        expect(within(rowOf("Ada Lovelace")).getByText("AL")).toBeInTheDocument();
        expect(list().getAllByText("b@x.com")).toHaveLength(2);
        expect(within(rowOf("Cy")).getByTestId("avatar-image")).toHaveAttribute("data-src", "https://cdn.x/c.png");
    });
});

describe("ProjectMembersPage – managing people", () => {
    it.each([
        ["OWNER", null, true],
        ["ADMIN", null, true],
        ["MEMBER", "ADMIN", true],
        ["MEMBER", "EDITOR", false],
        ["MEMBER", "VIEWER", false],
    ])("workspace %s with project role %s: add form shown %s", async (workspaceRole, projectRole, shown) => {
        mockRequireProjectAccess.mockResolvedValue(makeAccess({ workspaceRole, projectRole }));
        await renderPage();
        expect(!!screen.queryByTestId("invite-form")).toBe(shown);
    });

    it("lets project admins change roles and remove people who were added", async () => {
        mockRequireProjectAccess.mockResolvedValue(makeAccess({ projectRole: "ADMIN" }));
        people([
            { id: "me", workspaceRole: "MEMBER", projectRole: "ADMIN", name: "Me Myself" },
            { id: "t", workspaceRole: "MEMBER", projectRole: "VIEWER", name: "Tom" },
            { id: "boss", workspaceRole: "ADMIN" },
        ]);

        await renderPage();

        expect(screen.getByTestId("role-select-pm-t")).toHaveAttribute("data-role", "VIEWER");
        const remove = screen.getByTestId("action:Remove from project");
        expect(remove).toHaveAttribute("data-bound", JSON.stringify(["acme", "p1", "pm-t"]));
        expect(mockRemove.bind).toHaveBeenCalledWith(null, "acme", "p1", "pm-t");
        // Workspace admins are admins through the workspace: nothing to change here.
        expect(within(rowOf("User boss")).queryByTestId(/^role-select/)).not.toBeInTheDocument();
        expect(within(rowOf("User boss")).queryByTestId(/^actions:/)).not.toBeInTheDocument();
        // Project admins can't edit themselves.
        expect(screen.queryByTestId("role-select-pm-me")).not.toBeInTheDocument();
        expect(rowOf("Me Myself")).toHaveTextContent("(you)");
    });

    it("says what removing does: losing access, or just the role on a shared project", async () => {
        mockRequireProjectAccess.mockResolvedValue(makeAccess({ workspaceRole: "OWNER", projectRole: null, project: { visibility: "WORKSPACE" } }));
        people([
            { id: "me", workspaceRole: "OWNER", name: "Me Myself" },
            { id: "m", workspaceRole: "MEMBER", projectRole: "VIEWER", name: "Mia" },
            { id: "g", workspaceRole: "GUEST", projectRole: "EDITOR", name: "Gus" },
        ]);

        await renderPage();

        expect(within(screen.getByTestId("actions:Actions for Mia")).getByTestId("action:Remove from project")).toHaveAttribute(
            "data-description",
            "Their project role is removed. As a workspace member they can still open and edit it.",
        );
        expect(within(screen.getByTestId("actions:Actions for Gus")).getByTestId("action:Remove from project")).toHaveAttribute(
            "data-description",
            "They'll no longer be able to open this project.",
        );
    });

    it("shows only role pills to people who can't manage", async () => {
        people([
            { id: "me", workspaceRole: "MEMBER", projectRole: "VIEWER", name: "Me Myself" },
            { id: "t", workspaceRole: "MEMBER", projectRole: "EDITOR", name: "Tom" },
        ]);

        await renderPage();

        expect(screen.queryByTestId(/^role-select/)).not.toBeInTheDocument();
        expect(screen.queryByTestId(/^actions:/)).not.toBeInTheDocument();
        expect(rowOf("Tom")).toHaveTextContent("Editor");
    });

    it("explains project roles, marking the viewer's own", async () => {
        await renderPage();
        const guide = within(screen.getByRole("complementary", { name: "Project roles" }));
        expect(guide.getByText("Viewer").closest("li")).toHaveTextContent("Your role");
        expect(guide.getByText("Workspace owners and admins are always admins of every project.")).toBeInTheDocument();
    });
});
