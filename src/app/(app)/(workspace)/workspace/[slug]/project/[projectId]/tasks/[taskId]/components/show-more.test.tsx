/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";

import { ActivitySection } from "./activity-section";
import { CommentsSection } from "./comment-section";

const user = { id: "u1", name: "Ada", email: "ada@x.com", image: null };

function activity(id: string) {
    return {
        id,
        action: "TASK_CREATED",
        metadata: null,
        createdAt: new Date("2026-10-01T10:00:00Z"),
        user,
    };
}

function comment(id: string) {
    return {
        id,
        content: `Comment ${id}`,
        createdAt: new Date("2026-10-01T10:00:00Z"),
        updatedAt: new Date("2026-10-01T10:00:00Z"),
        author: user,
    };
}

const commentProps = {
    form: null,
    currentUserId: "u1",
    members: [user],
    deleteComment: jest.fn(),
    updateComment: jest.fn(),
};

describe("show more links", () => {
    it("offers older activity when some is hidden", () => {
        render(
            <ActivitySection
                activities={[activity("a1"), activity("a2")] as any}
                totalCount={25}
                showAllHref="/t?activity=all"
            />,
        );

        expect(screen.getByRole("link", { name: "Show 23 older changes" })).toHaveAttribute(
            "href",
            "/t?activity=all",
        );
    });

    it("has no link when everything is shown", () => {
        render(<ActivitySection activities={[activity("a1")] as any} totalCount={1} showAllHref="/x" />);

        expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });

    it("offers earlier comments and shows the real total", () => {
        render(
            <CommentsSection
                {...commentProps}
                comments={[comment("c1")]}
                totalCount={2}
                showAllHref="/t?comments=all"
            />,
        );

        expect(screen.getByRole("link", { name: "Show 1 earlier comment" })).toHaveAttribute(
            "href",
            "/t?comments=all",
        );
        expect(screen.getByText("2")).toBeInTheDocument();
    });
});
