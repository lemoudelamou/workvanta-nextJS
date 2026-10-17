/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, within } from "@testing-library/react";

import type { ShellWorkspace } from "@/lib/navigation/shell-data";
import { AppShell, resolveCurrentWorkspace, slugFromPath } from "./AppShell";

let mockPathname = "/dashboard";

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
jest.mock("next/navigation", () => ({
    usePathname: () => mockPathname,
    useRouter: () => ({ push: mockPush }),
}));
const mockPush = jest.fn();

const northwind: ShellWorkspace = {
    id: "w1",
    slug: "northwind",
    name: "Northwind Studio",
    role: "OWNER",
    canCreateProjects: true,
    memberCount: 4,
    projects: [
        { id: "p1", name: "Brand refresh", isPrivate: false, openTasks: 5 },
        { id: "p2", name: "Payroll", isPrivate: true, openTasks: 0 },
    ],
};
const acme: ShellWorkspace = {
    id: "w2",
    slug: "acme",
    name: "Acme",
    role: "GUEST",
    canCreateProjects: false,
    memberCount: 2,
    projects: [],
};

const user = { name: "Maya Chen", email: "maya@example.com", image: null };

function renderShell(
    options: {
        pathname?: string;
        workspaces?: ShellWorkspace[];
        last?: string | null;
        unread?: number;
        myOpenTasks?: number;
        collapsed?: boolean;
    } = {},
) {
    mockPathname = options.pathname ?? "/dashboard";
    return render(
        <AppShell
            user={user}
            workspaces={options.workspaces ?? [acme, northwind]}
            lastWorkspaceSlug={options.last ?? null}
            unreadCount={options.unread ?? 0}
            myOpenTasks={options.myOpenTasks ?? 0}
            initiallyCollapsed={options.collapsed ?? false}
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
        // Open-task counts sit next to each project (none shown for zero).
        expect(projects).toEqual(["Brand refresh55 open tasks", "Payroll"]);

        expect(sidebar().getByRole("link", { name: /^Brand refresh/ })).toHaveAttribute("aria-current", "page");
        expect(sidebar().getByRole("link", { name: /Payroll/ })).not.toHaveAttribute("aria-current");
        expect(sidebar().getByLabelText("Private")).toBeInTheDocument();
    });

    it("links workspace pages and only offers New project to people who can create one", () => {
        renderShell({ pathname: "/workspace/northwind/team" });

        // The section is titled with the workspace's own name.
        expect(sidebar().getByRole("heading", { name: "Northwind Studio" })).toBeInTheDocument();
        expect(sidebar().getByRole("link", { name: /^All projects/ })).toHaveAttribute("href", "/workspace/northwind");
        expect(sidebar().getByRole("link", { name: /^Team & invites/ })).toHaveAttribute("aria-current", "page");
        expect(sidebar().getByRole("link", { name: /^Team & invites/ })).toHaveTextContent("4");
        // Both the "+" and the visible "New project" row lead to the form.
        for (const link of sidebar().getAllByRole("link", { name: "New project" })) {
            expect(link).toHaveAttribute("href", "/workspace/northwind/project/new");
        }
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

    it("shows unread notifications and open tasks as counts", () => {
        renderShell({ unread: 3, myOpenTasks: 7 });

        const notifications = sidebar().getByRole("link", { name: /Notifications/ });
        expect(notifications).toHaveAttribute("href", "/notifications");
        expect(notifications).toHaveTextContent("3 unread");
        expect(sidebar().getByRole("link", { name: /My tasks/ })).toHaveTextContent("7 open");
    });

    it("keeps Settings in the account menu only, and lists All workspaces under Your work", () => {
        renderShell();
        expect(sidebar().queryByRole("link", { name: "Settings" })).not.toBeInTheDocument();
        expect(sidebar().getByRole("link", { name: "All workspaces" })).toHaveAttribute("href", "/workspace");

        fireEvent.click(sidebar().getByRole("button", { name: /^Account/ }));
        expect(sidebar().getByRole("menuitem", { name: "Settings" })).toHaveAttribute("href", "/settings");
        expect(sidebar().getByRole("menuitem", { name: /Keyboard shortcuts/ })).toBeInTheDocument();
    });

    it("collapses to an icon rail with labelled links and remembers the choice", () => {
        renderShell({ pathname: "/workspace/northwind", collapsed: true, unread: 2 });

        // Icon-only, but every link keeps its name (and the count) for screen readers.
        const notifications = sidebar().getByRole("link", { name: "Notifications, 2 unread" });
        // Hovering shows a label beside the icon, drawn outside the scrolling sidebar.
        fireEvent.mouseEnter(notifications);
        const tip = Array.from(document.body.children).find((el) => el.textContent === "Notifications");
        expect(tip).toBeDefined();
        fireEvent.mouseLeave(notifications);
        expect(Array.from(document.body.children).some((el) => el.textContent === "Notifications")).toBe(false);
        expect(sidebar().getByRole("link", { name: /^All projects/ })).toHaveAttribute("aria-current", "page");

        fireEvent.click(sidebar().getByRole("button", { name: "Expand sidebar" }));
        expect(document.cookie).toContain("wv-sidebar=open");
        expect(sidebar().getByRole("button", { name: "Collapse sidebar" })).toBeInTheDocument();
    });

    it("opens quick search with Ctrl+K", () => {
        renderShell();
        expect(document.querySelector('dialog[aria-label="Search and jump to"]')).not.toBeNull();

        (HTMLDialogElement.prototype.showModal as jest.Mock).mockClear();
        fireEvent.keyDown(window, { key: "k", ctrlKey: true });
        expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1);
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

describe("AppShell keyboard shortcuts", () => {
    beforeEach(() => mockPush.mockClear());

    it("opens the shortcuts panel with ?", () => {
        renderShell();
        fireEvent.keyDown(window, { key: "?" });
        // jsdom never really opens a <dialog>, so its content counts as hidden.
        expect(screen.getByRole("heading", { name: "Keyboard shortcuts", hidden: true })).toBeInTheDocument();
    });

    it("goes places with G then a letter", () => {
        renderShell({ pathname: "/workspace/northwind/team" });

        fireEvent.keyDown(window, { key: "g" });
        fireEvent.keyDown(window, { key: "t" });
        expect(mockPush).toHaveBeenLastCalledWith("/tasks");

        fireEvent.keyDown(window, { key: "g" });
        fireEvent.keyDown(window, { key: "p" });
        expect(mockPush).toHaveBeenLastCalledWith("/workspace/northwind");

        // A letter on its own does nothing.
        mockPush.mockClear();
        fireEvent.keyDown(window, { key: "t" });
        expect(mockPush).not.toHaveBeenCalled();
    });

    it("stays out of the way while typing", () => {
        renderShell();
        const input = document.createElement("input");
        document.body.appendChild(input);

        fireEvent.keyDown(input, { key: "g" });
        fireEvent.keyDown(input, { key: "h" });
        fireEvent.keyDown(input, { key: "?" });

        expect(mockPush).not.toHaveBeenCalled();
        expect(screen.queryByRole("heading", { name: "Keyboard shortcuts", hidden: true })).not.toBeInTheDocument();
        input.remove();
    });

    it("collapses the sidebar with [", () => {
        renderShell();
        fireEvent.keyDown(window, { key: "[" });
        expect(document.cookie).toContain("wv-sidebar=collapsed");
    });
});
