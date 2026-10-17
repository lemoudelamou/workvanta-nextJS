/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render, screen, within } from "@testing-library/react";

import { DependenciesSection } from "./dependencies-section";
import { addDependencyAction, removeDependencyAction } from "../../../planning-actions";

jest.mock("../../../planning-actions", () => ({
    addDependencyAction: jest.fn().mockResolvedValue({}),
    removeDependencyAction: jest.fn().mockResolvedValue({}),
}));
jest.mock("next/link", () => ({
    __esModule: true,
    default: ({ href, children, ...rest }: any) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

const props = {
    slug: "acme",
    projectId: "p1",
    taskId: "t1",
    blockedBy: [
        { id: "a", title: "Design approved", status: "IN_REVIEW" },
        { id: "b", title: "Copy written", status: "DONE" },
    ],
    blocking: [{ id: "z", title: "Launch", status: "TODO" }],
    candidates: [
        { id: "a", title: "Design approved", status: "IN_REVIEW" },
        { id: "b", title: "Copy written", status: "DONE" },
        { id: "c", title: "Set up analytics", status: "TODO" },
        { id: "z", title: "Launch", status: "TODO" },
    ],
    canEdit: true,
};

describe("DependenciesSection", () => {
    it("shows what this task waits on and what waits on it", () => {
        render(<DependenciesSection {...props} />);
        expect(screen.getByText("Waiting on 1 task")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Design approved" })).toHaveAttribute("href", "/workspace/acme/project/p1/tasks/a");
        expect(screen.getByRole("link", { name: "Launch" })).toBeInTheDocument();
    });

    it("adds a blocker picked from the search, leaving out ones already added", async () => {
        render(<DependenciesSection {...props} />);
        const input = screen.getByRole("combobox", { name: /Add a blocker/ });
        fireEvent.change(input, { target: { value: "a" } });
        const list = screen.getByRole("listbox");
        expect(within(list).queryByText("Design approved")).not.toBeInTheDocument();
        await act(async () => {
            fireEvent.click(within(list).getByText("Set up analytics"));
        });
        expect(addDependencyAction).toHaveBeenCalledWith("acme", "p1", "t1", "c");
    });

    it("removes either kind of link, and shows why one was refused", async () => {
        (addDependencyAction as jest.Mock).mockResolvedValueOnce({ error: "“Launch” already waits on this task, so it can't block it." });
        render(<DependenciesSection {...props} />);
        await act(async () => {
            fireEvent.click(screen.getByRole("button", { name: "Remove “Design approved” as a blocker" }));
        });
        expect(removeDependencyAction).toHaveBeenCalledWith("acme", "p1", "t1", "a");
        await act(async () => {
            fireEvent.click(screen.getByRole("button", { name: "Stop “Launch” waiting on this task" }));
        });
        expect(removeDependencyAction).toHaveBeenCalledWith("acme", "p1", "z", "t1");

        const input = screen.getByRole("combobox", { name: /Add a blocker/ });
        fireEvent.change(input, { target: { value: "Launch" } });
        await act(async () => {
            fireEvent.keyDown(input, { key: "Enter" });
        });
        expect(await screen.findByRole("alert")).toHaveTextContent("already waits on this task");
    });

    it("is hidden for viewers when there's nothing linked", () => {
        const { container } = render(<DependenciesSection {...props} blockedBy={[]} blocking={[]} canEdit={false} />);
        expect(container).toBeEmptyDOMElement();
    });
});
