import { getActivityText } from "./activity-text";

describe("getActivityText for planning events", () => {
    it.each([
        ["TASK_DUE_DATE_CHANGED", { to: "2026-10-24T23:59:59.000Z" }, "moved the due date to Oct 24"],
        ["TASK_DUE_DATE_CHANGED", { to: null }, "removed the due date"],
        ["TASK_RECURRENCE_CHANGED", { to: "every week" }, "set this task to repeat every week"],
        ["TASK_RECURRENCE_CHANGED", { to: null }, "stopped this task repeating"],
        ["TASK_REPEATED", { to: "2026-10-23T23:59:59.000Z" }, "finished the last one, so this repeat is due Oct 23"],
        ["DEPENDENCY_ADDED", { to: "Design approved" }, "marked this as blocked by “Design approved”"],
        ["DEPENDENCY_REMOVED", { from: "Design approved" }, "removed “Design approved” as a blocker"],
    ])("%s %j", (action, metadata, text) => {
        expect(getActivityText({ action, metadata })).toBe(text);
    });
});
