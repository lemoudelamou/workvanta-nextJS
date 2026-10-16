/**
 * @jest-environment node
 */
import { prisma } from "@/lib/db/prisma";
import { createPasswordResetToken } from "@/lib/auth/reset-password";
import { sendPasswordResetEmail } from "@/lib/email/mailer";

import { forgotPassword, type ForgotPasswordState } from "@/app/(auth)/password-forgotten/password-forgotten-actions";

// ---------- module mocks ----------
jest.mock("@/lib/db/prisma", () => ({
    prisma: { user: { findUnique: jest.fn() } },
}));
jest.mock("@/lib/auth/reset-password", () => ({
    createPasswordResetToken: jest.fn(),
}));
jest.mock("@/lib/email/mailer", () => ({
    sendPasswordResetEmail: jest.fn(),
}));

// ---------- typed handles ----------
const mockCreateToken = createPasswordResetToken as jest.Mock;
const mockSendEmail = sendPasswordResetEmail as jest.Mock;
const db = prisma as unknown as { user: { findUnique: jest.Mock } };

// ---------- helpers ----------
const INITIAL: ForgotPasswordState = { success: false, message: "" };
const GENERIC =
    "If an account exists for that email, a password reset link has been sent.";

function run(email?: string) {
    const fd = new FormData();
    if (email !== undefined) fd.append("email", email);
    return forgotPassword(INITIAL, fd);
}

const originalUrl = process.env.NEXT_PUBLIC_APP_URL;
let consoleError: jest.SpyInstance;

beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.workvanta.com";
    db.user.findUnique.mockResolvedValue({ id: "u1", email: "ada@x.com" });
    mockCreateToken.mockResolvedValue({ token: "tok123" });
    mockSendEmail.mockResolvedValue(undefined);
    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
    jest.clearAllMocks();
    consoleError.mockRestore();
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = originalUrl;
});

// ---------- tests ----------
describe("forgotPassword – input validation", () => {
    it.each([
        ["a missing email field", undefined],
        ["an empty email", ""],
        ["a whitespace-only email", "   "],
    ])("returns an error for %s without touching the database", async (_label, email) => {
        const result = await run(email);

        expect(result).toEqual({
            success: false,
            message: "Please enter your email address.",
        });
        expect(db.user.findUnique).not.toHaveBeenCalled();
        expect(mockCreateToken).not.toHaveBeenCalled();
        expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("trims and lowercases the email before looking it up", async () => {
        await run("  Ada@X.COM  ");

        expect(db.user.findUnique).toHaveBeenCalledWith({
            where: { email: "ada@x.com" },
            select: { id: true, email: true },
        });
    });
});

describe("forgotPassword – unknown account", () => {
    beforeEach(() => {
        db.user.findUnique.mockResolvedValue(null);
    });

    it("returns the generic success message", async () => {
        await expect(run("nobody@x.com")).resolves.toEqual({
            success: true,
            message: GENERIC,
        });
    });

    it("creates no token and sends no email", async () => {
        await run("nobody@x.com");

        expect(mockCreateToken).not.toHaveBeenCalled();
        expect(mockSendEmail).not.toHaveBeenCalled();
    });
});

describe("forgotPassword – known account", () => {
    it("creates a token for the user", async () => {
        await run("ada@x.com");

        expect(mockCreateToken).toHaveBeenCalledTimes(1);
        expect(mockCreateToken).toHaveBeenCalledWith("u1");
    });

    it("emails the stored address with a reset link built from the app URL", async () => {
        await run("ADA@x.com");

        expect(mockSendEmail).toHaveBeenCalledTimes(1);
        expect(mockSendEmail).toHaveBeenCalledWith({
            email: "ada@x.com",
            resetUrl: "https://app.workvanta.com/reset-password?token=tok123",
        });
    });

    it("URL-encodes the token", async () => {
        mockCreateToken.mockResolvedValue({ token: "a+b/c=d&e" });

        await run("ada@x.com");

        expect(mockSendEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                resetUrl: `https://app.workvanta.com/reset-password?token=${encodeURIComponent("a+b/c=d&e")}`,
            }),
        );
    });

    it("falls back to localhost when NEXT_PUBLIC_APP_URL is not set", async () => {
        delete process.env.NEXT_PUBLIC_APP_URL;

        await run("ada@x.com");

        expect(mockSendEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                resetUrl: "http://localhost:3000/reset-password?token=tok123",
            }),
        );
    });

    it("creates the token before sending the email", async () => {
        await run("ada@x.com");

        expect(mockCreateToken.mock.invocationCallOrder[0]).toBeLessThan(
            mockSendEmail.mock.invocationCallOrder[0],
        );
    });

    it("returns the same generic message as for unknown accounts", async () => {
        await expect(run("ada@x.com")).resolves.toEqual({
            success: true,
            message: GENERIC,
        });
        expect(consoleError).not.toHaveBeenCalled();
    });

    it("never includes the token in the returned state", async () => {
        const result = await run("ada@x.com");

        expect(JSON.stringify(result)).not.toContain("tok123");
    });
});

describe("forgotPassword – failures", () => {
    it("logs and returns an error when the email cannot be sent", async () => {
        const error = new Error("smtp down");
        mockSendEmail.mockRejectedValue(error);

        const result = await run("ada@x.com");

        expect(result).toEqual({
            success: false,
            message:
                "We couldn't send the password reset email right now. Please try again.",
        });
        expect(consoleError).toHaveBeenCalledWith(
            "Failed to send password reset email:",
            error,
        );
    });

    it("propagates errors from the user lookup", async () => {
        const error = new Error("db down");
        db.user.findUnique.mockRejectedValue(error);

        await expect(run("ada@x.com")).rejects.toBe(error);
        expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("propagates errors from token creation without sending an email", async () => {
        const error = new Error("token failed");
        mockCreateToken.mockRejectedValue(error);

        await expect(run("ada@x.com")).rejects.toBe(error);
        expect(mockSendEmail).not.toHaveBeenCalled();
    });
});