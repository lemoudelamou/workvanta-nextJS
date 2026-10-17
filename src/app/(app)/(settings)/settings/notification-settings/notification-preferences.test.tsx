/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render, screen } from "@testing-library/react";

import NotificationPreferences from "./notification-preferences";
import { updateNotificationPreference } from "./actions";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "./options";

jest.mock("./actions", () => ({ updateNotificationPreference: jest.fn() }));
const mockUpdate = updateNotificationPreference as jest.Mock;

beforeEach(() => mockUpdate.mockReset());

describe("NotificationPreferences", () => {
    it("shows a labelled switch per type and channel", () => {
        render(<NotificationPreferences initial={{ ...DEFAULT_NOTIFICATION_PREFERENCES, emailComments: false }} />);

        expect(screen.getAllByRole("switch")).toHaveLength(6);
        expect(screen.getByRole("switch", { name: "Mentions: in app notifications" })).toHaveAttribute("aria-checked", "true");
        expect(screen.getByRole("switch", { name: "Comments on my tasks: email notifications" })).toHaveAttribute("aria-checked", "false");
    });

    it("saves a change right away", async () => {
        mockUpdate.mockResolvedValue({});
        render(<NotificationPreferences initial={DEFAULT_NOTIFICATION_PREFERENCES} />);

        const toggle = screen.getByRole("switch", { name: "Assigned to me: email notifications" });
        await act(async () => fireEvent.click(toggle));

        expect(mockUpdate).toHaveBeenCalledWith("emailTaskAssignments", false);
        expect(toggle).toHaveAttribute("aria-checked", "false");
    });

    it("puts the switch back and explains when saving fails", async () => {
        mockUpdate.mockResolvedValue({ error: "Please sign in again." });
        render(<NotificationPreferences initial={DEFAULT_NOTIFICATION_PREFERENCES} />);

        const toggle = screen.getByRole("switch", { name: "Mentions: email notifications" });
        await act(async () => fireEvent.click(toggle));

        expect(toggle).toHaveAttribute("aria-checked", "true");
        expect(screen.getByRole("alert")).toHaveTextContent("Please sign in again.");
    });
});
