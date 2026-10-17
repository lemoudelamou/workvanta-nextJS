/**
 * @jest-environment node
 */
import { isAuthorizedCronRequest } from "./authorize";

const call = (authorization?: string) =>
    new Request("https://app.test/api/cron/due-dates", {
        headers: authorization ? { authorization } : {},
    });

afterEach(() => {
    delete process.env.CRON_SECRET;
});

describe("isAuthorizedCronRequest", () => {
    it("accepts only the configured secret", () => {
        process.env.CRON_SECRET = "s3cret";
        expect(isAuthorizedCronRequest(call("Bearer s3cret"))).toBe(true);
        expect(isAuthorizedCronRequest(call("Bearer nope"))).toBe(false);
        expect(isAuthorizedCronRequest(call())).toBe(false);
    });

    it("refuses everything when no secret is set", () => {
        expect(isAuthorizedCronRequest(call("Bearer "))).toBe(false);
        expect(isAuthorizedCronRequest(call("Bearer undefined"))).toBe(false);
    });
});
