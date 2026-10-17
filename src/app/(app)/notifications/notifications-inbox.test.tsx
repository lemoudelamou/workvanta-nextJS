/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render, screen, within } from "@testing-library/react";

import { NotificationsInbox } from "./notifications-inbox";
import { markAllNotificationsReadAction, markNotificationReadAction } from "./notifications-actions";
import type { NotificationView } from "@/lib/notifications/notification-feed";

jest.mock("./notifications-actions", () => ({
    markNotificationReadAction: jest.fn().mockResolvedValue(undefined),
    markAllNotificationsReadAction: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("next/link", () => ({
    __esModule: true,
    default: ({ href, children, onClick, ...rest }: any) => (
        <a href={href} onClick={(e) => { e.preventDefault(); onClick?.(e); }} {...rest}>
            {children}
        </a>
    ),
}));

function view(id: string, overrides: Partial<NotificationView> = {}): NotificationView {
    return {
        id,
        type: "TASK_COMMENTED",
        read: false,
        createdAt: "2026-10-17T10:00:00.000Z",
        timeLabel: "2 hours ago",
        group: "Today",
        actor: { name: "Daghar Mourad", email: "d@x.com", image: null },
        verb: "commented on",
        taskTitle: "Design pricing page",
        projectName: "Website relaunch",
        projectId: "p1",
        snippet: null,
        href: "/workspace/acme/project/p1/tasks/t1",
        ...overrides,
    };
}

const items = [
    view("n1", { type: "MENTION", verb: "mentioned you in", snippet: "Looks good!" }),
    view("n2"),
    view("n3", { read: true, group: "Earlier", type: "TASK_ASSIGNED", verb: "assigned you", taskTitle: "Logo" }),
];

describe("NotificationsInbox", () => {
    it("writes each notification as a sentence, grouped by day", () => {
        render(<NotificationsInbox initial={items} />);

        expect(screen.getByRole("link", { name: /Daghar Mourad mentioned you in Design pricing page/ })).toHaveAttribute(
            "href",
            "/workspace/acme/project/p1/tasks/t1",
        );
        expect(screen.getByText("Looks good!")).toBeInTheDocument();
        expect(within(screen.getByRole("region", { name: "Earlier" })).getByText("Logo")).toBeInTheDocument();
    });

    it("filters to unread or mentions", () => {
        render(<NotificationsInbox initial={items} />);

        fireEvent.click(screen.getByRole("button", { name: /^Unread/ }));
        expect(screen.getAllByRole("listitem")).toHaveLength(2);

        fireEvent.click(screen.getByRole("button", { name: /^Mentions/ }));
        expect(screen.getAllByRole("listitem")).toHaveLength(1);
    });

    it("marks one read from its button, and all at once", async () => {
        render(<NotificationsInbox initial={items} />);

        await act(async () => {
            fireEvent.click(screen.getAllByRole("button", { name: /Mark as read/ })[0]);
        });
        expect(markNotificationReadAction).toHaveBeenCalledWith("n1");
        expect(screen.getByRole("button", { name: /^Unread/ })).toHaveTextContent("1");

        await act(async () => {
            fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
        });
        expect(markAllNotificationsReadAction).toHaveBeenCalled();
        fireEvent.click(screen.getByRole("button", { name: /^Unread/ }));
        expect(screen.getByText("You're all caught up")).toBeInTheDocument();
    });

    it("marks a notification read when it's opened", async () => {
        render(<NotificationsInbox initial={items} />);
        await act(async () => {
            fireEvent.click(screen.getByRole("link", { name: /commented on/ }));
        });
        expect(markNotificationReadAction).toHaveBeenCalledWith("n2");
    });

    it("writes reminders with the task as the subject", () => {
        render(
            <NotificationsInbox
                initial={[
                    view("r1", { type: "TASK_DUE_SOON", actor: null, verb: "is due in 5 hours", taskTitle: "Ship v2" }),
                    view("r2", { type: "TASK_OVERDUE", actor: null, verb: "is overdue", taskTitle: "Fix login" }),
                ]}
            />,
        );

        expect(screen.getByRole("link", { name: /^Ship v2 is due in 5 hours/ })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /^Fix login is overdue/ })).toBeInTheDocument();
        expect(screen.queryByText("Someone")).not.toBeInTheDocument();
    });

    it("shows an empty state", () => {
        render(<NotificationsInbox initial={[]} />);
        expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
    });
});
