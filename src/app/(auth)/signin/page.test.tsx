/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";

import SigninPage from "./page";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

// ---------- module mocks ----------
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
jest.mock("@/lib/auth/session", () => ({ getSession: jest.fn() }));

jest.mock("./signin-form", () => ({
    __esModule: true,
    default: () => <div data-testid="signin-form" />,
}));
jest.mock("@/components/ui/WorkvantaPanel", () => ({
    __esModule: true,
    default: () => <aside data-testid="brand-panel" />,
}));
jest.mock("@/components/ui/WorkvantaBrand", () => ({
    __esModule: true,
    default: ({ className }: any) => <div data-testid="brand" data-class={className} />,
}));

// ---------- typed handles ----------
const mockRedirect = redirect as unknown as jest.Mock;
const mockGetSession = getSession as jest.Mock;

// ---------- helpers ----------
async function renderPage(searchParams: { callbackUrl?: string } = {}) {
    const ui = await SigninPage({ searchParams: Promise.resolve(searchParams) });
    return render(ui);
}

beforeEach(() => {
    mockGetSession.mockResolvedValue(null);
});

afterEach(() => {
    jest.clearAllMocks(); // keeps the throwing redirect implementation
});

// ---------- tests ----------
describe("SigninPage – guards", () => {
    it("redirects signed-in users to /dashboard", async () => {
        mockGetSession.mockResolvedValue({ user: { id: "u1" } });

        await expect(renderPage()).rejects.toThrow("NEXT_REDIRECT:/dashboard");
        expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
    });

    it("renders the form for signed-out users", async () => {
        await renderPage();

        expect(mockRedirect).not.toHaveBeenCalled();
        expect(screen.getByTestId("signin-form")).toBeInTheDocument();
    });

    it("does not redirect when the session has no user id", async () => {
        mockGetSession.mockResolvedValue({ user: {} });

        await renderPage();

        expect(mockRedirect).not.toHaveBeenCalled();
        expect(screen.getByTestId("signin-form")).toBeInTheDocument();
    });

    it("does not redirect when the session has no user", async () => {
        mockGetSession.mockResolvedValue({});

        await renderPage();

        expect(mockRedirect).not.toHaveBeenCalled();
    });
});

describe("SigninPage – content", () => {
    it("renders the welcome heading and intro", async () => {
        await renderPage();

        expect(
            screen.getByRole("heading", { level: 2, name: "Welcome back" }),
        ).toBeInTheDocument();
        expect(
            screen.getByText(/Sign in to your Workvanta workspace/),
        ).toBeInTheDocument();
    });

    it("renders the brand panel and the mobile-only brand", async () => {
        await renderPage();

        expect(screen.getByTestId("brand-panel")).toBeInTheDocument();
        expect(screen.getByTestId("brand").dataset.class).toContain("lg:hidden");
    });

    it("links to the signup page", async () => {
        await renderPage();

        expect(screen.getByText(/New to Workvanta\?/)).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute(
            "href",
            "/signup",
        );
    });
});

describe("SigninPage – callbackUrl", () => {
    it("sends signed-in users to a safe callbackUrl", async () => {
        mockGetSession.mockResolvedValue({ user: { id: "u1" } });

        await expect(renderPage({ callbackUrl: "/invite/abc" })).rejects.toThrow();
        expect(mockRedirect).toHaveBeenCalledWith("/invite/abc");
    });

    it("ignores an external callbackUrl", async () => {
        mockGetSession.mockResolvedValue({ user: { id: "u1" } });

        await expect(renderPage({ callbackUrl: "https://evil.com" })).rejects.toThrow();
        expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
    });

    it("keeps the callbackUrl on the link to /signup", async () => {
        await renderPage({ callbackUrl: "/invite/abc" });

        expect(
            document.querySelector('a[href="/signup?callbackUrl=%2Finvite%2Fabc"]'),
        ).not.toBeNull();
    });
});
