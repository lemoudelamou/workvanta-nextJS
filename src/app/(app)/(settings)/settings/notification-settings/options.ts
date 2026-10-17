/**
 * The notification types people can control, and the preference columns
 * behind them (see lib/notifications/create-notification.ts, which checks
 * these before creating an in-app notification or sending an email).
 * Invitations are left out: invite emails go to an address, not an account.
 */
export const NOTIFICATION_OPTIONS = [
    {
        key: "TaskAssignments",
        label: "Assigned to me",
        description: "Someone assigns you a task.",
    },
    {
        key: "Comments",
        label: "Comments on my tasks",
        description: "New comments on tasks you created or are assigned to.",
    },
    {
        key: "Mentions",
        label: "Mentions",
        description: "Someone @mentions you in a comment.",
    },
    {
        key: "DueDates",
        label: "Due dates",
        description: "A day before your tasks are due, and when they're overdue. By email, one summary each morning.",
    },
] as const;

export type NotificationOptionKey = (typeof NOTIFICATION_OPTIONS)[number]["key"];
export type NotificationChannel = "inApp" | "email";

/** e.g. ("email", "Mentions") → "emailMentions" */
export function preferenceField(channel: NotificationChannel, key: NotificationOptionKey) {
    return `${channel}${key}` as const;
}

export type NotificationPreferenceValues = Record<
    ReturnType<typeof preferenceField>,
    boolean
>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferenceValues = {
    inAppTaskAssignments: true,
    inAppComments: true,
    inAppMentions: true,
    inAppDueDates: true,
    emailTaskAssignments: true,
    emailComments: true,
    emailMentions: true,
    emailDueDates: true,
};
