/**
 * @jest-environment node
 */
import { getSession } from "@/lib/auth/session";
import { requireProjectAccess } from "@/lib/auth/members";
import { prisma } from "@/lib/db/prisma";
import { cloudinary } from "@/lib/storage/cloudinary";

import { GET } from "./route";

jest.mock("@/lib/auth/session", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/auth/members", () => ({ requireProjectAccess: jest.fn() }));
jest.mock("@/lib/db/prisma", () => ({
    prisma: { attachment: { findUnique: jest.fn() } },
}));
jest.mock("@/lib/storage/cloudinary", () => ({
    cloudinary: { utils: { private_download_url: jest.fn(() => "https://api.cloudinary.com/signed") } },
}));

const mockGetSession = getSession as jest.Mock;
const mockAccess = requireProjectAccess as jest.Mock;
const mockFind = prisma.attachment.findUnique as unknown as jest.Mock;
const mockSign = cloudinary.utils.private_download_url as unknown as jest.Mock;

const PRIVATE_URL =
    "https://res.cloudinary.com/demo/image/authenticated/s--x--/v1/Workvanta/w1/tasks/t1/logo.png";

function attachment(url = PRIVATE_URL) {
    return {
        url,
        filename: "logo.png",
        task: { projectId: "p1", project: { workspace: { slug: "acme" } } },
    };
}

function call(id = "a1") {
    return GET(new Request(`http://localhost:3000/api/attachments/${id}`), {
        params: Promise.resolve({ attachmentId: id }),
    });
}

beforeEach(() => {
    mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    mockFind.mockResolvedValue(attachment());
    mockAccess.mockResolvedValue({});
});

afterEach(() => jest.clearAllMocks());

describe("GET /api/attachments/[id]", () => {
    it("sends signed-out visitors to sign in and back", async () => {
        mockGetSession.mockResolvedValue(null);

        const res = await call();

        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toBe(
            "http://localhost:3000/signin?callbackUrl=%2Fapi%2Fattachments%2Fa1",
        );
        expect(mockFind).not.toHaveBeenCalled();
    });

    it("returns 404 for a missing attachment", async () => {
        mockFind.mockResolvedValue(null);

        expect((await call()).status).toBe(404);
    });

    it("returns the same 404 when the user can't open the project", async () => {
        mockAccess.mockRejectedValue(new Error("You do not have access to this project."));

        const res = await call();

        expect(res.status).toBe(404);
        expect(mockAccess).toHaveBeenCalledWith("acme", "p1");
        expect(mockSign).not.toHaveBeenCalled();
    });

    it("redirects to a short-lived signed link for private files", async () => {
        const before = Math.floor(Date.now() / 1000);

        const res = await call();

        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toBe("https://api.cloudinary.com/signed");
        expect(res.headers.get("cache-control")).toBe("private, no-store");

        const [publicId, format, options] = mockSign.mock.calls[0];
        expect(publicId).toBe("Workvanta/w1/tasks/t1/logo");
        expect(format).toBe("png");
        expect(options).toMatchObject({ resource_type: "image", type: "authenticated" });
        expect(options.expires_at).toBeGreaterThanOrEqual(before + 300);
        expect(options.expires_at).toBeLessThanOrEqual(before + 301);
    });

    it("still opens older public uploads", async () => {
        const legacy = "https://res.cloudinary.com/demo/raw/upload/v1/Workvanta/notes.txt";
        mockFind.mockResolvedValue(attachment(legacy));

        const res = await call();

        expect(res.headers.get("location")).toBe(legacy);
        expect(mockSign).not.toHaveBeenCalled();
    });
});
