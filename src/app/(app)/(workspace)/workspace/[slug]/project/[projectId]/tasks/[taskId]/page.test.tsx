/**
 * @jest-environment jsdom
 */
import { render, screen, within, fireEvent } from "@testing-library/react";

import TaskPage from "./page";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listProjectAudience, requireProjectAccess } from "@/lib/auth/members";
import { canEditTasks } from "@/lib/auth/task_permission";
import { prisma } from "@/lib/db/prisma";
import {
    createCommentAction,
    deleteCommentAction,
    updateCommentAction,
    updateTaskAction,
    deleteTaskAction,
    uploadAttachmentAction,
    deleteAttachmentAction,
} from "./task-actions";

// ---------- module mocks ----------
jest.mock("next/navigation", () => ({
    notFound: jest.fn(() => {
        throw new Error("NEXT_NOT_FOUND");
    }),
    redirect: jest.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    }),
}));
jest.mock("next/image", () => ({
    __esModule: true,
    default: ({ src, alt }: any) => <img src={src} alt={alt} />,
}));
jest.mock("lucide-react", () => ({
    MessageSquare: () => null,
    Paperclip: () => null,
    Pencil: () => null,
    TriangleAlert: () => null,
}));

jest.mock("@/lib/auth/session", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/auth/members", () => ({
    requireProjectAccess: jest.fn(),
    listProjectAudience: jest.fn(),
}));
jest.mock("@/components/ui/AccessDenied", () => ({
    AccessDeniedNotice: ({ message }: any) => (
        <div data-testid="access-denied">{message}</div>
    ),
}));
jest.mock("@/lib/auth/task_permission", () => ({ canEditTasks: jest.fn() }));
jest.mock("@/lib/db/prisma", () => ({
    prisma: {
        task: { findFirst: jest.fn() },
        workspaceMember: { findMany: jest.fn() },
    },
}));

jest.mock("@/app/style/button-style", () => ({ buttonStyles: () => "btn" }));
jest.mock("@/app/style/ui-tokens", () => ({
    fieldClass: "field",
    NEUTRAL_DOT: "bg-neutral",
}));
jest.mock("@/components/ui/PageBody", () => ({
    PageBody: ({ children }: any) => <main>{children}</main>,
}));
jest.mock("@/components/ui/BreadCrumb", () => ({
    Breadcrumb: ({ items }: any) => (
        <nav data-testid="breadcrumb">
            {items.map((i: any) => `${i.label}|${i.href ?? ""}`).join(" > ")}
        </nav>
    ),
}));

jest.mock("./components/comment-form", () => ({
    CommentForm: ({ action, members }: any) => (
        <button data-testid="comment-form" onClick={() => action()}>
            {members.length} mentionable
        </button>
    ),
}));
jest.mock("./components/comment-section", () => ({
    CommentsSection: ({
                          form,
                          comments,
                          currentUserId,
                          members,
                          deleteComment,
                          updateComment,
                          totalCount,
                          showAllHref,
                      }: any) => (
        <div
            data-testid="comments"
            data-user={currentUserId}
            data-count={comments.length}
            data-total={totalCount}
            data-href={showAllHref}
            data-order={comments.map((c: any) => c.id).join(",")}
            data-members={members.length}
        >
            {form}
            <button data-testid="delete-comment" onClick={() => deleteComment("c1")} />
            <button data-testid="update-comment" onClick={() => updateComment("c1")} />
        </div>
    ),
}));
jest.mock("./components/subtasks-section", () => ({
    SubtasksSection: ({ taskId, subtasks, slug, projectId }: any) => (
        <div
            data-testid="subtasks"
            data-task={taskId}
            data-count={subtasks.length}
            data-slug={slug}
            data-project={projectId}
        />
    ),
}));
jest.mock("./components/activity-section", () => ({
    ActivitySection: ({ activities, totalCount, showAllHref }: any) => (
        <div
            data-testid="activity"
            data-count={activities.length}
            data-total={totalCount}
            data-href={showAllHref}
        />
    ),
}));
jest.mock("./components/attachement-upload", () => ({
    AttachmentUpload: ({ action }: any) => (
        <button data-testid="attachment-upload" onClick={() => action()} />
    ),
}));
jest.mock("./components/delete-attachment-button", () => ({
    DeleteAttachmentButton: ({ action }: any) => (
        <button data-testid="delete-attachment" onClick={() => action()} />
    ),
}));
jest.mock("./components/delete-task-button", () => ({
    DeleteTaskConfirmation: ({ action }: any) => (
        <button data-testid="delete-task" onClick={() => action()} />
    ),
}));
jest.mock("./task-actions", () => ({
    createCommentAction: jest.fn(),
    deleteCommentAction: jest.fn(),
    updateCommentAction: jest.fn(),
    updateTaskAction: jest.fn(),
    deleteTaskAction: jest.fn(),
    uploadAttachmentAction: jest.fn(),
    deleteAttachmentAction: jest.fn(),
}));

// ---------- typed handles ----------
const mockNotFound = notFound as unknown as jest.Mock;
const mockRedirect = redirect as unknown as jest.Mock;
const mockGetSession = getSession as jest.Mock;
const mockRequireProjectAccess = requireProjectAccess as jest.Mock;
const mockListProjectAudience = listProjectAudience as jest.Mock;
const mockCanEditTasks = canEditTasks as jest.Mock;
const db = prisma as unknown as {
    task: { findFirst: jest.Mock };
    workspaceMember: { findMany: jest.Mock };
};
const actions = {
    createComment: createCommentAction as unknown as jest.Mock,
    deleteComment: deleteCommentAction as unknown as jest.Mock,
    updateComment: updateCommentAction as unknown as jest.Mock,
    deleteTask: deleteTaskAction as unknown as jest.Mock,
    uploadAttachment: uploadAttachmentAction as unknown as jest.Mock,
    deleteAttachment: deleteAttachmentAction as unknown as jest.Mock,
};

// ---------- helpers ----------
const NOW = new Date("2026-10-16T12:00:00Z");

const ada = { id: "u2", name: "Ada Lovelace", email: "ada@x.com", image: null };
const bob = { id: "u3", name: null, email: "bob@x.com", image: null };

function makeTask(overrides: Record<string, any> = {}) {
    const task = {
        id: "t1",
        title: "Ship it",
        description: "Line one\nLine two",
        status: "IN_PROGRESS",
        priority: "HIGH",
        dueDate: new Date("2026-10-20T12:00:00Z"),
        createdAt: new Date("2026-09-01T12:00:00Z"),
        assigneeId: null,
        assignee: null,
        creator: ada,
        project: { workspaceId: "w1", workspace: { name: "Acme Inc" } },
        subtasks: [],
        comments: [],
        attachments: [],
        activities: [],
        ...overrides,
    };
    return {
        ...task,
        _count: {
            comments: task.comments.length,
            activities: task.activities.length,
            ...overrides._count,
        },
    };
}

async function renderPage(query: { comments?: string; activity?: string } = {}) {
    const ui = await TaskPage({
        params: Promise.resolve({ slug: "acme", projectId: "p1", taskId: "t1" }),
        searchParams: Promise.resolve(query),
    });
    return render(ui);
}

beforeEach(() => {
    // Fake only Date so the awaited mocks still resolve
    jest.useFakeTimers({
        now: NOW,
        doNotFake: [
            "nextTick",
            "setImmediate",
            "clearImmediate",
            "setTimeout",
            "clearTimeout",
            "setInterval",
            "clearInterval",
            "queueMicrotask",
        ],
    });

    mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    mockRequireProjectAccess.mockResolvedValue({
        project: { id: "p1", name: "Apollo", workspaceId: "w1", visibility: "WORKSPACE" },
        effectiveRole: "VIEWER",
    });
    mockCanEditTasks.mockReturnValue(false);
    db.task.findFirst.mockResolvedValue(makeTask());
    mockListProjectAudience.mockResolvedValue([ada, bob]);
});

afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
});

// ---------- tests ----------
describe("TaskPage – guards", () => {
    it("redirects to /signin when there is no session user", async () => {
        mockGetSession.mockResolvedValue(null);

        await expect(renderPage()).rejects.toThrow("NEXT_REDIRECT:/signin");
        expect(mockRedirect).toHaveBeenCalledWith("/signin");
        expect(db.task.findFirst).not.toHaveBeenCalled();
    });

    it("calls notFound when the task does not exist", async () => {
        db.task.findFirst.mockResolvedValue(null);

        await expect(renderPage()).rejects.toThrow("NEXT_NOT_FOUND");
        expect(mockNotFound).toHaveBeenCalled();
    });

    it("checks project access before loading the task", async () => {
        mockRequireProjectAccess.mockRejectedValue(
            new Error("You do not have access to this project."),
        );

        await renderPage();

        expect(screen.getByTestId("access-denied")).toHaveTextContent(
            "You do not have access to this project.",
        );
        expect(db.task.findFirst).not.toHaveBeenCalled();
    });

    it("sends people to the project page when the project does not exist", async () => {
        mockRequireProjectAccess.mockRejectedValue(new Error("Project not found."));

        await expect(renderPage()).rejects.toThrow("NEXT_REDIRECT:/workspace/acme/project/p1");
        expect(mockNotFound).not.toHaveBeenCalled();
        expect(db.task.findFirst).not.toHaveBeenCalled();
    });

    it("scopes the task query to the workspace slug and the current user", async () => {
        await renderPage();

        expect(db.task.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    id: "t1",
                    projectId: "p1",
                    project: {
                        workspace: { is: { slug: "acme", members: { some: { userId: "u1" } } } },
                    },
                },
            }),
        );
        expect(mockRequireProjectAccess).toHaveBeenCalledWith("acme", "p1");
    });
});

describe("TaskPage – header", () => {
    it("renders the title, status and priority pills", async () => {
        await renderPage();

        expect(screen.getByRole("heading", { level: 1, name: "Ship it" })).toBeInTheDocument();
        expect(screen.getByText("In progress")).toBeInTheDocument();
        expect(screen.getByText("High priority")).toBeInTheDocument();
    });

    it("humanises unknown status and priority values", async () => {
        db.task.findFirst.mockResolvedValue(
            makeTask({ status: "ON_HOLD", priority: "CRITICAL_PLUS" }),
        );

        await renderPage();

        expect(screen.getByText("On hold")).toBeInTheDocument();
        expect(screen.getByText("Critical plus priority")).toBeInTheDocument();
    });

    it("renders the breadcrumb with workspace, project and task", async () => {
        await renderPage();

        expect(screen.getByTestId("breadcrumb")).toHaveTextContent(
            "Acme Inc|/workspace/acme > Apollo|/workspace/acme/project/p1 > Ship it|",
        );
    });

    it("renders the description when present", async () => {
        await renderPage();

        expect(screen.getByText(/Line one/)).toBeInTheDocument();
    });

    it("shows a plain empty description for read-only users", async () => {
        db.task.findFirst.mockResolvedValue(makeTask({ description: null }));

        await renderPage();

        expect(screen.getByText(/No description yet\./)).not.toHaveTextContent("edit panel");
    });

    it("hints at the edit panel for editors", async () => {
        mockCanEditTasks.mockReturnValue(true);
        db.task.findFirst.mockResolvedValue(makeTask({ description: null }));

        await renderPage();

        expect(screen.getByText(/No description yet\./)).toHaveTextContent(
            "Add one from the edit panel.",
        );
    });
});

describe("TaskPage – meta cells", () => {
    it("shows the assignee name with initials when there is no image", async () => {
        db.task.findFirst.mockResolvedValue(makeTask({ assignee: ada }));

        const { container } = await renderPage();

        expect(screen.getByText("AL")).toBeInTheDocument();
        expect(screen.getAllByText("Ada Lovelace").length).toBeGreaterThan(0);
        expect(container.querySelector("img")).toBeNull();
    });

    it("falls back to the email and email initials when the assignee has no name", async () => {
        db.task.findFirst.mockResolvedValue(makeTask({ assignee: bob }));

        await renderPage();

        expect(screen.getByText("BO")).toBeInTheDocument();
        expect(screen.getByText("bob@x.com")).toBeInTheDocument();
    });

    it("uses the first two letters for single-word names", async () => {
        db.task.findFirst.mockResolvedValue(
            makeTask({ assignee: { ...ada, name: "Grace" } }),
        );

        await renderPage();

        expect(screen.getByText("GR")).toBeInTheDocument();
    });

    it("renders the avatar image when the assignee has one", async () => {
        db.task.findFirst.mockResolvedValue(
            makeTask({ assignee: { ...ada, image: "https://cdn.x/ada.png" } }),
        );

        const { container } = await renderPage();

        expect(container.querySelector("img")).toHaveAttribute("src", "https://cdn.x/ada.png");
        expect(screen.queryByText("AL")).not.toBeInTheDocument();
    });

    it("shows Unassigned when there is no assignee", async () => {
        await renderPage();

        expect(screen.getByText("Unassigned")).toBeInTheDocument();
    });

    it("shows the creator, or Unknown when missing", async () => {
        await renderPage();
        expect(screen.getAllByText("Ada Lovelace").length).toBeGreaterThan(0);
    });

    it("shows Unknown when the creator is missing", async () => {
        db.task.findFirst.mockResolvedValue(makeTask({ creator: null }));

        await renderPage();

        expect(screen.getByText("Unknown")).toBeInTheDocument();
    });

    it("formats the created date", async () => {
        await renderPage();

        expect(screen.getByText("Sep 1, 2026")).toBeInTheDocument();
    });

    it("shows the due date without an overdue marker when in the future", async () => {
        await renderPage();

        const due = screen.getByText(/Oct 20, 2026/);
        expect(due).not.toHaveTextContent("overdue");
    });

    it("marks past-due open tasks as overdue", async () => {
        db.task.findFirst.mockResolvedValue(
            makeTask({ dueDate: new Date("2026-10-10T12:00:00Z") }),
        );

        await renderPage();

        const due = screen.getByText(/Oct 10, 2026/);
        expect(due).toHaveTextContent("(overdue)");
        expect(due).toHaveClass("text-rose-600");
    });

    it("never marks DONE tasks as overdue", async () => {
        db.task.findFirst.mockResolvedValue(
            makeTask({ status: "DONE", dueDate: new Date("2026-10-10T12:00:00Z") }),
        );

        await renderPage();

        expect(screen.getByText(/Oct 10, 2026/)).not.toHaveTextContent("overdue");
    });

    it("shows No due date when the task has none", async () => {
        db.task.findFirst.mockResolvedValue(makeTask({ dueDate: null }));

        await renderPage();

        expect(screen.getByText("No due date")).toBeInTheDocument();
    });
});

describe("TaskPage – attachments", () => {
    const attachment = (id: string, filename: string) => ({
        id,
        filename,
        url: `https://files.x/${filename}`,
        createdAt: new Date("2026-10-01T12:00:00Z"),
    });

    it("shows the empty state with a plural count", async () => {
        await renderPage();

        expect(screen.getByText("0 files attached")).toBeInTheDocument();
        expect(screen.getByText("No attachments yet.")).toBeInTheDocument();
    });

    it("uses the singular label for one file", async () => {
        db.task.findFirst.mockResolvedValue(
            makeTask({ attachments: [attachment("a1", "spec.pdf")] }),
        );

        await renderPage();

        expect(screen.getByText("1 file attached")).toBeInTheDocument();
    });

    it("links attachments through the access-checked route, never the raw file URL", async () => {
        db.task.findFirst.mockResolvedValue(
            makeTask({ attachments: [attachment("a1", "spec.pdf"), attachment("a2", "logo.png")] }),
        );

        await renderPage();

        const link = screen.getByRole("link", { name: "spec.pdf" });
        expect(link).toHaveAttribute("href", "/api/attachments/a1");
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute("rel", "noreferrer");
        expect(screen.getByText("2 files attached")).toBeInTheDocument();
        expect(screen.getAllByText("Added Oct 1, 2026")).toHaveLength(2);
    });

    it("hides delete and upload controls for read-only users", async () => {
        db.task.findFirst.mockResolvedValue(
            makeTask({ attachments: [attachment("a1", "spec.pdf")] }),
        );

        await renderPage();

        expect(screen.queryByTestId("delete-attachment")).not.toBeInTheDocument();
        expect(screen.queryByTestId("attachment-upload")).not.toBeInTheDocument();
    });

    it("binds upload and delete actions for editors", async () => {
        mockCanEditTasks.mockReturnValue(true);
        db.task.findFirst.mockResolvedValue(
            makeTask({ attachments: [attachment("a1", "spec.pdf")] }),
        );

        await renderPage();
        fireEvent.click(screen.getByTestId("attachment-upload"));
        fireEvent.click(screen.getByTestId("delete-attachment"));

        expect(actions.uploadAttachment).toHaveBeenCalledWith("acme", "p1", "t1");
        expect(actions.deleteAttachment).toHaveBeenCalledWith("acme", "p1", "t1", "a1");
    });
});

describe("TaskPage – child sections", () => {
    it("passes subtasks, activities and comments to their sections", async () => {
        db.task.findFirst.mockResolvedValue(
            makeTask({
                subtasks: [{ id: "s1" }, { id: "s2" }],
                activities: [{ id: "act1" }],
                comments: [{ id: "c1" }, { id: "c2" }, { id: "c3" }],
            }),
        );

        await renderPage();

        const subtasks = screen.getByTestId("subtasks");
        expect(subtasks).toHaveAttribute("data-task", "t1");
        expect(subtasks).toHaveAttribute("data-count", "2");
        expect(subtasks).toHaveAttribute("data-slug", "acme");
        expect(subtasks).toHaveAttribute("data-project", "p1");
        expect(screen.getByTestId("activity")).toHaveAttribute("data-count", "1");
        expect(screen.getByTestId("comments")).toHaveAttribute("data-count", "3");
    });

    it("gives the comments section the current user and workspace members", async () => {
        await renderPage();

        const comments = screen.getByTestId("comments");
        expect(comments).toHaveAttribute("data-user", "u1");
        expect(comments).toHaveAttribute("data-members", "2");
        expect(within(comments).getByTestId("comment-form")).toHaveTextContent(
            "2 mentionable",
        );
    });

    it("only offers people who can open the project for mentions and assignment", async () => {
        await renderPage();

        expect(mockListProjectAudience).toHaveBeenCalledWith(
            expect.objectContaining({ id: "p1", workspaceId: "w1" }),
        );
    });

    it("binds the comment actions to slug, project and task", async () => {
        await renderPage();

        fireEvent.click(screen.getByTestId("comment-form"));
        fireEvent.click(screen.getByTestId("delete-comment"));
        fireEvent.click(screen.getByTestId("update-comment"));

        expect(actions.createComment).toHaveBeenCalledWith("acme", "p1", "t1");
        expect(actions.deleteComment).toHaveBeenCalledWith("acme", "p1", "t1", "c1");
        expect(actions.updateComment).toHaveBeenCalledWith("acme", "p1", "t1", "c1");
    });
});

describe("TaskPage – edit panel and danger zone", () => {
    it("hides the edit panel and delete section for read-only users", async () => {
        await renderPage();

        expect(screen.queryByText("Edit task")).not.toBeInTheDocument();
        expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
        expect(screen.queryByText("Delete this task")).not.toBeInTheDocument();
        expect(screen.queryByTestId("delete-task")).not.toBeInTheDocument();
    });

    it("renders the edit form prefilled with the task values", async () => {
        mockCanEditTasks.mockReturnValue(true);
        db.task.findFirst.mockResolvedValue(
            makeTask({ assigneeId: "u2", assignee: ada }),
        );

        await renderPage();

        expect(screen.getByLabelText("Title")).toHaveValue("Ship it");
        expect(screen.getByLabelText("Description")).toHaveValue("Line one\nLine two");
        expect(screen.getByLabelText("Status")).toHaveValue("IN_PROGRESS");
        expect(screen.getByLabelText("Priority")).toHaveValue("HIGH");
        expect(screen.getByLabelText("Assignee")).toHaveValue("u2");
        expect(screen.getByLabelText("Due date")).toHaveValue("2026-10-20");
        expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
    });

    it("offers every status and priority as an option", async () => {
        mockCanEditTasks.mockReturnValue(true);

        await renderPage();

        const status = within(screen.getByLabelText("Status"));
        expect(status.getAllByRole("option").map((o) => o.textContent)).toEqual([
            "To do",
            "In progress",
            "In review",
            "Done",
        ]);

        const priority = within(screen.getByLabelText("Priority"));
        expect(priority.getAllByRole("option").map((o) => o.textContent)).toEqual([
            "Urgent",
            "High",
            "Medium",
            "Low",
        ]);
    });

    it("lists Unassigned plus workspace members as assignee options", async () => {
        mockCanEditTasks.mockReturnValue(true);

        await renderPage();

        const options = within(screen.getByLabelText("Assignee")).getAllByRole("option");
        expect(options.map((o) => o.textContent)).toEqual([
            "Unassigned",
            "Ada Lovelace",
            "bob@x.com",
        ]);
    });

    it("defaults the assignee to Unassigned and due date to empty when unset", async () => {
        mockCanEditTasks.mockReturnValue(true);
        db.task.findFirst.mockResolvedValue(makeTask({ assigneeId: null, dueDate: null }));

        await renderPage();

        expect(screen.getByLabelText("Assignee")).toHaveValue("");
        expect(screen.getByLabelText("Due date")).toHaveValue("");
    });

    it("renders the delete section and binds the delete action", async () => {
        mockCanEditTasks.mockReturnValue(true);

        await renderPage();
        fireEvent.click(screen.getByTestId("delete-task"));

        expect(screen.getByText("Delete this task")).toBeInTheDocument();
        expect(actions.deleteTask).toHaveBeenCalledWith("acme", "p1", "t1");
    });
});

describe("TaskPage – long discussions", () => {
    const include = () => db.task.findFirst.mock.calls[0][0].include;

    it("loads only the newest 50 comments and 20 activity entries by default", async () => {
        await renderPage();

        expect(include().comments).toMatchObject({ orderBy: { createdAt: "desc" }, take: 50 });
        expect(include().activities).toMatchObject({ orderBy: { createdAt: "desc" }, take: 20 });
        expect(include()._count).toEqual({ select: { comments: true, activities: true } });
    });

    it("loads everything when asked", async () => {
        await renderPage({ comments: "all", activity: "all" });

        expect(include().comments).not.toHaveProperty("take");
        expect(include().activities).not.toHaveProperty("take");
    });

    it("shows comments oldest-first and passes the real totals", async () => {
        db.task.findFirst.mockResolvedValue(
            makeTask({
                comments: [{ id: "c3" }, { id: "c2" }],
                _count: { comments: 120, activities: 45 },
            }),
        );

        await renderPage();

        const comments = screen.getByTestId("comments");
        expect(comments).toHaveAttribute("data-order", "c2,c3");
        expect(comments).toHaveAttribute("data-total", "120");
        expect(comments).toHaveAttribute(
            "data-href",
            "/workspace/acme/project/p1/tasks/t1?comments=all",
        );
        expect(screen.getByTestId("activity")).toHaveAttribute("data-total", "45");
    });

    it("keeps the other list expanded when expanding one", async () => {
        await renderPage({ activity: "all" });

        expect(screen.getByTestId("comments")).toHaveAttribute(
            "data-href",
            "/workspace/acme/project/p1/tasks/t1?comments=all&activity=all",
        );
    });
});
