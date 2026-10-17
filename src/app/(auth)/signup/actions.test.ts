/**
 * @jest-environment node
 */
import { signup } from "./actions";
import { prisma } from "@/lib/db/prisma";
import { rateLimitByIp } from "@/lib/redis/rate-limit";

jest.mock("@/lib/db/prisma", () => ({
    prisma: { user: { findUnique: jest.fn(), create: jest.fn() } },
}));
jest.mock("bcryptjs", () => ({ __esModule: true, default: { hash: jest.fn().mockResolvedValue("hashed") } }));
jest.mock("@/lib/auth/email-verification", () => ({
    createEmailVerificationToken: jest.fn().mockResolvedValue({ token: "tok" }),
}));
jest.mock("@/lib/email/mailer", () => ({ sendEmailVerificationEmail: jest.fn() }));
jest.mock("@/lib/redis/rate-limit", () => ({ rateLimitByIp: jest.fn() }));

const db = prisma as unknown as { user: { findUnique: jest.Mock; create: jest.Mock } };
const limiter = rateLimitByIp as jest.Mock;
const run = () => signup("Ada", "ada@x.com", "Password1", "Password1");

beforeEach(() => {
    jest.clearAllMocks();
    limiter.mockResolvedValue({ success: true, limit: 5, remaining: 4, resetAt: 0, redisAvailable: true });
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockResolvedValue({ id: "u1", name: "Ada", email: "ada@x.com" });
});

describe("signup – rate limit", () => {
    it("creates the account while under the limit", async () => {
        expect(await run()).toEqual({ success: true, user: { id: "u1", name: "Ada", email: "ada@x.com" } });
        expect(limiter).toHaveBeenCalledWith("rate-limit:signup", { limit: 5, windowSeconds: 3600 });
    });

    it("refuses new accounts once a network has made too many", async () => {
        limiter.mockResolvedValue({ success: false, limit: 5, remaining: 0, resetAt: 0, redisAvailable: true });

        expect(await run()).toEqual({
            success: false,
            error: "Too many sign-ups from this network. Please try again later.",
        });
        expect(db.user.create).not.toHaveBeenCalled();
    });

    it("doesn't count invalid forms against the limit", async () => {
        await signup("Ada", "not-an-email", "Password1", "Password1");
        expect(limiter).not.toHaveBeenCalled();
    });
});
