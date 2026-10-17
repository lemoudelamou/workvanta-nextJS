import { personColor } from "./person-color";

describe("personColor", () => {
    it("is stable per person and ignores case and spaces", () => {
        expect(personColor("Maya@Example.com ")).toBe(personColor("maya@example.com"));
    });

    it("spreads different people across the palette", () => {
        const colors = new Set(
            ["ana@x.io", "ben@x.io", "cleo@x.io", "dev@x.io", "eli@x.io", "fay@x.io"].map(personColor),
        );
        expect(colors.size).toBeGreaterThan(2);
    });

    it("always returns classes for light and dark mode", () => {
        for (const key of ["", null, undefined, "x"]) {
            expect(personColor(key)).toMatch(/^bg-\[#.+ dark:text-/);
        }
    });
});
