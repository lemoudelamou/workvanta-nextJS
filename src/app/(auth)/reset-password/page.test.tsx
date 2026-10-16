/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";

import ResetPasswordPage from "./page";
import { getPasswordResetToken } from "@/lib/auth/reset-password";

// ---------- module mocks ----------
jest.mock("next/link", () => ({
    __esModule: true,
    default: ({ href, children, ...rest }: any) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));
jest.mock("@/lib/auth/reset-password", () => ({
    getPasswordResetToken: jest.fn(),
}));
jest.mock("./reset-password-form", () => ({
    __esModule: true,
    default: ({ token }: any) => <div data-testid="reset-form" data-token={token} />,
}));

// ---------- typed handles ----------
const mockGetToken = getPasswordResetToken as jest.Mock;

// ---------- helpers ----------
async function renderPage(searchParams: { token?: string } = {}) {
    const ui = await ResetPasswordPage({
        searchParams: Promise.resolve(searchParams),
    });
    return render(ui);
}

beforeEach(() => {
    mockGetToken.mockResolvedValue({ id: "rt1" });
});

afterEach(() => {
    jest.clearAllMocks();
});

// ---------- tests ----------
describe("ResetPasswordPage – missing token", () => {
    it("shows the invalid link error without looking up a token", async () => {
        await renderPage({});

        expect(
            screen.getByRole("heading", { level: 1, name: "Invalid reset link" }),
        ).toBeInTheDocument();
        expect(
            screen.getByText("This password reset link is missing its token."),
        ).toBeInTheDocument();
        expect(mockGetToken).not.toHaveBeenCalled();
        expect(screen.queryByTestId("reset-form")).not.toBeInTheDocument();
    });

    it("treats an empty token string as missing", async () => {
        await renderPage({ token: "" });

        expect(screen.getByText("Invalid reset link")).toBeInTheDocument();
        expect(mockGetToken).not.toHaveBeenCalled();
    });

    it("offers a link to request a new reset link", async () => {
        await renderPage({});

        expect(
            screen.getByRole("link", { name: "Request a new reset link" }),
        ).toHaveAttribute("href", "/password-forgotten");
    });
});

describe("ResetPasswordPage – invalid or expired token", () => {
    it("looks up the token from the query string", async () => {
        mockGetToken.mockResolvedValue(null);

        await renderPage({ token: "abc123" });

        expect(mockGetToken).toHaveBeenCalledTimes(1);
        expect(mockGetToken).toHaveBeenCalledWith("abc123");
    });

    it("shows the expired error when no matching token is found", async () => {
        mockGetToken.mockResolvedValue(null);

        await renderPage({ token: "abc123" });

        expect(
            screen.getByRole("heading", { level: 1, name: "Reset link expired" }),
        ).toBeInTheDocument();
        expect(
            screen.getByText(/invalid or has expired\. Please request a new one\./),
        ).toBeInTheDocument();
        expect(screen.queryByTestId("reset-form")).not.toBeInTheDocument();
    });

    it("offers a link to request a new reset link", async () => {
        mockGetToken.mockResolvedValue(null);

        await renderPage({ token: "abc123" });

        expect(
            screen.getByRole("link", { name: "Request a new reset link" }),
        ).toHaveAttribute("href", "/password-forgotten");
    });
});

describe("ResetPasswordPage – valid token", () => {
    it("renders the reset form with the token", async () => {
        await renderPage({ token: "abc123" });

        expect(screen.getByTestId("reset-form")).toHaveAttribute("data-token", "abc123");
    });

    it("does not render any error content", async () => {
        await renderPage({ token: "abc123" });

        expect(screen.queryByRole("heading")).not.toBeInTheDocument();
        expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });
});

describe("ResetPasswordPage – lookup failures", () => {
    it("propagates errors thrown by the token lookup", async () => {
        const error = new Error("db down");
        mockGetToken.mockRejectedValue(error);

        await expect(renderPage({ token: "abc123" })).rejects.toBe(error);
    });
});