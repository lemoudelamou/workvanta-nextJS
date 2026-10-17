/**
 * @jest-environment jsdom
 */
import { render, screen, within } from "@testing-library/react";

import GuidePage from "./page";
import { getSession } from "@/lib/auth/session";

jest.mock("@/lib/auth/session", () => ({ getSession: jest.fn().mockResolvedValue(null) }));
jest.mock("next/link", () => ({
    __esModule: true,
    default: ({ href, children, ...rest }: any) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

describe("GuidePage", () => {
    it("walks through every topic, with a contents list that links to each", async () => {
        render(await GuidePage());

        expect(screen.getByRole("heading", { level: 1, name: "Getting started with Workvanta" })).toBeInTheDocument();
        const contents = within(screen.getByRole("navigation", { name: "Guide contents" }));
        const links = contents.getAllByRole("link");
        expect(links.length).toBeGreaterThanOrEqual(10);
        for (const link of links) {
            const id = link.getAttribute("href")!.slice(1);
            expect(document.getElementById(id)).not.toBeNull();
        }
    });

    it("explains roles with the same wording as the app", async () => {
        render(await GuidePage());

        expect(screen.getByText(/Only projects they're invited to/)).toBeInTheDocument();
        expect(screen.getByText(/View and comment/)).toBeInTheDocument();
    });

    it("offers the dashboard to signed-in readers", async () => {
        (getSession as jest.Mock).mockResolvedValueOnce({ user: { id: "u1" } });
        render(await GuidePage());

        expect(screen.getByRole("link", { name: "Open dashboard" })).toHaveAttribute("href", "/dashboard");
    });
});
