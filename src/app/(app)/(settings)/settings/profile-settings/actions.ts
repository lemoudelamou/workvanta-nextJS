"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";

async function requireUser() {
    const session = await getSession();

    if (!session) {
        throw new Error("Unauthorized");
    }

    return session.user.id;
}

export async function updateProfile(formData: FormData) {
    const userId = await requireUser();

    const name = String(formData.get("name") ?? "").trim();

    if (!name) {
        throw new Error("Name is required");
    }

    if (name.length > 100) {
        throw new Error("Name cannot be longer than 100 characters");
    }

    await prisma.user.update({
        where: {
            id: userId,
        },
        data: {
            name,
        },
    });

    revalidatePath("/settings");
    revalidatePath("/dashboard");
}

