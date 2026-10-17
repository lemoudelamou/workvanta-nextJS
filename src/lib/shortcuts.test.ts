import { goToHref, isCommandKey, SHORTCUTS } from "./shortcuts";

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

describe("isCommandKey", () => {
    const key = (mods: Partial<Record<"metaKey" | "ctrlKey" | "altKey", boolean>>) => ({ metaKey: false, ctrlKey: false, altKey: false, ...mods });

    it("treats ⌘ and Ctrl+key as commands, not shortcuts", () => {
        expect(isCommandKey(key({ metaKey: true }))).toBe(true);
        expect(isCommandKey(key({ ctrlKey: true }))).toBe(true);
    });

    it("lets through characters typed with Alt Gr or Option, like [ on a French keyboard", () => {
        expect(isCommandKey(key({ ctrlKey: true, altKey: true }))).toBe(false); // Alt Gr on Windows
        expect(isCommandKey(key({ altKey: true }))).toBe(false); // Option on a Mac
        expect(isCommandKey(key({}))).toBe(false);
    });
});
