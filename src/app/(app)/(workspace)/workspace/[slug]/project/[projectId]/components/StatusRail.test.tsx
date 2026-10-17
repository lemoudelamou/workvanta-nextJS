import { render, screen } from "@testing-library/react";

import { StatusRail } from "./StatusRail";

const counts = { TODO: 3, IN_PROGRESS: 2, IN_REVIEW: 1, DONE: 2 };

describe("StatusRail", () => {
    it("shows the share of done tasks and what needs attention", () => {
        render(<StatusRail counts={counts} overdue={1} dueSoon={2} unassigned={3} />);

        expect(screen.getByText("25% done")).toBeInTheDocument();
        expect(screen.getByText("2 of 8 tasks")).toBeInTheDocument();
        expect(screen.getByText("1 overdue")).toBeInTheDocument();
        expect(screen.getByText("2 due this week")).toBeInTheDocument();
        expect(screen.getByText("3 unassigned")).toBeInTheDocument();
    });

    it("describes the bar for screen readers and says when nothing is late", () => {
        render(<StatusRail counts={counts} overdue={0} dueSoon={0} unassigned={0} />);

        expect(
            screen.getByRole("img", { name: "To do: 3, In progress: 2, In review: 1, Done: 2" }),
        ).toBeInTheDocument();
        expect(screen.getByText("Nothing overdue")).toBeInTheDocument();
        expect(screen.queryByText(/due this week/)).not.toBeInTheDocument();
        expect(screen.queryByText(/unassigned/)).not.toBeInTheDocument();
    });

    it("handles an empty project", () => {
        render(
            <StatusRail counts={{ TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0 }} overdue={0} dueSoon={0} unassigned={0} />,
        );

        expect(screen.getByText("0% done")).toBeInTheDocument();
        expect(screen.getByText("0 of 0 tasks")).toBeInTheDocument();
        expect(screen.queryByText("Nothing overdue")).not.toBeInTheDocument();
    });
});
