"use server";

import { redirect } from "next/navigation";

import {
    destroyCurrentSession,
    getSession,
} from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function deleteAccount() {
    const session = await getSession();

    if (!session) {
        redirect("/signin");
    }

    await prisma.user.delete({
        where: {
            id: session.user.id,
        },
    });

    await destroyCurrentSession();

    redirect("/signin");
}

