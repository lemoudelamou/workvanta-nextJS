/**
 * @jest-environment jsdom
 */
import { render, screen, within } from "@testing-library/react";

import TeamPage from "./page";
import { requireMembership } from "@/lib/auth/team";
import { prisma } from "@/lib/db/prisma";
import {
    removeTeamAction,
    revokeInvitationAction,
    transferOwnershipAction,
} from "@/app/(app)/(workspace)/workspace/[slug]/team/team-actions";

// ---------- module mocks ----------
jest.mock("next/navigation", () => ({
    notFound: jest.fn(() => {
        throw new Error("NEXT_NOT_FOUND");
    }),
}));
jest.mock("next/image", () => ({
    __esModule: true,
    default: (props: any) => <span data-testid="avatar-image" data-src={props.src} />,
}));
jest.mock("@/lib/auth/team", () => ({ requireMembership: jest.fn() }));
jest.mock("@/lib/db/prisma", () => ({
    prisma: {
        workspaceMember: { findMany: jest.fn() },
        invitation: { findMany: jest.fn() },
    },
}));

// Each action is a jest.fn whose bind() records its arguments.
jest.mock("@/app/(app)/(workspace)/workspace/[slug]/team/team-actions", () => {
    const make = (name: string) => {
        const action: any = jest.fn();
        action.bind = jest.fn((_this: unknown, ...args: unknown[]) => ({ boundTo: [name, ...args] }));
        return action;
    };
    return {
        removeTeamAction: make("remove"),
        transferOwnershipAction: make("transfer"),
        revokeInvitationAction: make("revoke"),
    };
});
jest.mock("@/components/ui/RowActions", () => ({
    RowActions: ({ label, actions }: any) => (
        <div data-testid={`actions:${label}`}>
            {actions.map((a: any) => (
                <span
                    key={a.label}
                    data-testid={`action:${a.label}`}
                    data-bound={a.run ? JSON.stringify(a.run.boundTo) : ""}
                    data-copy={a.copy ?? ""}
                    data-confirm={a.confirm?.title ?? ""}
                >
                    {a.label}
                </span>
            ))}
        </div>
    ),
}));
jest.mock("@/app/(app)/(workspace)/workspace/[slug]/team/componenets/WorkspaceRole", () => ({
    WorkspaceMemberRoleSelect: ({ slug, memberId, currentRole }: any) => (
        <div data-testid={`role-select-${memberId}`} data-slug={slug} data-role={currentRole} />
    ),
}));
jest.mock("@/app/(app)/(workspace)/workspace/[slug]/team/componenets/InviteTeamForm", () => ({
    InviteTeamForm: ({ slug, canInviteAdmin }: any) => (
        <div data-testid="invite-form" data-slug={slug} data-can-invite-admin={String(canInviteAdmin)} />
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

// ---------- handles ----------
const mockRequireMembership = requireMembership as jest.Mock;
const db = prisma as unknown as {
    workspaceMember: { findMany: jest.Mock };
    invitation: { findMany: jest.Mock };
};

// ---------- helpers ----------
const JOINED = new Date("2026-03-15T12:00:00Z");
const NOW = new Date("2026-10-16T12:00:00Z");
const workspace = { id: "w1", name: "Acme Inc", slug: "acme" };

function makeMembership(overrides: Record<string, unknown> = {}) {
    return { id: "m-me", userId: "me", role: "MEMBER", workspace, ...overrides };
}

function makeMember(id: string, role: string, userOverrides: Record<string, unknown> = {}) {
    return {
        id: `m-${id}`,
        userId: `u-${id}`,
        role,
        createdAt: JOINED,
        user: { id: `u-${id}`, name: `User ${id}`, email: `${id}@x.com`, image: null, ...userOverrides },
    };
}

function me(role: string) {
    return { ...makeMember("me", role, { name: "Me Myself", email: "me@x.com" }), id: "m-me", userId: "me" };
}

async function renderPage() {
    return render(await TeamPage({ params: Promise.resolve({ slug: "acme" }) }));
}

const people = () => within(screen.getByRole("region", { name: /People/ }));
const row = (name: string) => people().getByText(name).closest("li") as HTMLElement;

beforeEach(() => {
    jest.useFakeTimers({ now: NOW, doNotFake: ["nextTick", "setImmediate", "queueMicrotask", "setTimeout", "clearTimeout"] });
    mockRequireMembership.mockResolvedValue(makeMembership());
    db.workspaceMember.findMany.mockResolvedValue([me("MEMBER")]);
    db.invitation.findMany.mockResolvedValue([]);
});

afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
});

// ---------- tests ----------
describe("TeamPage – access", () => {
    it("shows the workspace's not-found page to people outside it", async () => {
        const { ForbiddenError } = jest.requireActual("@/lib/auth/permissions");
        mockRequireMembership.mockRejectedValue(new ForbiddenError("nope"));
        await expect(renderPage()).rejects.toThrow("NEXT_NOT_FOUND");
    });
});

describe("TeamPage – header", () => {
    it("renders the breadcrumb, title and a people count", async () => {
        db.workspaceMember.findMany.mockResolvedValue([me("OWNER"), makeMember("a", "ADMIN")]);
        mockRequireMembership.mockResolvedValue(makeMembership({ role: "OWNER" }));
        db.invitation.findMany.mockResolvedValue([
            { id: "i1", email: "n@x.com", token: "t1", role: "MEMBER", projectRole: null, expiresAt: new Date("2026-10-20T12:00:00Z"), createdAt: NOW, project: null },
        ]);

        await renderPage();

        expect(screen.getByTestId("breadcrumb")).toHaveTextContent("Acme Inc|/workspace/acme > Team|");
        expect(screen.getByRole("heading", { level: 1, name: "Team" })).toBeInTheDocument();
        expect(screen.getByText("2 people in Acme Inc, 1 pending invitation")).toBeInTheDocument();
    });

    it("explains each role and marks the viewer's own, with counts", async () => {
        db.workspaceMember.findMany.mockResolvedValue([me("ADMIN"), makeMember("b", "MEMBER"), makeMember("c", "MEMBER")]);
        mockRequireMembership.mockResolvedValue(makeMembership({ role: "ADMIN" }));

        await renderPage();

        const guide = within(screen.getByRole("complementary", { name: "What each role can do" }));
        const admin = guide.getByText("Admin").closest("li")!;
        expect(admin).toHaveTextContent("Your role");
        expect(admin).toHaveTextContent("Manage people and every project");
        expect(guide.getByText("Member").closest("li")).toHaveTextContent("2");
        expect(guide.getByText("Owner").closest("li")).not.toHaveTextContent("Your role");
    });
});

describe("TeamPage – invite section", () => {
    it.each([
        ["OWNER", true, true],
        ["ADMIN", true, false],
        ["MEMBER", false, false],
        ["GUEST", false, false],
    ])("viewer %s: invite form %s, can invite admins %s", async (role, shown, admins) => {
        mockRequireMembership.mockResolvedValue(makeMembership({ role }));
        db.workspaceMember.findMany.mockResolvedValue([me(role)]);

        await renderPage();

        const form = screen.queryByTestId("invite-form");
        if (!shown) return expect(form).not.toBeInTheDocument();
        expect(form).toHaveAttribute("data-slug", "acme");
        expect(form).toHaveAttribute("data-can-invite-admin", String(admins));
    });
});

describe("TeamPage – people", () => {
    it("sorts by role rank, keeps join order within a role, and puts unknown roles last", async () => {
        db.workspaceMember.findMany.mockResolvedValue([
            makeMember("g", "GUEST"),
            makeMember("weird", "ROBOT"),
            makeMember("m1", "MEMBER"),
            makeMember("o", "OWNER"),
            makeMember("m2", "MEMBER"),
            makeMember("a", "ADMIN"),
        ]);

        await renderPage();

        const names = people()
            .getAllByRole("listitem")
            .map((li) => li.querySelector("p span")?.textContent);
        expect(names).toEqual(["User o", "User a", "User m1", "User m2", "User g", "User weird"]);
    });

    it("shows name, email, joined date, initials and search text", async () => {
        db.workspaceMember.findMany.mockResolvedValue([makeMember("a", "MEMBER", { name: "Ada Lovelace" })]);

        await renderPage();

        const ada = row("Ada Lovelace");
        expect(ada).toHaveTextContent("a@x.com");
        expect(ada).toHaveTextContent("Joined Mar 15, 2026");
        expect(within(ada).getByText("AL")).toBeInTheDocument();
        expect(ada).toHaveAttribute("data-search", "Ada Lovelace a@x.com MEMBER");
    });

    it("falls back to the email when there is no name", async () => {
        db.workspaceMember.findMany.mockResolvedValue([makeMember("b", "MEMBER", { name: null, email: "bob@x.com" })]);

        await renderPage();

        expect(within(people().getAllByRole("listitem")[0]).getAllByText("bob@x.com")).toHaveLength(2);
    });

    it("uses the photo when there is one", async () => {
        db.workspaceMember.findMany.mockResolvedValue([makeMember("a", "MEMBER", { image: "https://cdn.x/a.png" })]);

        await renderPage();

        expect(screen.getByTestId("avatar-image")).toHaveAttribute("data-src", "https://cdn.x/a.png");
    });
});

describe("TeamPage – what the viewer can do to each person", () => {
    it.each([
        ["OWNER", "ADMIN", true, true, true],
        ["OWNER", "MEMBER", true, true, true],
        ["OWNER", "GUEST", true, true, false],
        ["OWNER", "OWNER", false, false, false],
        ["ADMIN", "ADMIN", false, false, false],
        ["ADMIN", "MEMBER", false, true, false],
        ["ADMIN", "GUEST", false, true, false],
        ["ADMIN", "OWNER", false, false, false],
        ["MEMBER", "MEMBER", false, false, false],
        ["GUEST", "MEMBER", false, false, false],
    ])("viewer %s, person %s: change role %s, remove %s, make owner %s", async (viewer, target, changeRole, remove, transfer) => {
        mockRequireMembership.mockResolvedValue(makeMembership({ role: viewer }));
        db.workspaceMember.findMany.mockResolvedValue([me(viewer), makeMember("t", target)]);

        await renderPage();

        expect(!!screen.queryByTestId("role-select-m-t")).toBe(changeRole);
        expect(!!screen.queryByTestId("action:Remove from workspace")).toBe(remove);
        expect(!!screen.queryByTestId("action:Make owner")).toBe(transfer);
    });

    it("marks the current user and never lets them manage themselves", async () => {
        mockRequireMembership.mockResolvedValue(makeMembership({ role: "OWNER" }));
        db.workspaceMember.findMany.mockResolvedValue([me("OWNER")]);

        await renderPage();

        const self = row("Me Myself");
        expect(self).toHaveTextContent("(you)");
        expect(screen.queryByTestId("role-select-m-me")).not.toBeInTheDocument();
        expect(within(self).queryByTestId(/^actions:/)).not.toBeInTheDocument();
        expect(self).toHaveTextContent("Owner");
    });

    it("binds remove and make-owner to the slug and member, and asks first", async () => {
        mockRequireMembership.mockResolvedValue(makeMembership({ role: "OWNER" }));
        db.workspaceMember.findMany.mockResolvedValue([me("OWNER"), makeMember("t", "MEMBER", { name: "Tom" })]);

        await renderPage();

        const remove = screen.getByTestId("action:Remove from workspace");
        expect(remove).toHaveAttribute("data-bound", JSON.stringify(["remove", "acme", "m-t"]));
        expect(remove).toHaveAttribute("data-confirm", "Remove Tom?");
        const transfer = screen.getByTestId("action:Make owner");
        expect(transfer).toHaveAttribute("data-bound", JSON.stringify(["transfer", "acme", "m-t"]));
        expect(transfer).toHaveAttribute("data-confirm", "Make Tom the owner?");
        expect(screen.getByTestId("actions:Actions for Tom")).toBeInTheDocument();
        expect((removeTeamAction as any).bind).toHaveBeenCalledWith(null, "acme", "m-t");
        expect((transferOwnershipAction as any).bind).toHaveBeenCalledWith(null, "acme", "m-t");
    });
});

describe("TeamPage – invitations", () => {
    const invitation = (id: string, overrides: Record<string, unknown> = {}) => ({
        id,
        email: `${id}@x.com`,
        token: `tok-${id}`,
        role: "MEMBER",
        projectRole: null,
        expiresAt: new Date("2026-10-20T12:00:00Z"),
        createdAt: NOW,
        project: null,
        ...overrides,
    });

    it("doesn't load invitations for people who can't manage them", async () => {
        mockRequireMembership.mockResolvedValue(makeMembership({ role: "MEMBER" }));

        await renderPage();

        expect(db.invitation.findMany).not.toHaveBeenCalled();
        expect(screen.queryByRole("region", { name: /Invitations/ })).not.toBeInTheDocument();
    });

    it("lists open and recently expired invitations with their status", async () => {
        mockRequireMembership.mockResolvedValue(makeMembership({ role: "OWNER" }));
        db.invitation.findMany.mockResolvedValue([
            invitation("soon", { expiresAt: new Date("2026-10-17T10:00:00Z") }),
            invitation("later"),
            invitation("proj", { project: { name: "Apollo" }, projectRole: "EDITOR" }),
            invitation("old", { expiresAt: new Date("2026-10-10T12:00:00Z") }),
        ]);

        await renderPage();

        const where = db.invitation.findMany.mock.calls[0][0].where;
        expect(where).toMatchObject({ workspaceId: "w1", acceptedAt: null });
        // Expired ones from the last 30 days stay visible.
        expect(where.expiresAt.gt.toISOString()).toBe("2026-09-16T12:00:00.000Z");

        const list = within(screen.getByRole("region", { name: /Invitations/ }));
        expect(list.getByText("soon@x.com").closest("li")).toHaveTextContent("Expires tomorrow");
        expect(list.getByText("later@x.com").closest("li")).toHaveTextContent("Expires in 4 days");
        expect(list.getByText("proj@x.com").closest("li")).toHaveTextContent("Editor on Apollo");
        expect(list.getByText("old@x.com").closest("li")).toHaveTextContent("Expired");
    });

    it("offers a copy link for open invitations and cancel/remove bound to the invitation", async () => {
        mockRequireMembership.mockResolvedValue(makeMembership({ role: "OWNER" }));
        db.invitation.findMany.mockResolvedValue([
            invitation("open"),
            invitation("old", { expiresAt: new Date("2026-10-10T12:00:00Z") }),
        ]);

        await renderPage();

        const open = within(screen.getByTestId("actions:Actions for invitation to open@x.com"));
        expect(open.getByTestId("action:Copy invite link")).toHaveAttribute("data-copy", "/invite/tok-open");
        expect(open.getByTestId("action:Cancel invitation")).toHaveAttribute(
            "data-bound",
            JSON.stringify(["revoke", "acme", "open"]),
        );

        const old = within(screen.getByTestId("actions:Actions for invitation to old@x.com"));
        expect(old.queryByTestId("action:Copy invite link")).not.toBeInTheDocument();
        expect(old.getByTestId("action:Remove invitation")).toBeInTheDocument();
        expect((revokeInvitationAction as any).bind).toHaveBeenCalledWith(null, "acme", "old");
    });

    it("lets only the owner cancel an admin invitation", async () => {
        mockRequireMembership.mockResolvedValue(makeMembership({ role: "ADMIN" }));
        db.workspaceMember.findMany.mockResolvedValue([me("ADMIN")]);
        db.invitation.findMany.mockResolvedValue([invitation("adm", { role: "ADMIN" }), invitation("mem")]);

        await renderPage();

        expect(
            within(screen.getByTestId("actions:Actions for invitation to adm@x.com")).queryByTestId("action:Cancel invitation"),
        ).not.toBeInTheDocument();
        expect(
            within(screen.getByTestId("actions:Actions for invitation to mem@x.com")).getByTestId("action:Cancel invitation"),
        ).toBeInTheDocument();
    });
});
