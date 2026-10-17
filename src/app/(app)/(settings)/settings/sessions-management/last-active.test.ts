import { lastActiveLabel } from "./sessions-management";

jest.mock("@/lib/auth/session", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/db/prisma", () => ({ prisma: {} }));
jest.mock("./revoke-button", () => ({ __esModule: true, default: () => null }));

const now = new Date("2026-10-17T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);
const MIN = 60_000;

describe("lastActiveLabel", () => {
    it("reads naturally from seconds to days", () => {
        expect(lastActiveLabel(ago(30_000), now)).toBe("Active now");
        expect(lastActiveLabel(ago(5 * MIN), now)).toBe("Active 5 minutes ago");
        expect(lastActiveLabel(ago(60 * MIN), now)).toBe("Active 1 hour ago");
        expect(lastActiveLabel(ago(5 * 60 * MIN), now)).toBe("Active 5 hours ago");
        expect(lastActiveLabel(new Date("2026-10-12T09:00:00Z"), now)).toBe("Active Oct 12");
    });
});
