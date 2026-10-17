/**
 * @jest-environment jsdom
 */
import { render, screen, within } from "@testing-library/react";

import ProjectMembersPage from "./page";
import { notFound } from "next/navigation";
import { requireProjectAccess } from "@/lib/auth/members";
import { prisma } from "@/lib/db/prisma";
import { personColor } from "@/lib/ui/person-color";
import { buttonStyles } from "@/app/style/button-style";
import { removeProjectMemberAction } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/members/member-actions";

import { effectiveProjectRole } from "@/lib/auth/permissions";

// ---------- module mocks ----------
jest.mock("next/navigation", () => ({
    notFound: jest.fn(() => {
        throw new Error("NEXT_NOT_FOUND");
    }),
}));
jest.mock("lucide-react", () => ({
    Crown: () => null,
    Eye: () => <svg data-testid="icon-eye" />,
    Lock: () => <svg data-testid="icon-lock" />,
    Trash2: () => null,
    UserPlus: () => null,
    UsersRound: () => null,
}));

jest.mock("@/lib/auth/members", () => ({ requireProjectAccess: jest.fn() }));
jest.mock("@/lib/db/prisma", () => ({
    prisma: { projectMember: { findMany: jest.fn() } },
}));

// The bound action is replaced by a jest.fn, so we can assert on the bind() arguments
// without having to submit a real server-action form.
jest.mock(
    "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/members/member-actions",
    () => {
        const action: any = jest.fn();
        action.bind = jest.fn(() => jest.fn());
        return { removeProjectMemberAction: action };
    },
);
jest.mock(
    "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/members/invite-project-member-form",
    () => ({
        InviteProjectMemberForm: ({ slug, projectId }: any) => (
            <div data-testid="invite-form" data-slug={slug} data-project={projectId} />
        ),
    }),
);
jest.mock(
    "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/members/role-select",
    () => ({
        ProjectMemberRoleSelect: ({ slug, projectId, memberId, currentRole }: any) => (
            <div
                data-testid={`role-select-${memberId}`}
                data-slug={slug}
                data-project={projectId}
                data-role={currentRole}
            />
        ),
    }),
);

jest.mock("@/app/style/button-style", () => ({ buttonStyles: jest.fn(() => "btn") }));
jest.mock("@/app/style/Kpi", () => ({
    Kpi: ({ label, value, helper, icon }: any) => (
        <div data-testid={`kpi-${label}`}>
            {icon}
            <span data-testid={`kpi-${label}-value`}>{value}</span>
            <span data-testid={`kpi-${label}-helper`}>{helper}</span>
        </div>
    ),
}));
jest.mock("@/components/ui/PageBody", () => ({
    PageBody: ({ children }: any) => <main>{children}</main>,
}));
jest.mock("@/components/ui/PageHeader", () => ({
    PageHeader: ({ eyebrow, title, description }: any) => (
        <header>
            <span data-testid="eyebrow">{eyebrow}</span>
            <h1>{title}</h1>
            <p data-testid="description">{description}</p>
        </header>
    ),
}));
jest.mock("@/components/ui/BreadCrumb", () => ({
    Breadcrumb: ({ items }: any) => (
        <nav data-testid="breadcrumb">
            {items.map((i: any) => `${i.label}|${i.href ?? ""}`).join(" > ")}
        </nav>
    ),
}));
jest.mock("@/components/ui/EmptyState", () => ({
    EmptyState: ({ title, description }: any) => (
        <div data-testid="empty-state">
            <h3>{title}</h3>
            <p>{description}</p>
        </div>
    ),
}));
jest.mock("@/components/ui/RoleBadge", () => ({
    RoleBadge: ({ role }: any) => <span data-testid="role-badge">{role}</span>,
}));
jest.mock("@/components/ui/AccessDenied", () => ({
    AccessDeniedNotice: ({ message, workspaceSlug }: any) => (
        <div data-testid="access-denied" data-slug={workspaceSlug}>
            {message}
        </div>
    ),
}));

// ---------- typed handles ----------
const mockNotFound = notFound as unknown as jest.Mock;
const mockRequireProjectAccess = requireProjectAccess as jest.Mock;
const mockButtonStyles = buttonStyles as unknown as jest.Mock;
const mockRemove = removeProjectMemberAction as unknown as { bind: jest.Mock };
const db = prisma as unknown as { projectMember: { findMany: jest.Mock } };

// ---------- helpers ----------
const CREATED = new Date("2026-03-15T12:00:00Z");

function makeAccess(overrides: Record<string, any> = {}) {
    const access: Record<string, any> = {
        userId: "me",
        workspaceRole: "MEMBER",
        projectRole: "VIEWER",
        ...overrides,
        project: { id: "p1", name: "Apollo", visibility: "PRIVATE", ...overrides.project },
    };
    // Resolve the effective role with the real rules, like requireProjectAccess does.
    return {
        ...access,
        effectiveRole: effectiveProjectRole({
            workspaceRole: access.workspaceRole,
            projectRole: access.projectRole,
            visibility: access.project.visibility,
        }),
    };
}

function makeMember(
    id: string,
    role: string,
    userOverrides: Record<string, unknown> = {},
    overrides: Record<string, unknown> = {},
) {
    return {
        id: `m-${id}`,
        userId: `u-${id}`,
        role,
        createdAt: CREATED,
        user: {
            id: `u-${id}`,
            name: `User ${id}`,
            email: `${id}@x.com`,
            image: null,
            ...userOverrides,
        },
        ...overrides,
    };
}

async function renderPage() {
    const ui = await ProjectMembersPage({
        params: Promise.resolve({ slug: "acme", projectId: "p1" }),
    });
    return render(ui);
}

beforeEach(() => {
    mockRequireProjectAccess.mockResolvedValue(makeAccess());
    db.projectMember.findMany.mockResolvedValue([]);
});

afterEach(() => {
    jest.clearAllMocks(); // keeps implementations, clears call history
});

// ---------- tests ----------
describe("ProjectMembersPage – access handling", () => {
    it("calls notFound when the project does not exist", async () => {
        mockRequireProjectAccess.mockRejectedValue(new Error("Project not found."));

        await expect(renderPage()).rejects.toThrow("NEXT_NOT_FOUND");
        expect(mockNotFound).toHaveBeenCalled();
    });

    it("re-throws Next.js redirect errors", async () => {
        const redirectError = Object.assign(new Error("redirect"), {
            digest: "NEXT_REDIRECT;replace;/signin;307;",
        });
        mockRequireProjectAccess.mockRejectedValue(redirectError);

        await expect(renderPage()).rejects.toBe(redirectError);
        expect(mockNotFound).not.toHaveBeenCalled();
    });

    it("shows the access denied notice with the error message", async () => {
        mockRequireProjectAccess.mockRejectedValue(new Error("No access to project."));

        await renderPage();

        const notice = screen.getByTestId("access-denied");
        expect(notice).toHaveTextContent("No access to project.");
        expect(notice).toHaveAttribute("data-slug", "acme");
        expect(db.projectMember.findMany).not.toHaveBeenCalled();
    });

    it("falls back to a generic message for non-Error throws", async () => {
        mockRequireProjectAccess.mockRejectedValue("boom");

        await renderPage();

        expect(screen.getByTestId("access-denied")).toHaveTextContent(
            "Something went wrong loading this project.",
        );
    });
});

describe("ProjectMembersPage – header and summary", () => {
    it("renders the breadcrumb and header", async () => {
        await renderPage();

        expect(screen.getByTestId("breadcrumb")).toHaveTextContent(
            "Workspace|/workspace/acme > Apollo|/workspace/acme/project/p1 > Members|",
        );
        expect(screen.getByTestId("eyebrow")).toHaveTextContent("Apollo");
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Project members");
    });

    it("describes a private project and shows the private access KPI", async () => {
        await renderPage();

        expect(screen.getByTestId("description")).toHaveTextContent(
            "This project is private.",
        );
        expect(screen.getByTestId("kpi-Access-value")).toHaveTextContent("Private");
        expect(screen.getByTestId("kpi-Access-helper")).toHaveTextContent("Invited people only");
        expect(screen.getByTestId("icon-lock")).toBeInTheDocument();
    });

    it("describes a workspace-visible project and shows the workspace access KPI", async () => {
        mockRequireProjectAccess.mockResolvedValue(
            makeAccess({ project: { name: "Apollo", visibility: "WORKSPACE" } }),
        );

        await renderPage();

        expect(screen.getByTestId("description")).toHaveTextContent(
            "Workspace members can open and edit this project; guests can't.",
        );
        expect(screen.getByTestId("kpi-Access-value")).toHaveTextContent("Workspace");
        expect(screen.getByTestId("kpi-Access-helper")).toHaveTextContent(
            "Open to the whole workspace",
        );
        expect(screen.getByTestId("icon-eye")).toBeInTheDocument();
    });

    it("counts members and project admins", async () => {
        db.projectMember.findMany.mockResolvedValue([
            makeMember("a", "ADMIN"),
            makeMember("b", "ADMIN"),
            makeMember("c", "EDITOR"),
            makeMember("d", "VIEWER"),
        ]);

        await renderPage();

        expect(screen.getByTestId("kpi-Members-value")).toHaveTextContent("4");
        expect(screen.getByTestId("kpi-Project admins-value")).toHaveTextContent("2");
    });

    it("queries members for the project ordered by creation date", async () => {
        await renderPage();

        expect(db.projectMember.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { projectId: "p1" },
                orderBy: { createdAt: "asc" },
            }),
        );
    });
});

describe("ProjectMembersPage – add member section", () => {
    it.each([
        ["workspace OWNER", { workspaceRole: "OWNER", projectRole: "VIEWER" }],
        ["workspace ADMIN", { workspaceRole: "ADMIN", projectRole: "VIEWER" }],
        ["project ADMIN", { workspaceRole: "MEMBER", projectRole: "ADMIN" }],
    ])("shows the invite form for a %s", async (_label, roles) => {
        mockRequireProjectAccess.mockResolvedValue(makeAccess(roles));

        await renderPage();

        expect(screen.getByText("Add a member")).toBeInTheDocument();
        const form = screen.getByTestId("invite-form");
        expect(form).toHaveAttribute("data-slug", "acme");
        expect(form).toHaveAttribute("data-project", "p1");
    });

    it("hides the invite form for non-admins", async () => {
        await renderPage();

        expect(screen.queryByText("Add a member")).not.toBeInTheDocument();
        expect(screen.queryByTestId("invite-form")).not.toBeInTheDocument();
    });
});

describe("ProjectMembersPage – empty state", () => {
    it("tells admins to add people above", async () => {
        mockRequireProjectAccess.mockResolvedValue(makeAccess({ projectRole: "ADMIN" }));

        await renderPage();

        const empty = screen.getByTestId("empty-state");
        expect(empty).toHaveTextContent("No one has been added yet");
        expect(empty).toHaveTextContent("Add people above");
        expect(screen.queryByRole("list")).not.toBeInTheDocument();
    });

    it("tells non-admins to ask a project admin", async () => {
        await renderPage();

        expect(screen.getByTestId("empty-state")).toHaveTextContent(
            "A project admin can add people to this project.",
        );
    });
});

describe("ProjectMembersPage – member list", () => {
    it("sorts members by role rank, keeps creation order within a role, and puts unknown roles last", async () => {
        db.projectMember.findMany.mockResolvedValue([
            makeMember("viewer", "VIEWER"),
            makeMember("guest", "GUEST"),
            makeMember("editor1", "EDITOR"),
            makeMember("admin", "ADMIN"),
            makeMember("editor2", "EDITOR"),
        ]);

        await renderPage();

        const roles = screen.getAllByTestId("role-badge").map((el) => el.textContent);
        expect(roles).toEqual(["ADMIN", "EDITOR", "EDITOR", "VIEWER", "GUEST"]);

        const names = screen.getAllByRole("listitem").map((li) => li.textContent);
        expect(names[1]).toContain("User editor1");
        expect(names[2]).toContain("User editor2");
    });

    it("shows name, email and the added date", async () => {
        db.projectMember.findMany.mockResolvedValue([makeMember("ada", "EDITOR")]);

        const { container } = await renderPage();

        expect(screen.getByText("User ada")).toBeInTheDocument();
        expect(screen.getByText("ada@x.com")).toBeInTheDocument();

        const time = container.querySelector("time");
        expect(time).toHaveAttribute("datetime", "2026-03-15T12:00:00.000Z");
        expect(time).toHaveTextContent("Added Mar 2026");
    });

    it("falls back to the email when the member has no name", async () => {
        db.projectMember.findMany.mockResolvedValue([
            makeMember("bob", "EDITOR", { name: null }),
        ]);

        await renderPage();

        expect(screen.getAllByText("bob@x.com")).toHaveLength(2); // display name + email line
    });

    it("renders initials from a two-word name", async () => {
        db.projectMember.findMany.mockResolvedValue([
            makeMember("ada", "EDITOR", { name: "Ada Lovelace" }),
        ]);

        await renderPage();

        expect(screen.getByText("AL")).toBeInTheDocument();
        // Each person keeps their own avatar color, keyed by email.
        expect(screen.getByText("AL")).toHaveClass(...personColor("ada@x.com").split(" "));
    });

    it("renders two letters for a single-word name", async () => {
        db.projectMember.findMany.mockResolvedValue([
            makeMember("grace", "EDITOR", { name: "Grace" }),
        ]);

        await renderPage();

        expect(screen.getByText("GR")).toBeInTheDocument();
    });

    it("uses email initials when the name is blank", async () => {
        db.projectMember.findMany.mockResolvedValue([
            makeMember("bob", "EDITOR", { name: "   " }),
        ]);

        await renderPage();

        expect(screen.getByText("BO")).toBeInTheDocument();
    });

    it("renders the avatar image instead of initials when there is one", async () => {
        db.projectMember.findMany.mockResolvedValue([
            makeMember("ada", "EDITOR", {
                name: "Ada Lovelace",
                image: "https://cdn.x/ada.png",
            }),
        ]);

        const { container } = await renderPage();

        expect(container.querySelector("img")).toHaveAttribute("src", "https://cdn.x/ada.png");
        expect(screen.queryByText("AL")).not.toBeInTheDocument();
    });
});

describe("ProjectMembersPage – member management", () => {
    it("shows a role badge and no controls for read-only viewers", async () => {
        db.projectMember.findMany.mockResolvedValue([makeMember("ada", "EDITOR")]);

        await renderPage();

        expect(screen.getByTestId("role-badge")).toHaveTextContent("EDITOR");
        expect(screen.queryByTestId("role-select-m-ada")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
    });

    it("lets admins change roles and remove other members", async () => {
        mockRequireProjectAccess.mockResolvedValue(makeAccess({ projectRole: "ADMIN" }));
        db.projectMember.findMany.mockResolvedValue([makeMember("ada", "EDITOR")]);

        await renderPage();

        const select = screen.getByTestId("role-select-m-ada");
        expect(select).toHaveAttribute("data-slug", "acme");
        expect(select).toHaveAttribute("data-project", "p1");
        expect(select).toHaveAttribute("data-role", "EDITOR");
        expect(screen.queryByTestId("role-badge")).not.toBeInTheDocument();

        const remove = screen.getByRole("button", { name: "Remove User ada" });
        expect(remove).toHaveAttribute("type", "submit");
        expect(remove).toHaveAttribute("title", "Remove User ada");
        expect(mockButtonStyles).toHaveBeenCalledWith({ variant: "danger", size: "sm" });
    });

    it("binds the remove action to slug, project and member id", async () => {
        mockRequireProjectAccess.mockResolvedValue(makeAccess({ projectRole: "ADMIN" }));
        db.projectMember.findMany.mockResolvedValue([
            makeMember("ada", "EDITOR"),
            makeMember("bob", "VIEWER"),
        ]);

        await renderPage();

        expect(mockRemove.bind).toHaveBeenCalledWith(null, "acme", "p1", "m-ada");
        expect(mockRemove.bind).toHaveBeenCalledWith(null, "acme", "p1", "m-bob");
        expect(mockRemove.bind).toHaveBeenCalledTimes(2);
    });

    it("marks the current user with a You badge and blocks self-management", async () => {
        mockRequireProjectAccess.mockResolvedValue(
            makeAccess({ userId: "u-me", projectRole: "ADMIN" }),
        );
        db.projectMember.findMany.mockResolvedValue([
            makeMember("me", "ADMIN"),
            makeMember("ada", "EDITOR"),
        ]);

        await renderPage();

        const items = screen.getAllByRole("listitem");
        const me = items[0];
        const ada = items[1];

        expect(within(me).getByText("You")).toBeInTheDocument();
        expect(within(me).getByTestId("role-badge")).toHaveTextContent("ADMIN");
        expect(within(me).queryByRole("button")).not.toBeInTheDocument();
        expect(within(me).queryByTestId("role-select-m-me")).not.toBeInTheDocument();

        expect(within(ada).queryByText("You")).not.toBeInTheDocument();
        expect(within(ada).getByRole("button", { name: "Remove User ada" })).toBeInTheDocument();
        expect(mockRemove.bind).toHaveBeenCalledTimes(1);
    });

    it("lets workspace owners manage members even without a project role", async () => {
        mockRequireProjectAccess.mockResolvedValue(
            makeAccess({ workspaceRole: "OWNER", projectRole: null }),
        );
        db.projectMember.findMany.mockResolvedValue([makeMember("ada", "VIEWER")]);

        await renderPage();

        expect(screen.getByTestId("role-select-m-ada")).toBeInTheDocument();
    });
});