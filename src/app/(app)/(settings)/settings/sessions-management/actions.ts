"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function revokeSession(sessionId: string) {
    const session = await getSession();

    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    if (!sessionId) {
        throw new Error("Session ID is required");
    }

    const targetSession = await prisma.session.findFirst({
        where: {
            id: sessionId,
            userId: session.user.id,
        },
    });

    if (!targetSession) {
        throw new Error("Session not found");
    }

    await prisma.session.delete({
        where: { id: targetSession.id },
    });

    revalidatePath("/settings/sessions");
}

