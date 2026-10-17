import { pageTitle } from "./page-title";
import { projectTitle, taskTitle, workspaceTitle } from "./page-titles";
import { requireMembership } from "@/lib/auth/team";
import { requireProjectAccess } from "@/lib/auth/members";
import { prisma } from "@/lib/db/prisma";

jest.mock("@/lib/auth/team", () => ({ requireMembership: jest.fn() }));
jest.mock("@/lib/auth/members", () => ({ requireProjectAccess: jest.fn() }));
jest.mock("@/lib/db/prisma", () => ({ prisma: { task: { findFirst: jest.fn() } } }));

const membership = requireMembership as jest.Mock;
const projectAccess = requireProjectAccess as jest.Mock;
const findTask = prisma.task.findFirst as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("page titles", () => {
    it("puts the most specific part first", () => {
        expect(pageTitle("Settings")).toEqual({ title: "Settings · Workvanta" });
    });

    it("names the workspace, project and task for people who can open them", async () => {
        membership.mockResolvedValue({ workspace: { name: "Acme" } });
        projectAccess.mockResolvedValue({ project: { id: "p1", name: "Launch" } });
        findTask.mockResolvedValue({ title: "Write copy" });

        expect(await workspaceTitle("acme", "Team")).toEqual({ title: "Team · Acme · Workvanta" });
        expect(await projectTitle("acme", "p1")).toEqual({ title: "Launch · Workvanta" });
        expect(await taskTitle("acme", "p1", "t1")).toEqual({ title: "Write copy · Launch · Workvanta" });
        expect(findTask).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "t1", projectId: "p1" } }));
    });

    it("never shows a name to someone without access", async () => {
        projectAccess.mockRejectedValue(new Error("You do not have access to this project."));
        membership.mockRejectedValue(new Error("NEXT_REDIRECT"));

        expect(await projectTitle("acme", "secret")).toEqual({ title: "Workvanta" });
        expect(await taskTitle("acme", "secret", "t1")).toEqual({ title: "Workvanta" });
        expect(await workspaceTitle("acme")).toEqual({ title: "Workvanta" });
        expect(findTask).not.toHaveBeenCalled();
    });
});
