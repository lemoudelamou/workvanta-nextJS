/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { ActivityFeed, type FeedItem } from "./activity-feed";
import { DeleteAttachmentButton } from "./delete-attachment-button";

jest.mock("next/image", () => ({
    __esModule: true,
    default: (props: any) => <span data-testid="avatar-image" data-src={props.src} />,
}));

const me = { id: "u1", name: "Maya Chen", email: "maya@x.com", image: null };
const ada = { id: "u2", name: "Ada Lovelace", email: "ada@x.com", image: null };

const at = (minute: number) => new Date(`2026-10-01T10:${String(minute).padStart(2, "0")}:00Z`);

function comment(id: string, author = me, minute = 5): FeedItem {
    return { kind: "comment", id, content: `Comment ${id}`, createdAt: at(minute), updatedAt: at(minute), author };
}

function event(id: string, action: string, metadata: unknown = null, minute = 0): FeedItem {
    return { kind: "event", id, action, metadata, createdAt: at(minute), user: ada };
}

function renderFeed(props: Partial<React.ComponentProps<typeof ActivityFeed>> = {}) {
    const deleteComment = jest.fn().mockResolvedValue(undefined);
    render(
        <ActivityFeed
            items={[event("e1", "TASK_CREATED"), comment("c1"), comment("c2", ada, 9)]}
            commentCount={2}
            composer={<div data-testid="composer" />}
            currentUserId="u1"
            members={[me, ada]}
            deleteComment={deleteComment}
            updateComment={jest.fn()}
            {...props}
        />,
    );
    return deleteComment;
}

let confirmSpy: jest.SpyInstance;
beforeEach(() => {
    confirmSpy = jest.spyOn(window, "confirm").mockImplementation(() => true);
});
afterEach(() => confirmSpy.mockRestore());

describe("the activity stream", () => {
    it("shows comments and history together, with the comment box at the end", () => {
        renderFeed();

        expect(screen.getByRole("heading", { name: "Activity 2 comments" })).toBeInTheDocument();
        expect(screen.getByText("created this task")).toBeInTheDocument();
        expect(screen.getByText("Comment c1")).toBeInTheDocument();
        expect(screen.getByTestId("composer")).toBeInTheDocument();
    });

    it("filters to comments or history", () => {
        renderFeed();

        fireEvent.click(screen.getByRole("button", { name: "History" }));
        expect(screen.getByRole("button", { name: "History" })).toHaveAttribute("aria-pressed", "true");
        expect(screen.queryByText("Comment c1")).not.toBeInTheDocument();
        expect(screen.getByText("created this task")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Comments" }));
        expect(screen.getByText("Comment c1")).toBeInTheDocument();
        expect(screen.queryByText("created this task")).not.toBeInTheDocument();
    });

    it("shows status changes with their status names", () => {
        renderFeed({ items: [event("e1", "TASK_STATUS_CHANGED", { from: "TODO", to: "IN_REVIEW" })] });

        expect(screen.getByText(/moved this from/)).toHaveTextContent("Ada Lovelace moved this from To do to In review");
    });

    it("links to earlier activity only when some wasn't loaded", () => {
        renderFeed({ showEarlierHref: "/t?comments=all&activity=all" });
        expect(screen.getByRole("link", { name: "Show earlier activity" })).toHaveAttribute(
            "href",
            "/t?comments=all&activity=all",
        );
    });

    it("has no earlier link when everything is shown", () => {
        renderFeed();
        expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });

    it("renders @mentions as names", () => {
        renderFeed({
            items: [{ ...(comment("c1") as any), content: "Thanks @[Ada Lovelace](ada@x.com)!" }],
        });
        expect(screen.getByText("@Ada Lovelace")).toBeInTheDocument();
    });
});

describe("deleting a comment", () => {
    it("asks in the app's dialog, never the browser's", async () => {
        const deleteComment = renderFeed();

        fireEvent.click(screen.getByRole("button", { name: "Delete comment" }));
        const dialog = screen.getByRole("alertdialog", { name: "Delete comment?" });
        expect(deleteComment).not.toHaveBeenCalled();

        await act(async () => {
            fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
        });

        expect(deleteComment).toHaveBeenCalledWith("c1");
        expect(confirmSpy).not.toHaveBeenCalled();
        await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    });

    it("does nothing when cancelled", () => {
        const deleteComment = renderFeed();

        fireEvent.click(screen.getByRole("button", { name: "Delete comment" }));
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
        expect(deleteComment).not.toHaveBeenCalled();
    });

    it("keeps the dialog open with the error when deleting fails", async () => {
        const deleteComment = jest.fn().mockRejectedValue(new Error("You can only delete your own comments."));
        renderFeed({ deleteComment });

        fireEvent.click(screen.getByRole("button", { name: "Delete comment" }));
        const dialog = screen.getByRole("alertdialog");
        await act(async () => {
            fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
        });

        expect(within(dialog).getByRole("alert")).toHaveTextContent("You can only delete your own comments.");
    });

    it("lets moderators remove someone else's comment after confirming", async () => {
        const deleteComment = renderFeed({ canModerate: true });

        fireEvent.click(screen.getByRole("button", { name: "Remove comment" }));
        const dialog = screen.getByRole("alertdialog", { name: "Remove comment?" });
        expect(dialog).toHaveTextContent("Ada Lovelace's comment will be removed for everyone.");

        await act(async () => {
            fireEvent.click(within(dialog).getByRole("button", { name: "Remove" }));
        });

        expect(deleteComment).toHaveBeenCalledWith("c2");
        expect(confirmSpy).not.toHaveBeenCalled();
    });

    it("offers no Remove button to people who can't moderate", () => {
        renderFeed();
        expect(screen.queryByRole("button", { name: "Remove comment" })).not.toBeInTheDocument();
        // Only your own comment can be edited.
        expect(screen.getAllByRole("button", { name: "Edit comment" })).toHaveLength(1);
    });
});

describe("editing a comment", () => {
    it("saves the edited text", async () => {
        const updateComment = jest.fn().mockResolvedValue(undefined);
        renderFeed({ updateComment });

        fireEvent.click(screen.getByRole("button", { name: "Edit comment" }));
        fireEvent.change(screen.getByLabelText("Edit comment"), { target: { value: "  Updated  " } });
        await act(async () => {
            fireEvent.click(screen.getByRole("button", { name: "Save" }));
        });

        expect(updateComment).toHaveBeenCalledWith("c1", expect.any(FormData));
        expect((updateComment.mock.calls[0][1] as FormData).get("content")).toBe("Updated");
    });
});

describe("deleting an attachment", () => {
    it("names the file and deletes only after confirming", async () => {
        const action = jest.fn().mockResolvedValue(undefined);
        render(<DeleteAttachmentButton action={action} filename="spec.pdf" />);

        fireEvent.click(screen.getByRole("button", { name: "Delete spec.pdf" }));
        const dialog = screen.getByRole("alertdialog", { name: "Delete attachment?" });
        expect(dialog).toHaveTextContent("spec.pdf will be removed from this task for everyone.");
        expect(action).not.toHaveBeenCalled();

        await act(async () => {
            fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
        });

        expect(action).toHaveBeenCalledTimes(1);
        expect(confirmSpy).not.toHaveBeenCalled();
    });
});
