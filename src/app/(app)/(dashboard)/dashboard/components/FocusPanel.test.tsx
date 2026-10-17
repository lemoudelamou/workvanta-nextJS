/**
 * @jest-environment jsdom
 */
import { render, screen, within } from "@testing-library/react";

import { FocusPanel, focusSummary } from "./FocusPanel";
import type { Focus } from "./types";

jest.mock("next/link", () => ({
    __esModule: true,
    default: ({ href, children, ...rest }: any) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

const task = (id: string, overrides: Partial<Focus["upNext"][number]> = {}) => ({
    id,
    title: `Task ${id}`,
    status: "TODO",
    priority: "MEDIUM",
    dueLabel: "Oct 20",
    overdue: false,
    href: `/workspace/acme/project/p1/tasks/${id}`,
    project: { id: "p1", name: "Website" },
    ...overrides,
});

describe("focusSummary", () => {
    it("names overdue and today, in that order", () => {
        expect(focusSummary({ overdue: 1, today: 2, week: 5, upNext: [] })).toBe(
            "You have 1 overdue and 2 due today.",
        );
    });

    it("falls back to this week, then to a calm message", () => {
        expect(focusSummary({ overdue: 0, today: 0, week: 3, upNext: [] })).toBe("You have 3 due this week.");
        expect(focusSummary({ overdue: 0, today: 0, week: 0, upNext: [task("a")] })).toBe(
            "Nothing urgent. Here's what's on your plate.",
        );
        expect(focusSummary({ overdue: 0, today: 0, week: 0, upNext: [] })).toBe(
            "Nothing assigned to you is open. Enjoy the calm.",
        );
    });
});

describe("FocusPanel", () => {
    it("shows the counts and links each upcoming task", () => {
        render(
            <FocusPanel
                focus={{
                    overdue: 1,
                    today: 0,
                    week: 2,
                    upNext: [task("t1", { overdue: true, dueLabel: "Oct 14" }), task("t2")],
                }}
            />,
        );

        expect(screen.getByRole("link", { name: /1\s*Overdue/ })).toHaveAttribute("href", "/tasks");
        expect(screen.getByRole("link", { name: /2\s*This week/ })).toBeInTheDocument();

        const first = screen.getByRole("link", { name: /Task t1/ });
        expect(first).toHaveAttribute("href", "/workspace/acme/project/p1/tasks/t1");
        expect(within(first).getByText("Oct 14")).toHaveClass("text-danger");
    });

    it("has a friendly empty state", () => {
        render(<FocusPanel focus={{ overdue: 0, today: 0, week: 0, upNext: [] }} />);
        expect(screen.getByText("Nothing assigned to you is open right now.")).toBeInTheDocument();
    });
});
