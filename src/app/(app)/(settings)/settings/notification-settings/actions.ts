"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "./options";

const FIELDS = new Set(Object.keys(DEFAULT_NOTIFICATION_PREFERENCES));

/**
 * Turns one notification type on or off for one channel. Only the known
 * preference columns can be written.
 */
export async function updateNotificationPreference(
    field: string,
    enabled: boolean,
): Promise<{ error?: string }> {
    const session = await getSession();
    if (!session?.user?.id) return { error: "Please sign in again." };

    if (!FIELDS.has(field) || typeof enabled !== "boolean") {
        return { error: "That setting doesn't exist." };
    }

    await prisma.notificationPreference.upsert({
        where: { userId: session.user.id },
        update: { [field]: enabled },
        create: { userId: session.user.id, [field]: enabled },
    });

    revalidatePath("/settings");
    return {};
}
