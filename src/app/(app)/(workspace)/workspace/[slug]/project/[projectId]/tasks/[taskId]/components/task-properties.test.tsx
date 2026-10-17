/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render, screen } from "@testing-library/react";

import { TaskProperties } from "./task-properties";

const values = {
    title: "Ship release",
    description: "",
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    assigneeId: "",
    dueDate: "",
};

function renderProperties(openBlockers: number) {
    const updateTask = jest.fn().mockResolvedValue(undefined);
    render(
        <TaskProperties
            values={values}
            people={[]}
            assignee={null}
            overdue={false}
            canEdit
            updateTask={updateTask}
            openBlockers={openBlockers}
        />,
    );
    return updateTask;
}

async function pickStatus(label: string) {
    fireEvent.click(screen.getByRole("button", { name: /^Status:/ }));
    await act(async () => {
        fireEvent.click(screen.getByRole("option", { name: label }));
    });
}

const savedStatus = (updateTask: jest.Mock) => (updateTask.mock.calls[0][0] as FormData).get("status");

describe("TaskProperties status", () => {
    it("asks before marking a blocked task done, and keeps it as it was on cancel", async () => {
        const updateTask = renderProperties(1);
        await pickStatus("Done");

        expect(screen.getByRole("alertdialog")).toHaveTextContent("“Ship release” is still waiting on 1 open task.");
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

        expect(updateTask).not.toHaveBeenCalled();
        expect(screen.getByRole("button", { name: /^Status:/ })).toHaveAccessibleName("Status: In progress");
    });

    it("saves Done once confirmed", async () => {
        const updateTask = renderProperties(1);
        await pickStatus("Done");

        await act(async () => {
            fireEvent.click(screen.getByRole("button", { name: "Mark done anyway" }));
        });

        expect(savedStatus(updateTask)).toBe("DONE");
    });

    it("doesn't ask when nothing is blocking", async () => {
        const updateTask = renderProperties(0);
        await pickStatus("Done");

        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
        expect(savedStatus(updateTask)).toBe("DONE");
    });
});
