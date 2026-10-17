/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";

import { ActionMenu, placeMenu } from "./ActionMenu";

jest.mock("next/link", () => ({
    __esModule: true,
    default: ({ href, children, ...rest }: any) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

const rect = (top: number, right: number, bottom = top + 32) => ({ top, bottom, right, left: right - 32, width: 32, height: 32 }) as DOMRect;
const menu = { width: 224, height: 120 };
const viewport = { width: 1280, height: 800 };

describe("placeMenu", () => {
    it("opens below the button, right edges lined up", () => {
        expect(placeMenu(rect(100, 900), menu, viewport)).toEqual({ top: 138, left: 676 });
    });

    it("opens above when there's no room below", () => {
        expect(placeMenu(rect(740, 900), menu, viewport)).toEqual({ top: 614, left: 676 });
    });

    it("stays inside the window near its left edge", () => {
        expect(placeMenu(rect(100, 100), menu, viewport).left).toBe(8);
    });
});

describe("ActionMenu", () => {
    it("draws the open menu outside any box that hides overflow", () => {
        const onSelect = jest.fn();
        render(
            <div data-testid="clipping-box" style={{ overflow: "hidden" }}>
                <ActionMenu label="Actions for Ada" items={[{ label: "Make owner", onSelect }]} />
            </div>,
        );

        fireEvent.click(screen.getByRole("button", { name: "Actions for Ada" }));
        const menuEl = screen.getByRole("menu", { name: "Actions for Ada" });

        expect(screen.getByTestId("clipping-box")).not.toContainElement(menuEl);
        expect(menuEl.parentElement).toBe(document.body);

        fireEvent.click(screen.getByRole("menuitem", { name: "Make owner" }));
        expect(onSelect).toHaveBeenCalled();
        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("closes on a click outside, but not on a click inside", () => {
        render(<ActionMenu label="Actions" items={[{ label: "Rename" }]} />);
        fireEvent.click(screen.getByRole("button", { name: "Actions" }));

        fireEvent.pointerDown(screen.getByRole("menu"));
        expect(screen.getByRole("menu")).toBeInTheDocument();

        fireEvent.pointerDown(document.body);
        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
});
