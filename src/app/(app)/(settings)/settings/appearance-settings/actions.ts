"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { ThemePreference } from "@/generated/prisma/enums";

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

type UserPreferences = {
    theme?: "SYSTEM" | "LIGHT" | "DARK";
    timezone?: string;
};

export async function updateUserPreferences(
    data: UserPreferences,
) {
    const userId = await requireUser();

    if (data.timezone !== undefined) {
        try {
            new Intl.DateTimeFormat("en-US", {
                timeZone: data.timezone,
            });
        } catch {
            throw new Error("Invalid timezone");
        }
    }

    if (data.theme !== undefined) {
        const validThemes = [
            ThemePreference.SYSTEM,
            ThemePreference.LIGHT,
            ThemePreference.DARK,
        ];

        if (!validThemes.includes(data.theme)) {
            throw new Error("Invalid theme");
        }
    }

    if (
        data.theme === undefined &&
        data.timezone === undefined
    ) {
        return;
    }

    const preferences = {
        ...(data.theme !== undefined && {
            theme: data.theme,
        }),
        ...(data.timezone !== undefined && {
            timezone: data.timezone,
        }),
    };

    await prisma.user.update({
        where: {
            id: userId,
        },
        data: {
            preferences: {
                upsert: {
                    create: preferences,
                    update: preferences,
                },
            },
        },
    });

    revalidatePath("/settings");
}

