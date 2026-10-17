import {
    createLabelAction,
    deleteLabelAction,
    setTaskLabelsAction,
    updateLabelAction,
} from "./label-actions";
import { prisma } from "@/lib/db/prisma";
import { requireProjectPermission } from "@/lib/auth/members";
import { requireTaskEditor } from "@/lib/auth/task_permission";
import { ForbiddenError } from "@/lib/auth/permissions";
import { publishTaskChanged } from "@/lib/realtime/task-events";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/realtime/task-events", () => ({ publishTaskChanged: jest.fn() }));
jest.mock("@/lib/auth/members", () => ({ requireProjectPermission: jest.fn() }));
jest.mock("@/lib/auth/task_permission", () => ({ requireTaskEditor: jest.fn() }));
jest.mock("@/lib/db/prisma", () => ({
    prisma: {
        label: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            deleteMany: jest.fn(),
        },
        task: { findFirst: jest.fn() },
        taskLabel: { deleteMany: jest.fn((x) => ({ op: "delete", ...x })), createMany: jest.fn((x) => ({ op: "create", ...x })) },
        $transaction: jest.fn(),
    },
}));

const db = prisma as any;
const editor = requireTaskEditor as jest.Mock;
const admin = requireProjectPermission as jest.Mock;
const access = { project: { id: "p1" } };

beforeEach(() => {
    editor.mockResolvedValue(access);
    admin.mockResolvedValue(access);
    db.label.findMany.mockResolvedValue([]);
    db.label.findUnique.mockResolvedValue(null);
    db.label.findFirst.mockResolvedValue(null);
    db.task.findFirst.mockResolvedValue({ id: "t1" });
    jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => jest.clearAllMocks());

describe("createLabelAction", () => {
    it("creates a label with a tidy name and the next free colour", async () => {
        db.label.findMany.mockResolvedValue([{ color: "red" }]);
        db.label.create.mockResolvedValue({ id: "l1", name: "Needs review", color: "orange" });

        const result = await createLabelAction("acme", "p1", "  Needs   review ");

        expect(editor).toHaveBeenCalledWith("acme", "p1");
        expect(db.label.create).toHaveBeenCalledWith({
            data: { projectId: "p1", name: "Needs review", normalizedName: "needs review", color: "orange" },
            select: { id: true, name: true, color: true },
        });
        expect(result).toEqual({ label: { id: "l1", name: "Needs review", color: "orange" } });
    });

    it("returns the existing label instead of making a duplicate", async () => {
        db.label.findUnique.mockResolvedValue({ id: "l9", name: "Bug", color: "red" });

        const result = await createLabelAction("acme", "p1", "BUG");

        expect(db.label.create).not.toHaveBeenCalled();
        expect(result).toEqual({ label: { id: "l9", name: "Bug", color: "red" } });
    });

    it.each([
        ["", "Give the label a name."],
        ["x".repeat(31), "Keep label names to 30 characters."],
    ])("rejects %j", async (name, error) => {
        expect(await createLabelAction("acme", "p1", name)).toEqual({ error });
    });

    it("explains when someone can't edit tasks", async () => {
        editor.mockRejectedValue(new ForbiddenError("You don't have permission to edit tasks in this project."));
        expect(await createLabelAction("acme", "p1", "Bug")).toEqual({
            error: "You don't have permission to edit tasks in this project.",
        });
    });
});

describe("setTaskLabelsAction", () => {
    it("replaces the task's labels in one transaction and tells the board", async () => {
        db.label.findMany.mockResolvedValue([{ id: "a" }, { id: "b" }]);

        const result = await setTaskLabelsAction("acme", "p1", "t1", ["a", "b", "a"]);

        expect(result).toEqual({});
        expect(db.label.findMany).toHaveBeenCalledWith({
            where: { id: { in: ["a", "b"] }, projectId: "p1" },
            select: { id: true },
        });
        expect(db.$transaction).toHaveBeenCalledWith([
            { op: "delete", where: { taskId: "t1", labelId: { notIn: ["a", "b"] } } },
            { op: "create", data: [{ taskId: "t1", labelId: "a" }, { taskId: "t1", labelId: "b" }], skipDuplicates: true },
        ]);
        expect(publishTaskChanged).toHaveBeenCalledWith("p1", { taskId: "t1", kind: "updated" });
    });

    it("refuses labels from another project", async () => {
        db.label.findMany.mockResolvedValue([{ id: "a" }]);
        expect(await setTaskLabelsAction("acme", "p1", "t1", ["a", "other-project"])).toEqual({
            error: "That label no longer exists.",
        });
        expect(db.$transaction).not.toHaveBeenCalled();
    });

    it("refuses tasks from another project", async () => {
        db.task.findFirst.mockResolvedValue(null);
        expect(await setTaskLabelsAction("acme", "p1", "t-elsewhere", [])).toEqual({ error: "Task not found." });
        expect(db.task.findFirst).toHaveBeenCalledWith({ where: { id: "t-elsewhere", projectId: "p1" }, select: { id: true } });
    });
});

describe("updateLabelAction and deleteLabelAction (project admins)", () => {
    it("needs the project.update permission", async () => {
        admin.mockRejectedValue(new ForbiddenError("Only project admins can edit labels."));
        expect(await updateLabelAction("acme", "p1", "l1", { name: "X", color: "red" })).toEqual({
            error: "Only project admins can edit labels.",
        });
        expect(admin).toHaveBeenCalledWith("acme", "p1", "project.update", "Only project admins can edit labels.");
    });

    it("renames and recolours", async () => {
        db.label.findFirst.mockResolvedValueOnce({ id: "l1" }).mockResolvedValueOnce(null);

        expect(await updateLabelAction("acme", "p1", "l1", { name: " Blocked ", color: "pink" })).toEqual({});
        expect(db.label.update).toHaveBeenCalledWith({
            where: { id: "l1" },
            data: { name: "Blocked", normalizedName: "blocked", color: "pink" },
        });
    });

    it("rejects an unknown colour and a name another label already has", async () => {
        db.label.findFirst.mockResolvedValue({ id: "l1" });
        expect(await updateLabelAction("acme", "p1", "l1", { name: "Bug", color: "rainbow" })).toEqual({
            error: "Pick one of the colours.",
        });
        db.label.findFirst.mockResolvedValueOnce({ id: "l1" }).mockResolvedValueOnce({ id: "l2" });
        expect(await updateLabelAction("acme", "p1", "l1", { name: "Bug", color: "red" })).toEqual({
            error: "There's already a label called “Bug”.",
        });
    });

    it("deletes only within the project", async () => {
        db.label.deleteMany.mockResolvedValue({ count: 1 });
        expect(await deleteLabelAction("acme", "p1", "l1")).toEqual({});
        expect(db.label.deleteMany).toHaveBeenCalledWith({ where: { id: "l1", projectId: "p1" } });

        db.label.deleteMany.mockResolvedValue({ count: 0 });
        expect(await deleteLabelAction("acme", "p1", "nope")).toEqual({ error: "That label no longer exists." });
    });
});
