/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { CommentsSection } from "./comment-section";
import { DeleteAttachmentButton } from "./delete-attachment-button";

const me = { id: "u1", name: "Maya Chen", email: "maya@x.com", image: null };
const ada = { id: "u2", name: "Ada Lovelace", email: "ada@x.com", image: null };

function comment(id: string, author = me) {
    const at = new Date("2026-10-01T10:00:00Z");
    return { id, content: `Comment ${id}`, createdAt: at, updatedAt: at, author };
}

function renderComments(props: Partial<React.ComponentProps<typeof CommentsSection>> = {}) {
    const deleteComment = jest.fn().mockResolvedValue(undefined);
    render(
        <CommentsSection
            form={null}
            currentUserId="u1"
            members={[me, ada]}
            comments={[comment("c1"), comment("c2", ada)]}
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

describe("deleting a comment", () => {
    it("asks in the app's dialog, never the browser's", async () => {
        const deleteComment = renderComments();

        fireEvent.click(screen.getByRole("button", { name: "Delete" }));
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
        const deleteComment = renderComments();

        fireEvent.click(screen.getByRole("button", { name: "Delete" }));
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
        expect(deleteComment).not.toHaveBeenCalled();
    });

    it("keeps the dialog open with the error when deleting fails", async () => {
        const deleteComment = jest.fn().mockRejectedValue(new Error("You can only delete your own comments."));
        renderComments({ deleteComment });

        fireEvent.click(screen.getByRole("button", { name: "Delete" }));
        const dialog = screen.getByRole("alertdialog");
        await act(async () => {
            fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
        });

        expect(within(dialog).getByRole("alert")).toHaveTextContent("You can only delete your own comments.");
    });

    it("lets moderators remove someone else's comment after confirming", async () => {
        const deleteComment = renderComments({ canModerate: true });

        fireEvent.click(screen.getByRole("button", { name: "Remove" }));
        const dialog = screen.getByRole("alertdialog", { name: "Remove comment?" });
        expect(dialog).toHaveTextContent("Ada Lovelace's comment will be removed for everyone.");

        await act(async () => {
            fireEvent.click(within(dialog).getByRole("button", { name: "Remove" }));
        });

        expect(deleteComment).toHaveBeenCalledWith("c2");
        expect(confirmSpy).not.toHaveBeenCalled();
    });

    it("offers no Remove button to people who can't moderate", () => {
        renderComments();
        expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
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
