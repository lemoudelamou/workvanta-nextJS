/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";

import type { ShellWorkspace } from "@/lib/navigation/shell-data";
import { buildPaletteItems, CommandPalette, filterPaletteItems } from "./CommandPalette";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));

const northwind: ShellWorkspace = {
    id: "w1",
    slug: "northwind",
    name: "Northwind Studio",
    role: "OWNER",
    canCreateProjects: true,
    memberCount: 3,
    projects: [
        { id: "p1", name: "Website relaunch", isPrivate: false, openTasks: 4 },
        { id: "p2", name: "Brand refresh", isPrivate: false, openTasks: 1 },
    ],
};
const acme: ShellWorkspace = {
    id: "w2",
    slug: "acme",
    name: "Acme",
    role: "GUEST",
    canCreateProjects: false,
    memberCount: 9,
    projects: [{ id: "p3", name: "Web shop", isPrivate: true, openTasks: 0 }],
};

beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
        this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
        this.removeAttribute("open");
    };
});
afterEach(() => mockPush.mockClear());

describe("buildPaletteItems / filterPaletteItems", () => {
    const items = buildPaletteItems([acme, northwind], northwind);

    it("lists the current workspace's projects first and offers creating only where allowed", () => {
        const projects = items.filter((i) => i.group === "Projects").map((i) => i.label);
        expect(projects).toEqual(["Website relaunch", "Brand refresh", "Web shop"]);
        expect(items.find((i) => i.id === "new-project")?.href).toBe("/workspace/northwind/project/new");

        const asGuest = buildPaletteItems([acme], acme);
        expect(asGuest.some((i) => i.id === "new-project")).toBe(false);
    });

    it("matches every word, ranks label prefixes first, and uses keywords", () => {
        expect(filterPaletteItems(items, "web").map((i) => i.label).slice(0, 2)).toEqual(["Website relaunch", "Web shop"]);
        expect(filterPaletteItems(items, "web acme").map((i) => i.label)).toEqual(["Web shop"]);
        expect(filterPaletteItems(items, "inbox").map((i) => i.label)).toEqual(["Notifications"]);
        expect(filterPaletteItems(items, "zzz")).toEqual([]);
    });
});

describe("CommandPalette", () => {
    function open() {
        render(<CommandPalette open onClose={jest.fn()} workspaces={[acme, northwind]} current={northwind} />);
        return screen.getByRole("combobox");
    }

    it("filters as you type and opens the highlighted result with Enter", () => {
        const input = open();

        fireEvent.change(input, { target: { value: "brand" } });
        expect(screen.getByRole("option", { name: /Brand refresh/ })).toHaveAttribute("aria-selected", "true");

        fireEvent.keyDown(input, { key: "Enter" });
        expect(mockPush).toHaveBeenCalledWith("/workspace/northwind/project/p2");
    });

    it("moves with the arrow keys and wraps around", () => {
        const input = open();
        fireEvent.change(input, { target: { value: "web" } });

        fireEvent.keyDown(input, { key: "ArrowDown" });
        expect(screen.getByRole("option", { name: /Web shop/ })).toHaveAttribute("aria-selected", "true");
        expect(input).toHaveAttribute("aria-activedescendant", screen.getByRole("option", { name: /Web shop/ }).id);

        fireEvent.keyDown(input, { key: "ArrowUp" });
        fireEvent.keyDown(input, { key: "ArrowUp" });
        expect(screen.getAllByRole("option").at(-1)).toHaveAttribute("aria-selected", "true");
    });

    it("says when nothing matches", () => {
        const input = open();
        fireEvent.change(input, { target: { value: "nothing here" } });
        expect(screen.getByText("Nothing matches “nothing here”.")).toBeInTheDocument();
    });
});
