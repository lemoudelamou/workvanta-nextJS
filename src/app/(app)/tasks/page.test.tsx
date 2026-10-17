/**
 * @jest-environment jsdom
 */
import { render, screen, within } from "@testing-library/react";

import MyTasksPage from "./page";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

jest.mock("next/navigation", () => ({
    redirect: jest.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    }),
}));
jest.mock("@/lib/auth/session", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/db/prisma", () => ({
    prisma: { workspaceMember: { findMany: jest.fn() }, task: { findMany: jest.fn() } },
}));

const mockSession = getSession as jest.Mock;
const db = prisma as unknown as {
    workspaceMember: { findMany: jest.Mock };
    task: { findMany: jest.Mock };
};

function task(id: string, dueDate: string | null, overrides: Record<string, unknown> = {}) {
    return {
        id,
        title: `Task ${id}`,
        status: "TODO",
        priority: "MEDIUM",
        dueDate: dueDate ? new Date(`${dueDate}T23:59:59Z`) : null,
        project: { id: "p1", name: "Apollo", workspace: { slug: "acme", name: "Acme" } },
        ...overrides,
    };
}

async function renderPage(show?: string) {
    return render(await MyTasksPage({ searchParams: Promise.resolve({ show }) }));
}

beforeEach(() => {
    jest.useFakeTimers({ now: new Date("2026-10-16T10:00:00Z"), doNotFake: ["nextTick", "setImmediate", "queueMicrotask"] });
    mockSession.mockResolvedValue({ user: { id: "u1" } });
    db.workspaceMember.findMany.mockResolvedValue([{ workspaceId: "w1", role: "MEMBER" }]);
    db.task.findMany.mockResolvedValue([]);
});

afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
});

describe("MyTasksPage", () => {
    it("sends signed-out visitors to sign in", async () => {
        mockSession.mockResolvedValue(null);

        await expect(renderPage()).rejects.toThrow("NEXT_REDIRECT:/signin?callbackUrl=%2Ftasks");
    });

    it("shows an empty state when nothing is assigned", async () => {
        await renderPage();

        expect(screen.getByText("You're all caught up")).toBeInTheDocument();
    });

    it("skips the task query for users without workspaces", async () => {
        db.workspaceMember.findMany.mockResolvedValue([]);

        await renderPage();

        expect(db.task.findMany).not.toHaveBeenCalled();
    });

    it("groups tasks by due date and links to each task", async () => {
        db.task.findMany.mockResolvedValue([
            task("late", "2026-10-10"),
            task("soon", "2026-10-18"),
            task("someday", null),
        ]);

        await renderPage();

        const overdue = screen.getByRole("region", { name: "Overdue" });
        expect(within(overdue).getByText("Task late")).toBeInTheDocument();
        expect(screen.getByRole("region", { name: "Next 7 days" })).toHaveTextContent("Task soon");
        expect(screen.getByRole("region", { name: "No due date" })).toHaveTextContent("Task someday");
        expect(screen.queryByRole("region", { name: "Due today" })).not.toBeInTheDocument();

        expect(screen.getByRole("link", { name: /Task late/ })).toHaveAttribute(
            "href",
            "/workspace/acme/project/p1/tasks/late",
        );
        expect(screen.getByText("3 open tasks assigned to you across your workspaces.")).toBeInTheDocument();
    });

    it("hides completed tasks unless asked", async () => {
        await renderPage();
        expect(db.task.findMany.mock.calls[0][0].where.status).toEqual({ not: "DONE" });
        expect(screen.getByRole("link", { name: "Show completed" })).toHaveAttribute("href", "/tasks?show=all");

        jest.clearAllMocks();
        db.workspaceMember.findMany.mockResolvedValue([{ workspaceId: "w1", role: "MEMBER" }]);
        db.task.findMany.mockResolvedValue([]);
        mockSession.mockResolvedValue({ user: { id: "u1" } });

        await renderPage("all");
        expect(db.task.findMany.mock.calls[0][0].where).not.toHaveProperty("status");
    });
});
