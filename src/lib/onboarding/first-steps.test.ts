import { firstSteps, showFirstSteps } from "./first-steps";

const none = { hasWorkspace: false, hasTeammate: false, hasProject: false, hasTask: false };
const all = { hasWorkspace: true, hasTeammate: true, hasProject: true, hasTask: true };

describe("firstSteps", () => {
    it("starts everyone at creating a workspace", () => {
        const steps = firstSteps(none, { workspaceSlug: null, projectHref: null });

        expect(steps.map((s) => s.id)).toEqual(["workspace", "team", "project", "task"]);
        expect(steps.every((s) => !s.done)).toBe(true);
        // Nothing to invite into yet: every link leads to creating the workspace.
        expect(new Set(steps.map((s) => s.href))).toEqual(new Set(["/workspace/new"]));
    });

    it("points each step at the right place once there's a workspace and a project", () => {
        const steps = firstSteps(
            { ...none, hasWorkspace: true, hasProject: true },
            { workspaceSlug: "acme", projectHref: "/workspace/acme/project/p1" },
        );
        const byId = Object.fromEntries(steps.map((s) => [s.id, s]));

        expect(byId.workspace.done).toBe(true);
        expect(byId.team.href).toBe("/workspace/acme/team");
        expect(byId.project.href).toBe("/workspace/acme/project/new");
        expect(byId.task.href).toBe("/workspace/acme/project/p1");
        expect(byId.task.guide).toBe("/guide#tasks");
    });
});

describe("showFirstSteps", () => {
    it("shows while something is left, hides when done or dismissed", () => {
        const links = { workspaceSlug: "acme", projectHref: null };
        expect(showFirstSteps(firstSteps(none, links), false)).toBe(true);
        expect(showFirstSteps(firstSteps(all, links), false)).toBe(false);
        expect(showFirstSteps(firstSteps(none, links), true)).toBe(false);
    });
});
