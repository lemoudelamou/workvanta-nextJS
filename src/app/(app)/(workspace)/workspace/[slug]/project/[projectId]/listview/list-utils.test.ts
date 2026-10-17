import { filterTasks, nextSort, sortTasks } from "./list-utils";
import type { BoardTask } from "../kanbanboard/kanban-types";

function task(id: string, overrides: Partial<BoardTask> = {}): BoardTask {
    return {
        id,
        title: `Task ${id}`,
        status: "TODO",
        priority: "MEDIUM",
        dueLabel: null,
        dueAt: null,
        overdue: false,
        assignee: null,
        subtaskTotal: 0,
        subtaskDone: 0,
        labels: [],
        ...overrides,
    };
}

const ada = { name: "Ada", email: "ada@x.com", image: null };
const bob = { name: null, email: "bob@x.com", image: null };
const ids = (tasks: BoardTask[]) => tasks.map((t) => t.id);

const tasks = [
    task("a", { title: "Banana", status: "DONE", priority: "LOW", dueAt: "2026-10-20T00:00:00Z", assignee: bob }),
    task("b", { title: "apple", status: "IN_PROGRESS", priority: "URGENT", dueAt: "2026-10-18T00:00:00Z", assignee: ada }),
    task("c", { title: "Cherry", status: "TODO", priority: "HIGH" }),
];

describe("sortTasks", () => {
    it("sorts titles case-insensitively", () => {
        expect(ids(sortTasks(tasks, "title", "asc"))).toEqual(["b", "a", "c"]);
        expect(ids(sortTasks(tasks, "title", "desc"))).toEqual(["c", "a", "b"]);
    });

    it("sorts status in workflow order", () => {
        expect(ids(sortTasks(tasks, "status", "asc"))).toEqual(["c", "b", "a"]);
    });

    it("puts the most urgent first when ascending", () => {
        expect(ids(sortTasks(tasks, "priority", "asc"))).toEqual(["b", "c", "a"]);
    });

    it("keeps tasks without a due date last in both directions", () => {
        expect(ids(sortTasks(tasks, "due", "asc"))).toEqual(["b", "a", "c"]);
        expect(ids(sortTasks(tasks, "due", "desc"))).toEqual(["a", "b", "c"]);
    });

    it("keeps unassigned tasks last and sorts by name or email", () => {
        expect(ids(sortTasks(tasks, "assignee", "asc"))).toEqual(["b", "a", "c"]);
        expect(ids(sortTasks(tasks, "assignee", "desc"))).toEqual(["a", "b", "c"]);
    });

    it("does not mutate its input", () => {
        const copy = [...tasks];
        sortTasks(tasks, "title", "asc");
        expect(tasks).toEqual(copy);
    });
});

describe("filterTasks", () => {
    const none = { search: "", priority: "ALL", status: "ALL", assignee: "ALL", label: "ALL" };

    it("matches title search case-insensitively", () => {
        expect(ids(filterTasks(tasks, { ...none, search: "APP" }))).toEqual(["b"]);
    });

    it("filters by status, priority and assignee", () => {
        expect(ids(filterTasks(tasks, { ...none, status: "DONE" }))).toEqual(["a"]);
        expect(ids(filterTasks(tasks, { ...none, priority: "HIGH" }))).toEqual(["c"]);
        expect(ids(filterTasks(tasks, { ...none, assignee: "ada@x.com" }))).toEqual(["b"]);
        expect(ids(filterTasks(tasks, { ...none, assignee: "UNASSIGNED" }))).toEqual(["c"]);
    });

    it("filters by label", () => {
        const bug = { id: "l-bug", name: "Bug", color: "red" };
        const design = { id: "l-design", name: "Design", color: "violet" };
        const labelled = [task("x", { labels: [bug] }), task("y", { labels: [bug, design] }), task("z")];
        expect(ids(filterTasks(labelled, { ...none, label: "l-design" }))).toEqual(["y"]);
        expect(ids(filterTasks(labelled, { ...none, label: "l-bug" }))).toEqual(["x", "y"]);
        expect(ids(filterTasks(labelled, none))).toEqual(["x", "y", "z"]);
    });
});

describe("nextSort", () => {
    it("toggles direction on the same column and resets on a new one", () => {
        expect(nextSort({ key: "due", direction: "asc" }, "due")).toEqual({ key: "due", direction: "desc" });
        expect(nextSort({ key: "due", direction: "desc" }, "title")).toEqual({ key: "title", direction: "asc" });
    });
});
