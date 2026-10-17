/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render, screen } from "@testing-library/react";

import { TaskHeader } from "./task-header";

const values = {
    title: "Ship it",
    description: "",
    status: "TODO",
    priority: "LOW",
    assigneeId: "",
    dueDate: "",
};

function setup() {
    const updateTask = jest.fn().mockResolvedValue(undefined);
    render(<TaskHeader values={values} canEdit updateTask={updateTask} />);
    fireEvent.click(screen.getByRole("button", { name: "Ship it" }));
    return updateTask;
}

describe("TaskHeader", () => {
    it("saves a new title on Enter, sending the other fields too", async () => {
        const updateTask = setup();

        fireEvent.change(screen.getByLabelText("Title"), { target: { value: "  Ship it today " } });
        await act(async () => {
            fireEvent.keyDown(screen.getByLabelText("Title"), { key: "Enter" });
        });

        expect(updateTask).toHaveBeenCalledTimes(1);
        const sent = updateTask.mock.calls[0][0] as FormData;
        expect(sent.get("title")).toBe("Ship it today");
        expect(sent.get("status")).toBe("TODO");
    });

    it("cancels on Escape without saving, even when focus then leaves", () => {
        const updateTask = setup();

        const input = screen.getByLabelText("Title");
        fireEvent.change(input, { target: { value: "Something else" } });
        fireEvent.keyDown(input, { key: "Escape" });
        fireEvent.blur(input);

        expect(updateTask).not.toHaveBeenCalled();
        expect(screen.getByRole("heading", { level: 1, name: "Ship it" })).toBeInTheDocument();
    });

    it("explains a too-short title instead of sending it", () => {
        const updateTask = setup();

        fireEvent.change(screen.getByLabelText("Title"), { target: { value: "x" } });
        fireEvent.keyDown(screen.getByLabelText("Title"), { key: "Enter" });

        expect(updateTask).not.toHaveBeenCalled();
        expect(screen.getByRole("alert")).toHaveTextContent("at least 2 characters");
    });

    it("shows the error and stays in edit mode when saving fails", async () => {
        const updateTask = setup();
        updateTask.mockRejectedValueOnce(new Error("Task title must be less than 200 characters"));

        fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Renamed" } });
        await act(async () => {
            fireEvent.keyDown(screen.getByLabelText("Title"), { key: "Enter" });
        });

        expect(screen.getByRole("alert")).toHaveTextContent("less than 200 characters");
        expect(screen.getByLabelText("Title")).toBeInTheDocument();
    });

    it("is plain text for people who can't edit", () => {
        render(<TaskHeader values={values} canEdit={false} updateTask={jest.fn()} />);
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
        expect(screen.getByText("No description yet.")).toBeInTheDocument();
    });
});
