/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, within } from "@testing-library/react";

import type { ShellWorkspace } from "@/lib/navigation/shell-data";
import { AppShell, resolveCurrentWorkspace, slugFromPath } from "./AppShell";

let mockPathname = "/dashboard";

jest.mock("next/navigation", () => ({
    usePathname: () => mockPathname,
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
jest.mock("@/app/(app)/notifications/NotificationBell", () => ({
    NotificationBell: ({ unreadCount }: { unreadCount: number }) => (
        <button type="button">Bell {unreadCount}</button>
    ),
}));
jest.mock("@/app/(auth)/signin/actions", () => ({ logout: jest.fn() }));

const northwind: ShellWorkspace = {
    id: "w1",
    slug: "northwind",
    name: "Northwind Studio",
    role: "OWNER",
    canCreateProjects: true,
    projects: [
        { id: "p1", name: "Brand refresh", isPrivate: false },
        { id: "p2", name: "Payroll", isPrivate: true },
    ],
};
const acme: ShellWorkspace = {
    id: "w2",
    slug: "acme",
    name: "Acme",
    role: "GUEST",
    canCreateProjects: false,
    projects: [],
};

const user = { name: "Maya Chen", email: "maya@example.com", image: null };

function renderShell(options: { pathname?: string; workspaces?: ShellWorkspace[]; last?: string | null; unread?: number } = {}) {
    mockPathname = options.pathname ?? "/dashboard";
    return render(
        <AppShell
            user={user}
            workspaces={options.workspaces ?? [acme, northwind]}
            lastWorkspaceSlug={options.last ?? null}
            unreadCount={options.unread ?? 0}
            notifications={[]}
        >
            <p>Page content</p>
        </AppShell>,
    );
}

// The sidebar renders twice (fixed on desktop, in the phone drawer); CSS
// shows one. Tests look at the desktop copy.
const sidebar = () => within(screen.getByRole("complementary", { name: "Sidebar" }));

beforeAll(() => {
    // jsdom has no <dialog> methods.
    HTMLDialogElement.prototype.showModal = jest.fn();
    HTMLDialogElement.prototype.close = jest.fn();
});

describe("slugFromPath / resolveCurrentWorkspace", () => {
    it("reads the workspace from the URL but ignores /workspace/new", () => {
        expect(slugFromPath("/workspace/northwind/project/p1")).toBe("northwind");
        expect(slugFromPath("/workspace/new")).toBeNull();
        expect(slugFromPath("/dashboard")).toBeNull();
    });

    it("prefers the URL, then the last visited workspace, then the first", () => {
        const all = [acme, northwind];
        expect(resolveCurrentWorkspace(all, "/workspace/northwind", "acme")).toBe(northwind);
        expect(resolveCurrentWorkspace(all, "/tasks", "northwind")).toBe(northwind);
        expect(resolveCurrentWorkspace(all, "/tasks", "gone")).toBe(acme);
        expect(resolveCurrentWorkspace([], "/tasks", null)).toBeNull();
    });
});

describe("AppShell sidebar", () => {
    it("renders the page inside the shell", () => {
        renderShell();
        expect(screen.getByText("Page content")).toBeInTheDocument();
    });

    it("lists the current workspace's projects and marks the open one", () => {
        renderShell({ pathname: "/workspace/northwind/project/p1/tasks/t9" });

        const projects = sidebar().getAllByRole("listitem").map((item) => item.textContent);
        expect(projects).toEqual(["Brand refresh", "Payroll"]);

        expect(sidebar().getByRole("link", { name: "Brand refresh" })).toHaveAttribute("aria-current", "page");
        expect(sidebar().getByRole("link", { name: /Payroll/ })).not.toHaveAttribute("aria-current");
        expect(sidebar().getByLabelText("Private")).toBeInTheDocument();
    });

    it("links workspace pages and only offers New project to people who can create one", () => {
        renderShell({ pathname: "/workspace/northwind/team" });

        expect(sidebar().getByRole("link", { name: "Overview" })).toHaveAttribute("href", "/workspace/northwind");
        expect(sidebar().getByRole("link", { name: "Team" })).toHaveAttribute("aria-current", "page");
        expect(sidebar().getByRole("link", { name: "New project" })).toHaveAttribute(
            "href",
            "/workspace/northwind/project/new",
        );
    });

    it("hides New project for guests and explains an empty workspace", () => {
        renderShell({ pathname: "/workspace/acme" });

        expect(sidebar().queryByRole("link", { name: "New project" })).not.toBeInTheDocument();
        expect(sidebar().getByText("No projects yet.")).toBeInTheDocument();
    });

    it("keeps showing the last visited workspace on pages outside a workspace", () => {
        renderShell({ pathname: "/tasks", last: "northwind" });

        expect(sidebar().getByRole("button", { name: /Workspace: Northwind Studio/ })).toBeInTheDocument();
        expect(sidebar().getByRole("link", { name: "My tasks" })).toHaveAttribute("aria-current", "page");
    });

    it("shows the unread count on Inbox", () => {
        renderShell({ unread: 3 });

        const inbox = sidebar().getByRole("link", { name: /Inbox/ });
        expect(inbox).toHaveAttribute("href", "/notifications");
        expect(inbox).toHaveTextContent("3 unread");
    });

    it("switches workspaces from the menu", () => {
        renderShell({ pathname: "/workspace/northwind" });

        fireEvent.click(sidebar().getByRole("button", { name: /Switch workspace/ }));
        const menu = sidebar().getByRole("menu", { name: "Workspaces" });

        expect(within(menu).getByRole("menuitem", { name: /Acme/ })).toHaveAttribute("href", "/workspace/acme");
        expect(within(menu).getByRole("menuitem", { name: /Northwind Studio/ })).toContainElement(
            within(menu).getByLabelText("Current"),
        );
        expect(within(menu).getByRole("menuitem", { name: "Create workspace" })).toHaveAttribute(
            "href",
            "/workspace/new",
        );
    });

    it("offers settings and sign out in the account menu", () => {
        renderShell();

        fireEvent.click(sidebar().getByRole("button", { name: "Account: Maya Chen" }));
        const menu = sidebar().getByRole("menu", { name: "Account" });

        expect(within(menu).getByRole("menuitem", { name: "Settings" })).toHaveAttribute("href", "/settings");
        expect(within(menu).getByRole("menuitem", { name: "Sign out" })).toBeInTheDocument();
    });

    it("points people with no workspace to create one", () => {
        renderShell({ workspaces: [] });

        expect(sidebar().getByRole("link", { name: "Create workspace" })).toHaveAttribute("href", "/workspace/new");
        expect(sidebar().queryByText("Projects")).not.toBeInTheDocument();
    });

    it("opens the phone drawer from the top bar", () => {
        renderShell();

        fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
        expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
    });
});
