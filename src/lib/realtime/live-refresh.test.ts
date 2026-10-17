/**
 * @jest-environment jsdom
 */
import { affectsPage, createLiveRefresher, type TaskChanged } from "./live-refresh";
import { beginInteraction, endInteraction } from "./interaction-lock";

const change: TaskChanged = { projectId: "p1", taskId: "t1", kind: "moved", actorId: "u2" };

function setVisibility(state: "visible" | "hidden") {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
    document.dispatchEvent(new Event("visibilitychange"));
}

describe("affectsPage", () => {
    it("matches every page of the changed project and My tasks", () => {
        expect(affectsPage("/workspace/acme/project/p1", change)).toBe(true);
        expect(affectsPage("/workspace/acme/project/p1/tasks/t9", change)).toBe(true);
        expect(affectsPage("/workspace/acme/project/p1/members", change)).toBe(true);
        expect(affectsPage("/tasks", change)).toBe(true);
    });

    it("ignores other projects, including ones whose id starts the same", () => {
        expect(affectsPage("/workspace/acme/project/p12", change)).toBe(false);
        expect(affectsPage("/workspace/acme", change)).toBe(false);
        expect(affectsPage("/dashboard", change)).toBe(false);
    });
});

describe("createLiveRefresher", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        setVisibility("visible");
    });
    afterEach(() => jest.useRealTimers());

    it("collapses a burst of changes into one refresh", () => {
        const refresh = jest.fn();
        const refresher = createLiveRefresher(refresh, 300);

        refresher.schedule();
        refresher.schedule();
        refresher.schedule();
        jest.advanceTimersByTime(299);
        expect(refresh).not.toHaveBeenCalled();

        jest.advanceTimersByTime(1);
        expect(refresh).toHaveBeenCalledTimes(1);
        refresher.dispose();
    });

    it("waits until a drag is finished", () => {
        const refresh = jest.fn();
        const refresher = createLiveRefresher(refresh, 300);

        beginInteraction();
        refresher.schedule();
        jest.advanceTimersByTime(1000);
        expect(refresh).not.toHaveBeenCalled();

        endInteraction();
        jest.advanceTimersByTime(300);
        expect(refresh).toHaveBeenCalledTimes(1);
        refresher.dispose();
    });

    it("holds changes while the tab is hidden and refreshes on return", () => {
        const refresh = jest.fn();
        const refresher = createLiveRefresher(refresh, 300);

        setVisibility("hidden");
        refresher.schedule();
        jest.advanceTimersByTime(1000);
        expect(refresh).not.toHaveBeenCalled();

        setVisibility("visible");
        jest.advanceTimersByTime(300);
        expect(refresh).toHaveBeenCalledTimes(1);
        refresher.dispose();
    });

    it("stops after dispose", () => {
        const refresh = jest.fn();
        const refresher = createLiveRefresher(refresh, 300);

        refresher.schedule();
        refresher.dispose();
        jest.advanceTimersByTime(1000);
        expect(refresh).not.toHaveBeenCalled();
    });
});
