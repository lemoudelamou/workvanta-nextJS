/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render, screen, within } from "@testing-library/react";

import { moveCardAction } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/project-actions";
import { ProjectListView } from "./project-list-view";
import type { BoardTask } from "../kanbanboard/kanban-types";

jest.mock("@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/project-actions", () => ({
    moveCardAction: jest.fn(),
}));
jest.mock("@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/create-task-dialog", () => ({
    CreateTaskDialog: ({ open }: { open: boolean }) => (open ? <div role="dialog">New task</div> : null),
}));

const mockMove = moveCardAction as jest.Mock;

function task(id: string, overrides: Partial<BoardTask> = {}): BoardTask {
    return {
        id,
        title: `Task ${id}`,
        status: "TODO",
        priority: "MEDIUM",
        dueLabel: null,
        dueAt: null,
        overdue: false,
        assignee: null,
        subtaskTotal: 0,
        subtaskDone: 0,
        labels: [],
        ...overrides,
    };
}

const tasks = [
    task("1", { title: "Write copy", dueAt: "2026-10-20T00:00:00Z", dueLabel: "Oct 20" }),
    task("2", { title: "Design hero", dueAt: "2026-10-18T00:00:00Z", dueLabel: "Oct 18", overdue: true, subtaskTotal: 3, subtaskDone: 1 }),
    task("3", { title: "Launch", status: "DONE" }),
];

function renderList(canEdit = true) {
    return render(
        <ProjectListView slug="acme" projectId="p1" tasks={tasks} members={[]} canEdit={canEdit} />,
    );
}

// The list renders twice (a table from md up, a stacked list on phones; CSS
// picks one). jsdom applies no CSS, so queries are scoped to one layout.
const table = () => within(screen.getByRole("table"));
const phoneList = () => within(screen.getByRole("list", { name: "Tasks" }));

const rowTitles = () =>
    screen.getAllByRole("row").slice(1).map((row) => within(row).getAllByRole("cell")[0].textContent);

afterEach(() => jest.clearAllMocks());

describe("ProjectListView", () => {
    it("lists tasks sorted by due date, undated last, linking to each task", () => {
        renderList();

        expect(rowTitles()).toEqual(["Design hero1/3 subtasks", "Write copy", "Launch"]);
        expect(table().getByRole("link", { name: "Write copy" })).toHaveAttribute(
            "href",
            "/workspace/acme/project/p1/tasks/1",
        );
        expect(screen.getByText("(overdue)", { exact: false })).toBeInTheDocument();
        expect(screen.getByText("Showing 3 of 3 tasks")).toBeInTheDocument();
    });

    it("sorts when a column header is clicked and announces the order", () => {
        renderList();

        fireEvent.click(screen.getByRole("button", { name: "Task" }));
        expect(rowTitles()).toEqual(["Design hero1/3 subtasks", "Launch", "Write copy"]);
        expect(screen.getByRole("columnheader", { name: "Task" })).toHaveAttribute("aria-sort", "ascending");

        fireEvent.click(screen.getByRole("button", { name: "Task" }));
        expect(screen.getByRole("columnheader", { name: "Task" })).toHaveAttribute("aria-sort", "descending");
    });

    it("filters and can clear filters", () => {
        renderList();

        fireEvent.change(screen.getByRole("combobox", { name: "Filter by status" }), {
            target: { value: "DONE" },
        });
        expect(rowTitles()).toEqual(["Launch"]);

        fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
        expect(rowTitles()).toHaveLength(3);
    });

    it("explains when no task matches", () => {
        renderList();

        fireEvent.change(screen.getByRole("searchbox", { name: "Search tasks" }), {
            target: { value: "zzz" },
        });
        expect(table().getByText("No tasks match these filters.")).toBeInTheDocument();
        expect(phoneList().getByText("No tasks match these filters.")).toBeInTheDocument();
    });

    it("lets editors change status inline and saves it", async () => {
        mockMove.mockResolvedValue(undefined);
        renderList();

        await act(async () => {
            fireEvent.change(table().getByRole("combobox", { name: "Status of Write copy" }), {
                target: { value: "IN_REVIEW" },
            });
        });

        expect(mockMove).toHaveBeenCalledWith("acme", "p1", "1", "IN_REVIEW");
        expect(table().getByRole("combobox", { name: "Status of Write copy" })).toHaveValue("IN_REVIEW");
    });

    it("rolls back and explains if saving the status fails", async () => {
        mockMove.mockRejectedValue(new Error("nope"));
        renderList();

        await act(async () => {
            fireEvent.change(table().getByRole("combobox", { name: "Status of Write copy" }), {
                target: { value: "DONE" },
            });
        });

        expect(screen.getByRole("alert")).toHaveTextContent(`Couldn't update "Write copy"`);
        expect(table().getByRole("combobox", { name: "Status of Write copy" })).toHaveValue("TODO");
    });

    describe("marking a blocked task done", () => {
        const blocked = [task("1", { title: "Write copy", openBlockers: 2 })];
        const setDone = async () =>
            act(async () => {
                fireEvent.change(table().getByRole("combobox", { name: "Status of Write copy" }), {
                    target: { value: "DONE" },
                });
            });

        it("asks first, and does nothing if the editor backs out", async () => {
            render(<ProjectListView slug="acme" projectId="p1" tasks={blocked} members={[]} canEdit />);
            await setDone();

            expect(screen.getByRole("alertdialog")).toHaveTextContent("“Write copy” is still waiting on 2 open tasks.");
            fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

            expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
            expect(mockMove).not.toHaveBeenCalled();
            expect(table().getByRole("combobox", { name: "Status of Write copy" })).toHaveValue("TODO");
        });

        it("saves once the editor confirms", async () => {
            mockMove.mockResolvedValue(undefined);
            render(<ProjectListView slug="acme" projectId="p1" tasks={blocked} members={[]} canEdit />);
            await setDone();

            await act(async () => {
                fireEvent.click(screen.getByRole("button", { name: "Mark done anyway" }));
            });

            expect(mockMove).toHaveBeenCalledWith("acme", "p1", "1", "DONE");
        });

        it("doesn't ask for other moves", async () => {
            mockMove.mockResolvedValue(undefined);
            render(<ProjectListView slug="acme" projectId="p1" tasks={blocked} members={[]} canEdit />);

            await act(async () => {
                fireEvent.change(table().getByRole("combobox", { name: "Status of Write copy" }), {
                    target: { value: "IN_PROGRESS" },
                });
            });

            expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
            expect(mockMove).toHaveBeenCalledWith("acme", "p1", "1", "IN_PROGRESS");
        });
    });

    it("shows each task as a compact row on phones", () => {
        renderList();

        const items = phoneList().getAllByRole("listitem");
        expect(items.map((item) => within(item).getByRole("link").textContent)).toEqual([
            "Design hero",
            "Write copy",
            "Launch",
        ]);
        expect(within(items[0]).getByText("Overdue, Oct 18")).toBeInTheDocument();
        expect(within(items[1]).getByText("Due Oct 20")).toBeInTheDocument();
        expect(within(items[1]).getByRole("combobox", { name: "Status of Write copy" })).toHaveValue("TODO");
    });

    it("is read-only for viewers", () => {
        renderList(false);

        expect(screen.queryByRole("combobox", { name: /Status of/ })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "New task" })).not.toBeInTheDocument();
    });

    it("opens the new task dialog for editors", () => {
        renderList();

        fireEvent.click(screen.getByRole("button", { name: "New task" }));
        expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
});
