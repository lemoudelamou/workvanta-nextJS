/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, within } from "@testing-library/react";

import { ProjectCalendar } from "./project-calendar";
import type { BoardTask } from "../kanbanboard/kanban-types";

jest.mock("../planning-actions", () => ({ rescheduleTaskAction: jest.fn().mockResolvedValue({}) }));
jest.mock("@/lib/realtime/interaction-lock", () => ({ beginInteraction: jest.fn(), endInteraction: jest.fn() }));
jest.mock("next/link", () => ({
    __esModule: true,
    default: ({ href, children, ...rest }: any) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

function task(id: string, dueAt: string | null, overrides: Partial<BoardTask> = {}): BoardTask {
    return {
        id,
        title: `Task ${id}`,
        status: "TODO",
        priority: "MEDIUM",
        dueLabel: null,
        dueAt,
        overdue: false,
        assignee: null,
        subtaskTotal: 0,
        subtaskDone: 0,
        labels: [],
        ...overrides,
    };
}

const tasks = [
    task("a", "2026-10-20T23:59:59.000Z", { recurrence: "WEEKLY" }),
    task("b", "2026-10-20T23:59:59.000Z", { openBlockers: 1 }),
    task("c", "2026-10-20T23:59:59.000Z"),
    task("d", "2026-10-20T23:59:59.000Z", { status: "DONE" }),
    task("late", "2026-10-12T23:59:59.000Z", { overdue: true }),
    task("someday", null),
    task("finished-undated", null, { status: "DONE" }),
];

function renderCalendar(month = "2026-10") {
    return render(
        <ProjectCalendar slug="acme" projectId="p1" tasks={tasks} month={month} today="2026-10-17" canEdit leading={<span>views</span>} />,
    );
}

describe("ProjectCalendar", () => {
    it("puts tasks on their due day, three at a time, with more on request", () => {
        renderCalendar();
        const grid = screen.getByRole("grid", { name: "Tasks due in October 2026" });
        const day = within(grid).getByRole("gridcell", { name: "Tuesday, October 20, 4 due" });

        expect(within(day).getAllByRole("link")).toHaveLength(3);
        expect(within(day).getByLabelText("Blocked")).toBeInTheDocument();
        expect(within(day).getByLabelText("Repeats")).toBeInTheDocument();
        fireEvent.click(within(day).getByRole("button", { name: "+1 more" }));
        expect(within(day).getAllByRole("link")).toHaveLength(4);
        expect(within(day).getByRole("button", { name: "Show less" })).toBeInTheDocument();

        expect(within(grid).getByRole("link", { name: "Task late" })).toHaveAttribute("href", "/workspace/acme/project/p1/tasks/late");
        expect(screen.getByText("5 tasks due this month")).toBeInTheDocument();
    });

    it("lists open tasks without a date to drag onto the calendar", () => {
        renderCalendar();
        // The desktop tray (its heading carries the count); phones list them too.
        const tray = screen.getByRole("region", { name: "No due date 1" });
        expect(within(tray).getByRole("link", { name: "Task someday" })).toBeInTheDocument();
        expect(within(tray).queryByText("Task finished-undated")).not.toBeInTheDocument();
    });

    it("links to the months around it and back to today", () => {
        renderCalendar("2026-12");
        expect(screen.getByRole("link", { name: "Previous month" })).toHaveAttribute(
            "href",
            "/workspace/acme/project/p1?view=calendar&month=2026-11",
        );
        expect(screen.getByRole("link", { name: "Next month" })).toHaveAttribute(
            "href",
            "/workspace/acme/project/p1?view=calendar&month=2027-01",
        );
        expect(screen.getByRole("link", { name: "Today" })).toHaveAttribute(
            "href",
            "/workspace/acme/project/p1?view=calendar&month=2026-10",
        );
        expect(screen.getByText("Nothing due this month.", { selector: "p" })).toBeInTheDocument();
    });

    it("gives phones a list of days", () => {
        renderCalendar();
        const day = screen.getByRole("region", { name: "Tuesday, October 20" });
        expect(within(day).getAllByRole("link")).toHaveLength(4);
    });
});
