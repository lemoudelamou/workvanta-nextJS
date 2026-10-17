/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";

import HomePage from "./page";
import { getSession } from "@/lib/auth/session";

jest.mock("@/lib/auth/session", () => ({ getSession: jest.fn() }));
jest.mock("next/navigation", () => ({
    redirect: jest.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    }),
}));
jest.mock("next/link", () => ({
    __esModule: true,
    default: ({ href, children, ...rest }: any) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

const session = getSession as jest.Mock;

describe("HomePage", () => {
    it("sends signed-in people straight to their dashboard", async () => {
        session.mockResolvedValue({ user: { id: "u1" } });
        await expect(HomePage()).rejects.toThrow("NEXT_REDIRECT:/dashboard");
    });

    it("shows visitors what Workvanta is and how to start", async () => {
        session.mockResolvedValue(null);
        render(await HomePage());

        expect(screen.getByRole("heading", { level: 1, name: "Every project, every task, one clear view." })).toBeInTheDocument();
        expect(screen.getAllByRole("link", { name: /Get started/ })[0]).toHaveAttribute("href", "/signup");
        expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
        expect(screen.getByRole("heading", { level: 3, name: "See what's blocked" })).toBeInTheDocument();
    });
});
