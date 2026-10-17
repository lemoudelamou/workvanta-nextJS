/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";

import InvitePage from "./page";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

jest.mock("next/link", () => ({
    __esModule: true,
    default: ({ href, children, ...rest }: any) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));
jest.mock("@/lib/auth/session", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/db/prisma", () => ({
    prisma: { invitation: { findUnique: jest.fn() }, user: { findUnique: jest.fn() } },
}));
jest.mock("@/app/(auth)/signin/actions", () => {
    const logout: any = jest.fn();
    logout.bind = jest.fn(() => jest.fn());
    return { logout };
});
jest.mock("@/app/invite/[token]/invitation-actions", () => {
    const accept: any = jest.fn();
    accept.bind = jest.fn(() => jest.fn());
    return { acceptInvitationAction: accept };
});

const db = prisma as unknown as { invitation: { findUnique: jest.Mock }; user: { findUnique: jest.Mock } };
const mockSession = getSession as jest.Mock;

const NOW = new Date("2026-10-17T12:00:00Z");

function invitation(overrides: Record<string, unknown> = {}) {
    return {
        email: "sam@x.com",
        role: "MEMBER",
        projectRole: null,
        acceptedAt: null,
        expiresAt: new Date("2026-10-23T12:00:00Z"),
        workspace: { id: "w1", name: "Northwind Studio", _count: { members: 5 } },
        project: null,
        ...overrides,
    };
}

async function renderPage(token = "tok") {
    return render(await InvitePage({ params: Promise.resolve({ token }) }));
}

beforeEach(() => {
    jest.useFakeTimers({ now: NOW, doNotFake: ["nextTick", "setImmediate", "queueMicrotask"] });
    db.invitation.findUnique.mockResolvedValue(invitation());
    db.user.findUnique.mockResolvedValue(null);
    mockSession.mockResolvedValue(null);
});

afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
});

describe("InvitePage", () => {
    it.each([
        [null, "This link doesn't work"],
        [invitation({ acceptedAt: NOW }), "Invitation already used"],
        [invitation({ expiresAt: new Date("2026-10-10T12:00:00Z") }), "This invitation has expired"],
    ])("explains an unusable invitation", async (value, heading) => {
        db.invitation.findUnique.mockResolvedValue(value);
        await renderPage();
        expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Go to Workvanta" })).toHaveAttribute("href", "/dashboard");
    });

    it("shows a signed-out visitor what they're invited to, then sign-up", async () => {
        await renderPage("abc");

        expect(screen.getByRole("heading", { name: "Northwind Studio" })).toBeInTheDocument();
        expect(screen.getByText("5 people already here")).toBeInTheDocument();
        expect(screen.getByText("Create projects and edit shared ones")).toBeInTheDocument();
        expect(screen.getByText("sam@x.com")).toBeInTheDocument();
        expect(screen.getByText("This invitation expires on October 23.")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Create account and join" })).toHaveAttribute(
            "href",
            "/signup?callbackUrl=%2Finvite%2Fabc&email=sam%40x.com",
        );
        expect(screen.getByRole("link", { name: "I already have an account" })).toHaveAttribute(
            "href",
            "/signin?callbackUrl=%2Finvite%2Fabc&email=sam%40x.com",
        );
    });

    it("sends people who already have an account to sign in", async () => {
        db.user.findUnique.mockResolvedValue({ id: "u1" });
        await renderPage("abc");
        expect(screen.getByRole("link", { name: "Sign in to accept" })).toHaveAttribute(
            "href",
            "/signin?callbackUrl=%2Finvite%2Fabc&email=sam%40x.com",
        );
        expect(screen.queryByRole("link", { name: "Create account and join" })).not.toBeInTheDocument();
    });

    it("shows the project and its role for project invitations", async () => {
        db.invitation.findUnique.mockResolvedValue(invitation({ role: "GUEST", project: { name: "Apollo" }, projectRole: "EDITOR" }));
        await renderPage();
        expect(screen.getByText("Apollo")).toBeInTheDocument();
        expect(screen.getByText("Editor: create and edit tasks")).toBeInTheDocument();
    });

    it("asks someone signed in with another email to switch accounts", async () => {
        mockSession.mockResolvedValue({ user: { id: "u2", email: "maya@x.com" } });
        await renderPage();
        expect(screen.getByText("maya@x.com")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Sign out and switch accounts" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /Accept/ })).not.toBeInTheDocument();
    });

    it("lets the invited person accept (email case doesn't matter)", async () => {
        mockSession.mockResolvedValue({ user: { id: "u3", email: "SAM@x.com" } });
        await renderPage();
        expect(screen.getByRole("button", { name: "Accept and join Northwind Studio" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Not now" })).toHaveAttribute("href", "/dashboard");
    });
});
