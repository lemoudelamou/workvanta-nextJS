/**
 * @jest-environment jsdom
 */
import { render, screen, within } from "@testing-library/react";

import WorkspaceIndexPage from "./page";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

// ---------- module mocks ----------
jest.mock("next/navigation", () => ({
    redirect: jest.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT:${url}`);
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
jest.mock("lucide-react", () => ({
    Building2: () => null,
    FolderKanban: () => null,
    Plus: () => null,
    UsersRound: () => null,
}));

jest.mock("@/generated/prisma/enums", () => ({
    WorkspaceRole: { OWNER: "OWNER", ADMIN: "ADMIN", MEMBER: "MEMBER", GUEST: "GUEST" },
}));
jest.mock("@/lib/auth/session", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/db/prisma", () => ({
    prisma: { workspaceMember: { findMany: jest.fn() } },
}));

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
    PageHeader: ({ eyebrow, title, description, actions }: any) => (
        <header>
            <span data-testid="eyebrow">{eyebrow}</span>
            <h1>{title}</h1>
            <p data-testid="description">{description}</p>
            {actions}
        </header>
    ),
}));
jest.mock("@/components/ui/Card", () => ({
    Card: ({ children }: any) => <div data-testid="card">{children}</div>,
}));
jest.mock("@/components/ui/EmptyState", () => ({
    EmptyState: ({ title, description, action }: any) => (
        <div data-testid="empty-state">
            <h3>{title}</h3>
            <p>{description}</p>
            {action}
        </div>
    ),
}));

// Assumption: the real WorkspaceSection renders `empty` only when there are no items.
jest.mock("./components/WorkspaceSection", () => ({
    WorkspaceSection: ({ id, title, description, items, className, trailing, empty }: any) => (
        <section
            data-testid={`section-${id}`}
            data-count={items.length}
            data-ids={items.map((i: any) => i.workspace.id).join(",")}
            data-class={className}
        >
            <h2>{title}</h2>
            <p>{description}</p>
            {trailing}
            {items.length === 0 && empty}
        </section>
    ),
}));
jest.mock("./components/NewWorspaceTile", () => ({
    NewWorkspaceTile: () => <div data-testid="new-tile" />,
}));

// ---------- typed handles ----------
const mockRedirect = redirect as unknown as jest.Mock;
const mockGetSession = getSession as jest.Mock;
const db = prisma as unknown as { workspaceMember: { findMany: jest.Mock } };

// ---------- helpers ----------
function makeMembership(id: string, role: string, projects = 0, members = 1) {
    return {
        role,
        workspace: {
            id,
            slug: `slug-${id}`,
            name: `Workspace ${id}`,
            description: null,
            updatedAt: new Date("2026-10-01T12:00:00Z"),
            _count: { members, projects },
        },
    };
}

async function renderPage() {
    const ui = await WorkspaceIndexPage();
    return render(ui);
}

beforeEach(() => {
    mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    db.workspaceMember.findMany.mockResolvedValue([]);
});

afterEach(() => {
    jest.clearAllMocks(); // keeps the throwing redirect implementation
});

// ---------- tests ----------
describe("WorkspaceIndexPage – guards and query", () => {
    it("redirects to /signin without querying when there is no session user", async () => {
        mockGetSession.mockResolvedValue(null);

        await expect(renderPage()).rejects.toThrow("NEXT_REDIRECT:/signin");
        expect(mockRedirect).toHaveBeenCalledWith("/signin");
        expect(db.workspaceMember.findMany).not.toHaveBeenCalled();
    });

    it("loads the current user's memberships, most recently updated workspace first", async () => {
        await renderPage();

        expect(db.workspaceMember.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { userId: "u1" },
                orderBy: { workspace: { updatedAt: "desc" } },
            }),
        );
    });
});

describe("WorkspaceIndexPage – header", () => {
    it("renders the heading, eyebrow and description", async () => {
        await renderPage();

        expect(screen.getByRole("heading", { level: 1, name: "Your workspaces" })).toBeInTheDocument();
        expect(screen.getByTestId("eyebrow")).toHaveTextContent("Workspaces");
        expect(screen.getByTestId("description")).toHaveTextContent(
            "Open a workspace to see its projects and people",
        );
    });

    it("links the header action to /workspace/new", async () => {
        db.workspaceMember.findMany.mockResolvedValue([makeMembership("a", "OWNER")]);

        await renderPage();

        const links = screen.getAllByRole("link", { name: "Create workspace" });
        expect(links).toHaveLength(1);
        expect(links[0]).toHaveAttribute("href", "/workspace/new");
    });
});

describe("WorkspaceIndexPage – no memberships", () => {
    it("shows the first-workspace empty state instead of KPIs and sections", async () => {
        await renderPage();

        const empty = screen.getByTestId("empty-state");
        expect(empty).toHaveTextContent("Create your first workspace");
        expect(empty).toHaveTextContent("A workspace is a shared home for your team.");

        expect(screen.queryByLabelText("Summary")).not.toBeInTheDocument();
        expect(screen.queryByTestId("section-my-workspaces")).not.toBeInTheDocument();
        expect(screen.queryByTestId("section-shared-workspaces")).not.toBeInTheDocument();
    });

    it("offers a create link in both the header and the empty state", async () => {
        await renderPage();

        const links = screen.getAllByRole("link", { name: "Create workspace" });
        expect(links).toHaveLength(2);
        links.forEach((link) => expect(link).toHaveAttribute("href", "/workspace/new"));
        expect(within(screen.getByTestId("empty-state")).getByRole("link")).toHaveAttribute(
            "href",
            "/workspace/new",
        );
    });
});

describe("WorkspaceIndexPage – KPIs", () => {
    it("counts owned and shared workspaces and sums projects across all of them", async () => {
        db.workspaceMember.findMany.mockResolvedValue([
            makeMembership("a", "OWNER", 3),
            makeMembership("b", "ADMIN", 2),
            makeMembership("c", "MEMBER", 0),
            makeMembership("d", "GUEST", 5),
            makeMembership("e", "OWNER", 1),
        ]);

        await renderPage();

        expect(screen.getByTestId("kpi-Owned by you-value")).toHaveTextContent("2");
        expect(screen.getByTestId("kpi-Shared with you-value")).toHaveTextContent("3");
        expect(screen.getByTestId("kpi-Projects-value")).toHaveTextContent("11");
    });

    it("shows zero projects when workspaces have none", async () => {
        db.workspaceMember.findMany.mockResolvedValue([makeMembership("a", "OWNER", 0)]);

        await renderPage();

        expect(screen.getByTestId("kpi-Projects-value")).toHaveTextContent("0");
    });
});

describe("WorkspaceIndexPage – sections", () => {
    it("splits memberships into owned and shared, preserving query order", async () => {
        db.workspaceMember.findMany.mockResolvedValue([
            makeMembership("a", "ADMIN"),
            makeMembership("b", "OWNER"),
            makeMembership("c", "GUEST"),
            makeMembership("d", "OWNER"),
            makeMembership("e", "MEMBER"),
        ]);

        await renderPage();

        const owned = screen.getByTestId("section-my-workspaces");
        expect(owned).toHaveAttribute("data-count", "2");
        expect(owned).toHaveAttribute("data-ids", "b,d");
        expect(owned).toHaveAttribute("data-class", "mt-12");

        const shared = screen.getByTestId("section-shared-workspaces");
        expect(shared).toHaveAttribute("data-count", "3");
        expect(shared).toHaveAttribute("data-ids", "a,c,e");
        expect(shared).toHaveAttribute("data-class", "mt-12");
    });

    it("renders titles and descriptions for both sections", async () => {
        db.workspaceMember.findMany.mockResolvedValue([makeMembership("a", "OWNER")]);

        await renderPage();

        const owned = screen.getByTestId("section-my-workspaces");
        expect(within(owned).getByRole("heading", { name: "Owned by you" })).toBeInTheDocument();
        expect(owned).toHaveTextContent("Workspaces you created and manage.");

        const shared = screen.getByTestId("section-shared-workspaces");
        expect(within(shared).getByRole("heading", { name: "Shared with you" })).toBeInTheDocument();
        expect(shared).toHaveTextContent("Workspaces where you're a collaborator.");
    });

    it("adds the new-workspace tile to the owned section only", async () => {
        db.workspaceMember.findMany.mockResolvedValue([
            makeMembership("a", "OWNER"),
            makeMembership("b", "MEMBER"),
        ]);

        await renderPage();

        expect(
            within(screen.getByTestId("section-my-workspaces")).getByTestId("new-tile"),
        ).toBeInTheDocument();
        expect(
            within(screen.getByTestId("section-shared-workspaces")).queryByTestId("new-tile"),
        ).not.toBeInTheDocument();
    });

    it("shows the owned empty state with a create link when the user only has shared workspaces", async () => {
        db.workspaceMember.findMany.mockResolvedValue([makeMembership("a", "MEMBER")]);

        await renderPage();

        const owned = screen.getByTestId("section-my-workspaces");
        expect(owned).toHaveAttribute("data-count", "0");
        expect(owned).toHaveTextContent("You don't own a workspace yet");
        expect(within(owned).getByRole("link", { name: "Create workspace" })).toHaveAttribute(
            "href",
            "/workspace/new",
        );
        expect(screen.getByTestId("section-shared-workspaces")).not.toHaveTextContent(
            "Nothing shared with you yet",
        );
    });

    it("shows the shared empty state, without an action, when the user only owns workspaces", async () => {
        db.workspaceMember.findMany.mockResolvedValue([makeMembership("a", "OWNER")]);

        await renderPage();

        const shared = screen.getByTestId("section-shared-workspaces");
        expect(shared).toHaveAttribute("data-count", "0");
        expect(shared).toHaveTextContent("Nothing shared with you yet");
        expect(within(shared).queryByRole("link")).not.toBeInTheDocument();
        expect(screen.getByTestId("section-my-workspaces")).not.toHaveTextContent(
            "You don't own a workspace yet",
        );
    });
});