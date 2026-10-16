"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";


async function requireUser(){

    const session = await getSession();

    if (!session?.user?.id)
    {
        throw new Error("Unauthorized");
    }

    return session.user.id;
}

export async function markNotificationReadAction(
    notificationId: string,
) {

    const userId = await requireUser();

    await prisma.notification.updateMany({
        where: {
            id: notificationId,
            userId,
            readAt: null,
        },
        data: {
            readAt: new Date(),
        },
    });

    revalidatePath("/notifications");
}

export async function markAllNotificationsReadAction() {

    const userId = await requireUser();

    await prisma.notification.updateMany({
        where: {
            userId,
            readAt: null,
        },
        data: {
            readAt: new Date(),
        },
    });

    revalidatePath("/notifications");
}