/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, within } from "@testing-library/react";

import { ProjectCard } from "./ProjectCard";
import { ProjectsBrowser } from "./ProjectsBrowser";
import { ActivityPanel, MyTasksPanel } from "./WorkspaceSidebar";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { AvatarStack } from "@/components/ui/AvatarStack";
import type { ProjectItem } from "@/types/project-item";

jest.mock("next/link", () => ({
    __esModule: true,
    default: ({ href, children, ...rest }: any) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

const ada = { id: "u1", name: "Ada Lovelace", email: "ada@x.com", image: null };

function project(id: string, name: string, counts: Partial<NonNullable<ProjectItem["counts"]>>, extra: Partial<ProjectItem> = {}): ProjectItem {
    return {
        id,
        name,
        description: null,
        visibility: "WORKSPACE",
        updatedAt: new Date("2026-10-10T00:00:00Z"),
        accessible: true,
        counts: { TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0, ...counts },
        people: [],
        overdue: 0,
        ...extra,
    };
}

describe("ProjectCard", () => {
    it("shows progress, open work and what's late", () => {
        render(
            <ProjectCard
                workspaceSlug="acme"
                project={project("p1", "Apollo", { TODO: 2, IN_PROGRESS: 1, DONE: 1 }, { overdue: 2, visibility: "PRIVATE", updatedLabel: "2 hours ago" })}
            />,
        );

        const card = screen.getByRole("link", { name: "Open project Apollo" });
        expect(card).toHaveAttribute("href", "/workspace/acme/project/p1");
        expect(card).toHaveTextContent("25%");
        expect(card).toHaveTextContent("3 open");
        expect(card).toHaveTextContent("2 overdue");
        expect(card).toHaveTextContent("2 hours ago");
        expect(within(card).getByLabelText("Private")).toBeInTheDocument();
        expect(within(card).getByRole("img", { name: "1 of 4 tasks done" })).toBeInTheDocument();
    });

    it("says when there are no tasks", () => {
        render(<ProjectCard workspaceSlug="acme" project={project("p1", "Apollo", {})} />);
        expect(screen.getByRole("link")).toHaveTextContent("No tasks yet");
        expect(screen.getByRole("link")).toHaveTextContent("0%");
    });
});

describe("ProjectsBrowser", () => {
    const projects = [
        project("a", "Zeta", { DONE: 1, TODO: 3 }, { updatedAt: new Date("2026-10-12T00:00:00Z") }),
        project("b", "Alpha", { DONE: 3, TODO: 1 }, { updatedAt: new Date("2026-10-01T00:00:00Z") }),
        project("c", "Mobile app", { TODO: 2 }, { updatedAt: new Date("2026-10-11T00:00:00Z") }),
        project("d", "Beta", { DONE: 1, TODO: 1 }, { updatedAt: new Date("2026-10-05T00:00:00Z") }),
    ];
    const names = () => screen.getAllByRole("link").map((a) => a.getAttribute("aria-label")?.replace("Open project ", ""));

    it("lists the most recently updated first, then sorts by name or progress", () => {
        render(<ProjectsBrowser projects={projects} workspaceSlug="acme" />);
        expect(names()).toEqual(["Zeta", "Mobile app", "Beta", "Alpha"]);

        fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "name" } });
        expect(names()).toEqual(["Alpha", "Beta", "Mobile app", "Zeta"]);

        fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "progress" } });
        expect(names()).toEqual(["Alpha", "Beta", "Zeta", "Mobile app"]);
    });

    it("filters by name and hides the new-project tile while searching", () => {
        render(<ProjectsBrowser projects={projects} workspaceSlug="acme" trailing={<span>New project tile</span>} />);
        expect(screen.getByText("New project tile")).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText("Find a project"), { target: { value: "mob" } });
        expect(names()).toEqual(["Mobile app"]);
        expect(screen.queryByText("New project tile")).not.toBeInTheDocument();

        fireEvent.change(screen.getByLabelText("Find a project"), { target: { value: "nothing" } });
        expect(screen.getByText("No projects match “nothing”.")).toBeInTheDocument();
    });

    it("skips the search bar for a handful of projects", () => {
        render(<ProjectsBrowser projects={projects.slice(0, 2)} workspaceSlug="acme" />);
        expect(screen.queryByLabelText("Find a project")).not.toBeInTheDocument();
    });
});

describe("workspace side panels", () => {
    const now = new Date("2026-10-16T12:00:00Z");

    it("lists your open tasks with their project and flags late ones", () => {
        render(
            <MyTasksPanel
                slug="acme"
                now={now}
                tasks={[
                    { id: "t1", title: "Ship it", status: "IN_PROGRESS", dueDate: new Date("2026-10-10T00:00:00Z"), project: { id: "p1", name: "Apollo" } },
                    { id: "t2", title: "Plan it", status: "TODO", dueDate: null, project: { id: "p2", name: "Gemini" } },
                ]}
            />,
        );

        const ship = screen.getByRole("link", { name: /Ship it/ });
        expect(ship).toHaveAttribute("href", "/workspace/acme/project/p1/tasks/t1");
        expect(ship).toHaveTextContent("Apollo");
        expect(ship).toHaveTextContent("Overdue, Oct 10");
        expect(screen.getByRole("link", { name: /Plan it/ })).not.toHaveTextContent("Overdue");
    });

    it("says when nothing is assigned to you", () => {
        render(<MyTasksPanel slug="acme" now={now} tasks={[]} />);
        expect(screen.getByText("Nothing assigned to you here.")).toBeInTheDocument();
    });

    it("words recent changes and links the task", () => {
        render(
            <ActivityPanel
                slug="acme"
                events={[
                    {
                        id: "e1",
                        action: "TASK_STATUS_CHANGED",
                        metadata: { from: "TODO", to: "DONE" },
                        createdAt: new Date(),
                        user: ada,
                        task: { id: "t1", title: "Ship it", projectId: "p1" },
                    },
                    {
                        id: "e2",
                        action: "ATTACHMENT_UPLOADED",
                        metadata: { filename: "a.pdf" },
                        createdAt: new Date(),
                        user: ada,
                        task: { id: "t2", title: "Plan it", projectId: "p1" },
                    },
                ]}
            />,
        );

        expect(screen.getByText(/moved/).closest("p")).toHaveTextContent("Ada Lovelace moved Ship it to Done");
        expect(screen.getByText(/attached a file to/).closest("p")).toHaveTextContent("Ada Lovelace attached a file to Plan it");
        expect(screen.getByRole("link", { name: "Ship it" })).toHaveAttribute("href", "/workspace/acme/project/p1/tasks/t1");
    });
});

describe("ActionMenu", () => {
    it("opens, moves with the arrow keys, runs an item and closes", () => {
        const onSelect = jest.fn();
        render(
            <ActionMenu
                label="Workspace actions"
                items={[
                    { label: "Rename", onSelect },
                    { label: "Team", href: "/team" },
                    { kind: "separator" },
                    { label: "Delete", danger: true, onSelect: jest.fn() },
                ]}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Workspace actions" }));
        const menu = screen.getByRole("menu", { name: "Workspace actions" });
        expect(within(menu).getAllByRole("menuitem").map((i) => i.textContent)).toEqual(["Rename", "Team", "Delete"]);
        expect(within(menu).getByRole("menuitem", { name: "Team" })).toHaveAttribute("href", "/team");

        within(menu).getByRole("menuitem", { name: "Rename" }).focus();
        fireEvent.keyDown(menu, { key: "ArrowUp" });
        expect(document.activeElement).toHaveTextContent("Delete");

        fireEvent.click(within(menu).getByRole("menuitem", { name: "Rename" }));
        expect(onSelect).toHaveBeenCalled();
        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("closes on Escape", () => {
        render(<ActionMenu label="More" items={[{ label: "One", onSelect: jest.fn() }]} />);
        fireEvent.click(screen.getByRole("button", { name: "More" }));
        fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
});

describe("AvatarStack", () => {
    it("shows the first few faces and how many more", () => {
        const people = ["Ada Lovelace", "Bob", "Cy Young", "Di"].map((name, i) => ({ id: `u${i}`, name, email: `${i}@x.com`, image: null }));
        render(<AvatarStack people={people} max={2} total={9} label="9 members" />);
        const stack = screen.getByRole("img", { name: "9 members" });
        expect(stack).toHaveTextContent("AL");
        expect(stack).toHaveTextContent("BO");
        expect(stack).toHaveTextContent("+7");
    });
});
