
"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

async function requireUser() {
    const session = await getSession();

    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    return session.user.id;
}

export async function updateProfile(formData: FormData) {
    const userId = await requireUser();

    const name = String(
        formData.get("name") ?? "",
    ).trim();

    if (!name) {
        throw new Error("Name is required");
    }

    if (name.length > 100) {
        throw new Error("Name is too long");
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



export async function updateLanguage(
    language: string,
) {
    const userId = await requireUser();

    await prisma.userPreference.upsert({
        where: {
            userId,
        },
        update: {
            language,
        },
        create: {
            userId,
            language,
        },
    });

    const cookieStore = await cookies();

    cookieStore.set("NEXT_LOCALE", language, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
    });
}

