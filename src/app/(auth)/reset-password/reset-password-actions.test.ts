/**
 * @jest-environment node
 */
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db/prisma";
import {
    consumePasswordResetToken,
    getPasswordResetToken,
} from "@/lib/auth/reset-password";

import { resetPassword, type ResetPasswordState } from "@/app/(auth)/reset-password/reset-password-actions";

// ---------- module mocks ----------
jest.mock("bcryptjs", () => ({
    __esModule: true,
    default: { hash: jest.fn() },
}));
jest.mock("@/lib/auth/reset-password", () => ({
    getPasswordResetToken: jest.fn(),
    consumePasswordResetToken: jest.fn(),
}));
jest.mock("@/lib/db/prisma", () => ({
    prisma: {
        $transaction: jest.fn(),
        user: { update: jest.fn() },
        session: { deleteMany: jest.fn() },
        passwordResetToken: { deleteMany: jest.fn() },
    },
}));

// ---------- typed handles ----------
const mockHash = bcrypt.hash as unknown as jest.Mock;
const mockGetToken = getPasswordResetToken as jest.Mock;
const mockConsume = consumePasswordResetToken as jest.Mock;
const db = prisma as unknown as {
    $transaction: jest.Mock;
    user: { update: jest.Mock };
    session: { deleteMany: jest.Mock };
    passwordResetToken: { deleteMany: jest.Mock };
};

// ---------- helpers ----------
const INITIAL: ResetPasswordState = { success: false, message: "" };
const VALID_PASSWORD = "Abcdefgh1";

function makeFormData(values: Record<string, string> = {}) {
    const fd = new FormData();
    const defaults = {
        token: "tok123",
        password: VALID_PASSWORD,
        confirmPassword: VALID_PASSWORD,
    };
    Object.entries({ ...defaults, ...values }).forEach(([k, v]) => fd.append(k, v));
    return fd;
}

/** FormData with only the given fields (no defaults). */
function rawFormData(values: Record<string, string>) {
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => fd.append(k, v));
    return fd;
}

function run(values: Record<string, string> = {}) {
    return resetPassword(INITIAL, makeFormData(values));
}

beforeEach(() => {
    mockGetToken.mockResolvedValue({ userId: "u1" });
    mockConsume.mockResolvedValue({ count: 1 });
    mockHash.mockResolvedValue("hashed-pw");

    // Return sentinels so we can assert exactly what was passed to $transaction
    db.user.update.mockReturnValue("update-op");
    db.session.deleteMany.mockReturnValue("sessions-op");
    db.passwordResetToken.deleteMany.mockReturnValue("tokens-op");
    db.$transaction.mockResolvedValue([]);
});

afterEach(() => {
    jest.clearAllMocks();
});

// ---------- tests ----------
describe("resetPassword – input validation", () => {
    it("rejects a missing token before any other check", async () => {
        const result = await resetPassword(
            INITIAL,
            rawFormData({ password: "short", confirmPassword: "nope" }),
        );

        expect(result).toEqual({
            success: false,
            message: "This password reset link is invalid.",
        });
        expect(mockGetToken).not.toHaveBeenCalled();
    });

    it("rejects an empty token", async () => {
        const result = await run({ token: "" });

        expect(result).toEqual({
            success: false,
            message: "This password reset link is invalid.",
        });
    });

    it.each([
        ["shorter than 8 characters", "Abcde1", "Your password must be at least 8 characters long."],
        ["missing an uppercase letter", "abcdefgh1", "Your password must contain at least one uppercase letter."],
        ["missing a lowercase letter", "ABCDEFGH1", "Your password must contain at least one lowercase letter."],
    ])("rejects a password %s", async (_label, password, message) => {
        const result = await run({ password, confirmPassword: password });

        expect(result).toEqual({ success: false, message });
        expect(mockGetToken).not.toHaveBeenCalled();
        expect(mockHash).not.toHaveBeenCalled();
        expect(db.$transaction).not.toHaveBeenCalled();
    });

    it("treats a missing password as too short", async () => {
        const result = await resetPassword(INITIAL, rawFormData({ token: "tok123" }));

        expect(result.message).toBe("Your password must be at least 8 characters long.");
    });

    it("rejects mismatched passwords", async () => {
        const result = await run({ confirmPassword: "Different1A" });

        expect(result).toEqual({
            success: false,
            message: "The passwords do not match.",
        });
        expect(mockGetToken).not.toHaveBeenCalled();
    });

    it("reports password strength problems before a mismatch", async () => {
        const result = await run({ password: "short", confirmPassword: "other" });

        expect(result.message).toBe("Your password must be at least 8 characters long.");
    });

    it("accepts a password of exactly 8 characters", async () => {
        const result = await run({ password: "Abcdefgh", confirmPassword: "Abcdefgh" });

        expect(result.success).toBe(true);
    });

    it("does not require a digit or symbol", async () => {
        const result = await run({ password: "OnlyLetters", confirmPassword: "OnlyLetters" });

        expect(result.success).toBe(true);
    });
});

describe("resetPassword – token handling", () => {
    it("looks up the token from the form", async () => {
        await run({ token: "abc" });

        expect(mockGetToken).toHaveBeenCalledWith("abc");
    });

    it("returns an error and does nothing else when the token is invalid or expired", async () => {
        mockGetToken.mockResolvedValue(null);

        const result = await run();

        expect(result).toEqual({
            success: false,
            message: "This password reset link is invalid or has expired.",
        });
        expect(mockHash).not.toHaveBeenCalled();
        expect(mockConsume).not.toHaveBeenCalled();
        expect(db.$transaction).not.toHaveBeenCalled();
    });

    it.each([0, 2])(
        "returns an error when consuming the token affects %i rows (lost the race)",
        async (count) => {
            mockConsume.mockResolvedValue({ count });

            const result = await run();

            expect(result).toEqual({
                success: false,
                message: "This password reset link is invalid or has expired.",
            });
            expect(db.$transaction).not.toHaveBeenCalled();
            expect(db.user.update).not.toHaveBeenCalled();
        },
    );

    it("propagates errors from the token lookup", async () => {
        const error = new Error("db down");
        mockGetToken.mockRejectedValue(error);

        await expect(run()).rejects.toBe(error);
        expect(mockConsume).not.toHaveBeenCalled();
    });
});

describe("resetPassword – success", () => {
    it("hashes the password with cost 12 before consuming the token", async () => {
        await run();

        expect(mockHash).toHaveBeenCalledWith(VALID_PASSWORD, 12);
        expect(mockConsume).toHaveBeenCalledWith("tok123");
        expect(mockHash.mock.invocationCallOrder[0]).toBeLessThan(
            mockConsume.mock.invocationCallOrder[0],
        );
    });

    it("updates the user's password hash, never the plain password", async () => {
        await run();

        expect(db.user.update).toHaveBeenCalledWith({
            where: { id: "u1" },
            data: { passwordHash: "hashed-pw" },
        });
        expect(JSON.stringify(db.user.update.mock.calls)).not.toContain(VALID_PASSWORD);
    });

    it("signs the user out everywhere and clears all their reset tokens in one transaction", async () => {
        await run();

        expect(db.session.deleteMany).toHaveBeenCalledWith({ where: { userId: "u1" } });
        expect(db.passwordResetToken.deleteMany).toHaveBeenCalledWith({
            where: { userId: "u1" },
        });
        expect(db.$transaction).toHaveBeenCalledTimes(1);
        expect(db.$transaction).toHaveBeenCalledWith([
            "update-op",
            "sessions-op",
            "tokens-op",
        ]);
    });

    it("returns the success message", async () => {
        await expect(run()).resolves.toEqual({
            success: true,
            message:
                "Your password has been reset. You can now sign in with your new password.",
        });
    });
});

describe("resetPassword – failures after validation", () => {
    it("propagates a transaction failure (the token has already been consumed)", async () => {
        const error = new Error("tx failed");
        db.$transaction.mockRejectedValue(error);

        await expect(run()).rejects.toBe(error);
        expect(mockConsume).toHaveBeenCalledTimes(1);
    });

    it("propagates a hashing failure without consuming the token", async () => {
        const error = new Error("bcrypt failed");
        mockHash.mockRejectedValue(error);

        await expect(run()).rejects.toBe(error);
        expect(mockConsume).not.toHaveBeenCalled();
    });
});