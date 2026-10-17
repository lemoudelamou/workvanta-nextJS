/**
 * @jest-environment jsdom
 */
import { act, render, screen } from "@testing-library/react";

import { HIGHLIGHT_MS, useLiveHighlights } from "./live-highlight";

function Probe({ id }: { id: string }) {
    return <span>{useLiveHighlights().has(id) ? "glowing" : "still"}</span>;
}

describe("useLiveHighlights", () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it("marks a task changed elsewhere for a few seconds", () => {
        render(<Probe id="t1" />);
        expect(screen.getByText("still")).toBeInTheDocument();

        act(() => {
            window.dispatchEvent(new CustomEvent("Workvanta:task-changed", { detail: { taskId: "t1" } }));
        });
        expect(screen.getByText("glowing")).toBeInTheDocument();

        act(() => jest.advanceTimersByTime(HIGHLIGHT_MS));
        expect(screen.getByText("still")).toBeInTheDocument();
    });

    it("ignores other tasks and events without a task", () => {
        render(<Probe id="t1" />);

        act(() => {
            window.dispatchEvent(new CustomEvent("Workvanta:task-changed", { detail: { taskId: "t2" } }));
            window.dispatchEvent(new CustomEvent("Workvanta:task-changed", { detail: { taskId: null } }));
        });
        expect(screen.getByText("still")).toBeInTheDocument();
    });
});
