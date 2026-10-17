/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render, screen } from "@testing-library/react";

import { LabelPicker } from "./label-picker";
import { createLabelAction, setTaskLabelsAction } from "../../../label-actions";

jest.mock("../../../label-actions", () => ({
    createLabelAction: jest.fn(),
    setTaskLabelsAction: jest.fn().mockResolvedValue({}),
}));

const props = {
    slug: "acme",
    projectId: "p1",
    taskId: "t1",
    projectLabels: [{ id: "l1", name: "Bug", color: "red" }],
    initialSelected: [],
    canEdit: true,
};

function openMenu() {
    render(<LabelPicker {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Add labels" }));
}

afterEach(() => jest.clearAllMocks());

describe("LabelPicker", () => {
    it("suggests ready-made labels the project doesn't have yet", () => {
        openMenu();

        expect(screen.getByText("Suggested")).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Feature" })).toBeInTheDocument();
        // "Bug" is already a project label, so it shows once, not as a suggestion too.
        expect(screen.getAllByRole("option", { name: "Bug" })).toHaveLength(1);
    });

    it("creates and attaches a suggested label when picked", async () => {
        (createLabelAction as jest.Mock).mockResolvedValue({ label: { id: "l2", name: "Feature", color: "blue" } });
        openMenu();

        await act(async () => {
            fireEvent.click(screen.getByRole("option", { name: "Feature" }));
        });

        expect(createLabelAction).toHaveBeenCalledWith("acme", "p1", "Feature");
        expect(setTaskLabelsAction).toHaveBeenCalledWith("acme", "p1", "t1", ["l2"]);
    });

    it("still offers to create a custom label", () => {
        openMenu();
        fireEvent.change(screen.getByRole("combobox"), { target: { value: "Backend" } });

        expect(screen.getByRole("option", { name: "Create label “Backend”" })).toBeInTheDocument();
        expect(screen.queryByText("Suggested")).not.toBeInTheDocument();
    });
});
