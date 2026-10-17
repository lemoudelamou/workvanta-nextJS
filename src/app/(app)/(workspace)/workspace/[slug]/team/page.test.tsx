/**
 * @jest-environment jsdom
 */
import { render, screen, within } from "@testing-library/react";

import TeamPage from "./page";
import { requireMembership } from "@/lib/auth/team";
import { prisma } from "@/lib/db/prisma";
import { personColor } from "@/lib/ui/person-color";
import { buttonStyles } from "@/app/style/button-style";
import { removeTeamAction } from "@/app/(app)/(workspace)/workspace/[slug]/team/team-actions";

// ---------- module mocks ----------
jest.mock("lucide-react", () => ({
    ShieldCheck: () => null,
    Trash2: () => null,
    UserPlus: () => null,
    UsersRound: () => null,
    Crown: () => null,
    Mail: () => null,
}));
jest.mock("next/navigation", () => ({
    notFound: jest.fn(() => {
        throw new Error("NEXT_NOT_FOUND");
    }),
}));
jest.mock(
    "@/app/(app)/(workspace)/workspace/[slug]/team/componenets/MemberActions",
    () => ({
        TransferOwnershipButton: ({ memberId }: any) => (
            <div data-testid={`transfer-${memberId}`} />
        ),
        RevokeInvitationButton: ({ invitationId }: any) => (
            <div data-testid={`revoke-${invitationId}`} />
        ),
    }),
);

jest.mock("@/lib/auth/team", () => ({ requireMembership: jest.fn() }));
jest.mock("@/lib/db/prisma", () => ({
    prisma: {
        workspaceMember: { findMany: jest.fn() },
        invitation: { findMany: jest.fn() },
    },
}));

// Replace the action with a jest.fn that has a spy-able bind()
jest.mock(
    "@/app/(app)/(workspace)/workspace/[slug]/team/team-actions",
    () => {
        const action: any = jest.fn();
        action.bind = jest.fn(() => jest.fn());
        return { removeTeamAction: action };
    },
);
jest.mock(
    "@/app/(app)/(workspace)/workspace/[slug]/team/componenets/WorkspaceRole",
    () => ({
        WorkspaceMemberRoleSelect: ({ slug, memberId, currentRole }: any) => (
            <div
                data-testid={`role-select-${memberId}`}
                data-slug={slug}
                data-role={currentRole}
            />
        ),
    }),
);
jest.mock(
    "@/app/(app)/(workspace)/workspace/[slug]/team/componenets/InviteTeamForm",
    () => ({
        InviteTeamForm: ({ slug, canInviteAdmin }: any) => (
            <div
                data-testid="invite-form"
                data-slug={slug}
                data-can-invite-admin={String(canInviteAdmin)}
            />
        ),
    }),
);

jest.mock("@/app/style/button-style", () => ({ buttonStyles: jest.fn(() => "btn") }));
jest.mock("@/app/style/Kpi", () => ({
    Kpi: ({ label, value, helper }: any) => (
        <div data-testid={`kpi-${label}`}>
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
jest.mock("@/components/ui/RoleBadge", () => ({
    RoleBadge: ({ role }: any) => <span data-testid="role-badge">{role}</span>,
}));

// ---------- typed handles ----------
const mockRequireMembership = requireMembership as jest.Mock;
const mockButtonStyles = buttonStyles as unknown as jest.Mock;
const mockRemove = removeTeamAction as unknown as { bind: jest.Mock };
const db = prisma as unknown as {
    workspaceMember: { findMany: jest.Mock };
    invitation: { findMany: jest.Mock };
};

// ---------- helpers ----------
const JOINED = new Date("2026-03-15T12:00:00Z");
const workspace = { id: "w1", name: "Acme Inc", slug: "acme" };

function makeMembership(overrides: Record<string, unknown> = {}) {
    return { id: "m-me", userId: "me", role: "MEMBER", workspace, ...overrides };
}

function makeMember(
    id: string,
    role: string,
    userOverrides: Record<string, unknown> = {},
) {
    return {
        id: `m-${id}`,
        userId: `u-${id}`,
        role,
        createdAt: JOINED,
        user: {
            id: `u-${id}`,
            name: `User ${id}`,
            email: `${id}@x.com`,
            image: null,
            ...userOverrides,
        },
    };
}

async function renderPage() {
    const ui = await TeamPage({ params: Promise.resolve({ slug: "acme" }) });
    return render(ui);
}

beforeEach(() => {
    mockRequireMembership.mockResolvedValue(makeMembership());
    db.workspaceMember.findMany.mockResolvedValue([]);
    db.invitation.findMany.mockResolvedValue([]);
});

afterEach(() => {
    jest.clearAllMocks();
});

// ---------- tests ----------
describe("TeamPage – access", () => {
    it("requires membership for the slug", async () => {
        await renderPage();

        expect(mockRequireMembership).toHaveBeenCalledWith("acme");
    });

    it("propagates errors from requireMembership without querying members", async () => {
        const error = new Error("NEXT_REDIRECT:/signin");
        mockRequireMembership.mockRejectedValue(error);

        await expect(renderPage()).rejects.toBe(error);
        expect(db.workspaceMember.findMany).not.toHaveBeenCalled();
    });

    it("queries members of the workspace ordered by join date", async () => {
        await renderPage();

        expect(db.workspaceMember.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { workspaceId: "w1" },
                orderBy: { createdAt: "asc" },
            }),
        );
    });
});

describe("TeamPage – header and summary", () => {
    it("renders the breadcrumb and header", async () => {
        await renderPage();

        expect(screen.getByTestId("breadcrumb")).toHaveTextContent(
            "Acme Inc|/workspace/acme > Team|",
        );
        expect(screen.getByTestId("eyebrow")).toHaveTextContent("Acme Inc");
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Team");
    });

    it("counts members and owners/admins", async () => {
        db.workspaceMember.findMany.mockResolvedValue([
            makeMember("o", "OWNER"),
            makeMember("a", "ADMIN"),
            makeMember("m", "MEMBER"),
            makeMember("g", "GUEST"),
            makeMember("m2", "MEMBER"),
        ]);

        await renderPage();

        expect(screen.getByTestId("kpi-Members-value")).toHaveTextContent("5");
        expect(screen.getByTestId("kpi-Owners and admins-value")).toHaveTextContent("2");
    });

    it.each([
        ["OWNER", "Owner", "Full access, including ownership"],
        ["ADMIN", "Admin", "Manage people and every project"],
        ["MEMBER", "Member", "Create projects and edit shared ones"],
        ["GUEST", "Guest", "Only projects they're invited to"],
    ])("shows the %s role KPI", async (role, label, helper) => {
        mockRequireMembership.mockResolvedValue(makeMembership({ role }));

        await renderPage();

        expect(screen.getByTestId("kpi-Your role-value")).toHaveTextContent(label);
        expect(screen.getByTestId("kpi-Your role-helper")).toHaveTextContent(helper);
    });
});

describe("TeamPage – invite section", () => {
    it("lets owners invite admins", async () => {
        mockRequireMembership.mockResolvedValue(makeMembership({ role: "OWNER" }));

        await renderPage();

        expect(screen.getByText("Invite a member")).toBeInTheDocument();
        expect(screen.getByText(/invitation to join Acme Inc/)).toBeInTheDocument();
        const form = screen.getByTestId("invite-form");
        expect(form).toHaveAttribute("data-slug", "acme");
        expect(form).toHaveAttribute("data-can-invite-admin", "true");
    });

    it("lets admins invite, but not invite other admins", async () => {
        mockRequireMembership.mockResolvedValue(makeMembership({ role: "ADMIN" }));

        await renderPage();

        expect(screen.getByTestId("invite-form")).toHaveAttribute(
            "data-can-invite-admin",
            "false",
        );
    });

    it.each(["MEMBER", "GUEST"])("hides the invite section for a %s", async (role) => {
        mockRequireMembership.mockResolvedValue(makeMembership({ role }));

        await renderPage();

        expect(screen.queryByText("Invite a member")).not.toBeInTheDocument();
        expect(screen.queryByTestId("invite-form")).not.toBeInTheDocument();
    });
});

describe("TeamPage – member list", () => {
    it("sorts by role rank, keeps join order within a role, and puts unknown roles last", async () => {
        db.workspaceMember.findMany.mockResolvedValue([
            makeMember("guest", "GUEST"),
            makeMember("intern", "INTERN"),
            makeMember("member1", "MEMBER"),
            makeMember("owner", "OWNER"),
            makeMember("member2", "MEMBER"),
            makeMember("admin", "ADMIN"),
        ]);

        await renderPage();

        const roles = screen.getAllByTestId("role-badge").map((el) => el.textContent);
        expect(roles).toEqual(["OWNER", "ADMIN", "MEMBER", "MEMBER", "GUEST", "INTERN"]);

        const items = screen.getAllByRole("listitem");
        expect(items[2]).toHaveTextContent("User member1");
        expect(items[3]).toHaveTextContent("User member2");
    });

    it("shows name, email and the joined date", async () => {
        db.workspaceMember.findMany.mockResolvedValue([makeMember("ada", "MEMBER")]);

        const { container } = await renderPage();

        expect(screen.getByText("User ada")).toBeInTheDocument();
        expect(screen.getByText("ada@x.com")).toBeInTheDocument();

        const time = container.querySelector("time");
        expect(time).toHaveAttribute("datetime", "2026-03-15T12:00:00.000Z");
        expect(time).toHaveTextContent("Joined Mar 2026");
    });

    it("falls back to the email when the member has no name", async () => {
        db.workspaceMember.findMany.mockResolvedValue([
            makeMember("bob", "MEMBER", { name: null }),
        ]);

        await renderPage();

        expect(screen.getAllByText("bob@x.com")).toHaveLength(2); // display name + email line
    });

    it("renders initials from a two-word name in the person's own color", async () => {
        db.workspaceMember.findMany.mockResolvedValue([
            makeMember("ada", "MEMBER", { name: "Ada Lovelace" }),
        ]);

        await renderPage();

        expect(screen.getByText("AL")).toBeInTheDocument();
        // Each person keeps their own avatar color, keyed by email.
        expect(screen.getByText("AL")).toHaveClass(...personColor("ada@x.com").split(" "));
    });

    it("renders two letters for a single-word name", async () => {
        db.workspaceMember.findMany.mockResolvedValue([
            makeMember("grace", "MEMBER", { name: "Grace" }),
        ]);

        await renderPage();

        expect(screen.getByText("GR")).toBeInTheDocument();
    });

    it("uses email initials when the name is blank", async () => {
        db.workspaceMember.findMany.mockResolvedValue([
            makeMember("bob", "MEMBER", { name: "   " }),
        ]);

        await renderPage();

        expect(screen.getByText("BO")).toBeInTheDocument();
    });

    it("renders the avatar image instead of initials when there is one", async () => {
        db.workspaceMember.findMany.mockResolvedValue([
            makeMember("ada", "MEMBER", {
                name: "Ada Lovelace",
                image: "https://cdn.x/ada.png",
            }),
        ]);

        const { container } = await renderPage();

        expect(container.querySelector("img")).toHaveAttribute("src", "https://cdn.x/ada.png");
        expect(screen.queryByText("AL")).not.toBeInTheDocument();
    });
});

describe("TeamPage – member management permissions", () => {
    // [viewer role, target role, can change role, can remove]
    it.each([
        ["OWNER", "ADMIN", true, true],
        ["OWNER", "MEMBER", true, true],
        ["OWNER", "GUEST", true, true],
        ["OWNER", "OWNER", false, false],
        ["ADMIN", "ADMIN", false, false],
        ["ADMIN", "MEMBER", false, true],
        // Admins can remove guests too (matches what the server allows).
        ["ADMIN", "GUEST", false, true],
        ["ADMIN", "OWNER", false, false],
        ["MEMBER", "MEMBER", false, false],
        ["GUEST", "MEMBER", false, false],
    ])(
        "viewer %s managing a %s: change role = %s, remove = %s",
        async (viewerRole, targetRole, canChange, canRemove) => {
            mockRequireMembership.mockResolvedValue(makeMembership({ role: viewerRole }));
            db.workspaceMember.findMany.mockResolvedValue([makeMember("x", targetRole)]);

            await renderPage();

            const select = screen.queryByTestId("role-select-m-x");
            const remove = screen.queryByRole("button", { name: "Remove User x" });

            if (canChange) {
                expect(select).toHaveAttribute("data-role", targetRole);
                expect(select).toHaveAttribute("data-slug", "acme");
                expect(screen.queryByTestId("role-badge")).not.toBeInTheDocument();
            } else {
                expect(select).not.toBeInTheDocument();
                expect(screen.getByTestId("role-badge")).toHaveTextContent(targetRole);
            }

            if (canRemove) {
                expect(remove).toHaveAttribute("type", "submit");
                expect(mockButtonStyles).toHaveBeenCalledWith({ variant: "danger", size: "sm" });
            } else {
                expect(remove).not.toBeInTheDocument();
            }
        },
    );

    it("marks the current user and blocks self-management", async () => {
        mockRequireMembership.mockResolvedValue(
            makeMembership({ userId: "u-me", role: "OWNER" }),
        );
        db.workspaceMember.findMany.mockResolvedValue([
            makeMember("me", "OWNER"),
            makeMember("ada", "MEMBER"),
        ]);

        await renderPage();

        const [me, ada] = screen.getAllByRole("listitem");

        expect(within(me).getByText("You")).toBeInTheDocument();
        expect(within(me).getByTestId("role-badge")).toHaveTextContent("OWNER");
        expect(within(me).queryByRole("button")).not.toBeInTheDocument();
        expect(within(me).queryByTestId("role-select-m-me")).not.toBeInTheDocument();

        expect(within(ada).queryByText("You")).not.toBeInTheDocument();
        expect(within(ada).getByTestId("role-select-m-ada")).toBeInTheDocument();
        expect(within(ada).getByRole("button", { name: "Remove User ada" })).toBeInTheDocument();
    });

    it("blocks an admin from managing their own row", async () => {
        mockRequireMembership.mockResolvedValue(
            makeMembership({ userId: "u-me", role: "ADMIN" }),
        );
        db.workspaceMember.findMany.mockResolvedValue([makeMember("me", "ADMIN")]);

        await renderPage();

        expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
    });

    it("binds the remove action to the slug and member id only for removable rows", async () => {
        mockRequireMembership.mockResolvedValue(makeMembership({ role: "OWNER" }));
        db.workspaceMember.findMany.mockResolvedValue([
            makeMember("owner2", "OWNER"),
            makeMember("ada", "ADMIN"),
            makeMember("bob", "GUEST"),
        ]);

        await renderPage();

        expect(mockRemove.bind).toHaveBeenCalledTimes(2);
        expect(mockRemove.bind).toHaveBeenCalledWith(null, "acme", "m-ada");
        expect(mockRemove.bind).toHaveBeenCalledWith(null, "acme", "m-bob");
    });

    it("uses the display name in the remove button label", async () => {
        mockRequireMembership.mockResolvedValue(makeMembership({ role: "OWNER" }));
        db.workspaceMember.findMany.mockResolvedValue([
            makeMember("bob", "MEMBER", { name: null }),
        ]);

        await renderPage();

        expect(
            screen.getByRole("button", { name: "Remove bob@x.com" }),
        ).toBeInTheDocument();
    });
});

describe("TeamPage – ownership and invitations", () => {
    it("offers ownership transfer to admins and members, only for the owner", async () => {
        mockRequireMembership.mockResolvedValue(makeMembership({ role: "OWNER" }));
        db.workspaceMember.findMany.mockResolvedValue([
            makeMember("me", "OWNER"),
            makeMember("a", "ADMIN"),
            makeMember("b", "MEMBER"),
            makeMember("c", "GUEST"),
        ]);

        await renderPage();

        expect(screen.queryByTestId("transfer-m-me")).not.toBeInTheDocument();
        expect(screen.getByTestId("transfer-m-a")).toBeInTheDocument();
        expect(screen.getByTestId("transfer-m-b")).toBeInTheDocument();
        expect(screen.queryByTestId("transfer-m-c")).not.toBeInTheDocument();
    });

    it("hides ownership transfer from admins", async () => {
        mockRequireMembership.mockResolvedValue(makeMembership({ role: "ADMIN" }));
        db.workspaceMember.findMany.mockResolvedValue([makeMember("b", "MEMBER")]);

        await renderPage();

        expect(screen.queryByTestId("transfer-m-b")).not.toBeInTheDocument();
    });

    it("lists pending invitations for managers", async () => {
        mockRequireMembership.mockResolvedValue(makeMembership({ role: "ADMIN" }));
        db.invitation.findMany.mockResolvedValue([
            {
                id: "i1",
                email: "new@x.com",
                role: "MEMBER",
                projectRole: null,
                expiresAt: new Date("2026-04-01T00:00:00Z"),
                project: null,
            },
            {
                id: "i2",
                email: "boss@x.com",
                role: "ADMIN",
                projectRole: null,
                expiresAt: new Date("2026-04-01T00:00:00Z"),
                project: null,
            },
        ]);

        await renderPage();

        expect(screen.getByText("Pending invitations")).toBeInTheDocument();
        expect(screen.getByText("new@x.com")).toBeInTheDocument();
        expect(screen.getByTestId("revoke-i1")).toBeInTheDocument();
        // Admins can't cancel admin invitations sent by the owner.
        expect(screen.queryByTestId("revoke-i2")).not.toBeInTheDocument();
    });

    it("does not load invitations for members", async () => {
        await renderPage();

        expect(db.invitation.findMany).not.toHaveBeenCalled();
        expect(screen.queryByText("Pending invitations")).not.toBeInTheDocument();
    });
});
