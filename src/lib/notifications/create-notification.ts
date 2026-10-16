import { prisma } from "@/lib/db/prisma-client";
import type { NotificationType, Prisma } from "@/generated/prisma/client";

type CreateNotificationInput = {
    userId: string;
    type: NotificationType;
    data?: Prisma.InputJsonValue;
    dedupeKey?: string;
};

type InAppPreferences = {
    inAppTaskAssignments: boolean;
    inAppComments: boolean;
    inAppMentions: boolean;
    inAppInvitations: boolean;
};

type EmailPreferences = {
    emailTaskAssignments: boolean;
    emailComments: boolean;
    emailMentions: boolean;
    emailInvitations: boolean;
};

const IN_APP_TOGGLE = {
    TASK_ASSIGNED: "inAppTaskAssignments",
    TASK_COMMENTED: "inAppComments",
    MENTION: "inAppMentions",
    INVITATION: "inAppInvitations",
} as const;

const EMAIL_TOGGLE = {
    TASK_ASSIGNED: "emailTaskAssignments",
    TASK_COMMENTED: "emailComments",
    MENTION: "emailMentions",
    INVITATION: "emailInvitations",
} as const;

function isInAppEnabled(type: NotificationType, preferences: InAppPreferences) {
    const toggle = IN_APP_TOGGLE[type as keyof typeof IN_APP_TOGGLE];
    return toggle ? preferences[toggle] : true;
}

function isEmailEnabled(type: NotificationType, preferences: EmailPreferences) {
    const toggle = EMAIL_TOGGLE[type as keyof typeof EMAIL_TOGGLE];
    return toggle ? preferences[toggle] : false;
}

function findByDedupeKey(dedupeKey: string) {
    return prisma.notification.findUnique({ where: { dedupeKey } });
}

export async function createNotification({ userId, type, data, dedupeKey }: CreateNotificationInput) {
    const preferences = await prisma.notificationPreference.findUnique({
        where: { userId },
        select: {
            inAppTaskAssignments: true,
            inAppComments: true,
            inAppMentions: true,
            inAppInvitations: true,
        },
    });

    if (preferences && !isInAppEnabled(type, preferences)) return null;

    const create = () =>
        prisma.notification.create({ data: { userId, type, data, dedupeKey } });

    if (!dedupeKey) return create();

    const existing = await findByDedupeKey(dedupeKey);
    if (existing) return existing;

    try {
        return await create();
    } catch (error) {
        const winner = await findByDedupeKey(dedupeKey);
        if (winner) return winner;

        throw error;
    }
}

export async function sendNotificationEmailIfEnabled({
                                                         userId,
                                                         type,
                                                         send,
                                                     }: {
    userId: string;
    type: NotificationType;
    send: () => Promise<void>;
}) {
    const preferences = await prisma.notificationPreference.findUnique({
        where: { userId },
        select: {
            emailTaskAssignments: true,
            emailComments: true,
            emailMentions: true,
            emailInvitations: true,
        },
    });

    if (preferences && !isEmailEnabled(type, preferences)) return false;

    await send();
    return true;
}