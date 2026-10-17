import { goToHref, SHORTCUTS } from "./shortcuts";

describe("goToHref", () => {
    it("maps G-letters to pages, projects to the current workspace", () => {
        expect(goToHref("h", null)).toBe("/dashboard");
        expect(goToHref("W", null)).toBe("/workspace");
        expect(goToHref("p", "/workspace/acme")).toBe("/workspace/acme");
        expect(goToHref("p", null)).toBe("/workspace");
        expect(goToHref("x", null)).toBeNull();
    });
});

describe("SHORTCUTS", () => {
    it("lists every go-to letter, each once", () => {
        const goTo = SHORTCUTS.filter((s) => s.group === "Go to").map((s) => s.keys[1]);
        expect(goTo).toEqual(["H", "T", "N", "W", "P", "S"]);
    });
});
