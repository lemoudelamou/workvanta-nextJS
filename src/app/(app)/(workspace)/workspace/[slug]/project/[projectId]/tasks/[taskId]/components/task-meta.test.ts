import { formatBytes, formatNumber, isRedirect, priorityMeta, statusMeta, taskFormData } from "./task-meta";

describe("task-meta", () => {
    it("formats numbers the same way whatever the reader's locale", () => {
        // The server and a German browser must agree, or React reports a hydration mismatch.
        expect(formatNumber(5000)).toBe("5,000");
    });

    it("formats file sizes", () => {
        expect(formatBytes(512)).toBe("512 B");
        expect(formatBytes(2048)).toBe("2 KB");
        expect(formatBytes(1_320_000)).toBe("1.3 MB");
    });

    it("labels known and unknown values", () => {
        expect(statusMeta("IN_REVIEW").label).toBe("In review");
        expect(priorityMeta("URGENT").bars).toBe(4);
        expect(statusMeta("ON_HOLD").label).toBe("On hold");
    });

    it("sends every field so a single change doesn't clear the others", () => {
        const data = taskFormData({
            title: "T",
            description: "",
            status: "TODO",
            priority: "LOW",
            assigneeId: "",
            dueDate: "2026-10-20",
        });
        expect([...data.keys()]).toEqual(["title", "description", "status", "priority", "assigneeId", "dueDate"]);
    });

    it("recognises a Next redirect", () => {
        expect(isRedirect({ digest: "NEXT_REDIRECT;replace;/x;307;" })).toBe(true);
        expect(isRedirect(new Error("nope"))).toBe(false);
    });
});
