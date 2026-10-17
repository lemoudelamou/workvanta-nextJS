import { parsePresets, PRESET_LABELS, PRESET_MAX, presetLabel, projectPresets } from "./label-colors";

describe("projectPresets", () => {
    it("uses the defaults until the project has its own list", () => {
        expect(projectPresets(null)).toBe(PRESET_LABELS);
        expect(projectPresets([{ name: "Backend", color: "teal" }])).toEqual([{ name: "Backend", color: "teal" }]);
    });

    it("falls back to the defaults if what's stored is broken", () => {
        expect(projectPresets("nonsense")).toBe(PRESET_LABELS);
    });

    it("can be an empty list: no suggestions", () => {
        expect(projectPresets([])).toEqual([]);
    });
});

describe("parsePresets", () => {
    it("tidies names", () => {
        expect(parsePresets([{ name: " Needs   review ", color: "amber" }])).toEqual({
            presets: [{ name: "Needs review", color: "amber" }],
        });
    });

    it("explains what's wrong", () => {
        expect(parsePresets([{ name: "", color: "red" }])).toEqual({ error: "Give every suggestion a name." });
        expect(parsePresets(Array.from({ length: PRESET_MAX + 1 }, (_, i) => ({ name: `L${i}`, color: "red" })))).toEqual({
            error: `Keep it to ${PRESET_MAX} suggestions.`,
        });
    });
});

describe("presetLabel", () => {
    it("matches names loosely, in the given list", () => {
        expect(presetLabel("  bug ")).toEqual({ name: "Bug", color: "red" });
        expect(presetLabel("bug", [{ name: "Bug", color: "pink" }])).toEqual({ name: "Bug", color: "pink" });
        expect(presetLabel("bug", [])).toBeUndefined();
    });
});
