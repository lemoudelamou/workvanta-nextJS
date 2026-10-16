import { safeCallbackUrl, withCallbackUrl } from "@/lib/auth/callback-url";

describe("safeCallbackUrl", () => {
    it.each(["/invite/abc123", "/workspace/acme/project/p1?tab=board", "/dashboard"])(
        "keeps same-site path %s",
        (url) => {
            expect(safeCallbackUrl(url)).toBe(url);
        },
    );

    it.each([
        "https://evil.com",
        "//evil.com",
        "/\\evil.com",
        "/foo\\bar",
        "javascript:alert(1)",
        "evil.com",
        "/x\nLocation: https://evil.com",
        "",
        null,
        undefined,
    ])("rejects unsafe value %p", (url) => {
        expect(safeCallbackUrl(url as string)).toBe("/dashboard");
    });

    it("never sends people back to the auth pages", () => {
        expect(safeCallbackUrl("/signin")).toBe("/dashboard");
        expect(safeCallbackUrl("/signup?x=1")).toBe("/dashboard");
        expect(safeCallbackUrl("/signin-help")).toBe("/signin-help");
    });

    it("uses the given fallback", () => {
        expect(safeCallbackUrl("https://evil.com", "")).toBe("");
    });
});

describe("withCallbackUrl", () => {
    it("appends an encoded callback", () => {
        expect(withCallbackUrl("/signin", "/invite/abc")).toBe(
            "/signin?callbackUrl=%2Finvite%2Fabc",
        );
        expect(withCallbackUrl("/signin?email=a%40b.com", "/invite/abc")).toBe(
            "/signin?email=a%40b.com&callbackUrl=%2Finvite%2Fabc",
        );
    });

    it("drops unsafe or missing callbacks", () => {
        expect(withCallbackUrl("/signin", "https://evil.com")).toBe("/signin");
        expect(withCallbackUrl("/signin", null)).toBe("/signin");
    });
});
