"use server";

import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";

type SignupResult =
    | {
        success: true;
        user: {
            id: string;
            name: string | null;
            email: string;
        };
    }
    | {
        success: false;
        error: string;
    };

export async function signup(
    name: string,
    email: string,
    password: string,
    confirmPassword: string,
): Promise<SignupResult> {
    const cleanName = typeof name === "string" ? name.trim() : "";
    const cleanEmail =
        typeof email === "string" ? email.trim().toLowerCase() : "";


    if (!cleanName) {
        return { success: false, error: "Enter your name." };
    }

    if (cleanName.length > 100) {
        return {
            success: false,
            error: "Name must be 100 characters or fewer.",
        };
    }

    if (!cleanEmail) {
        return { success: false, error: "Enter your email address." };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return { success: false, error: "Enter a valid email address." };
    }

    if (!password) {
        return { success: false, error: "Create a password." };
    }

    if (password.length < 8) {
        return {
            success: false,
            error: "Password must be at least 8 characters long.",
        };
    }

    if (!/[A-Z]/.test(password)) {
        return {
            success: false,
            error: "Password must contain at least one uppercase letter.",
        };
    }

    if (!/[0-9]/.test(password)) {
        return {
            success: false,
            error: "Password must contain at least one number.",
        };
    }

    if (password !== confirmPassword) {
        return { success: false, error: "The passwords do not match." };
    }

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email: cleanEmail },
            select: { id: true },
        });

        if (existingUser) {
            return {
                success: false,
                error: "An account with this email already exists.",
            };
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                name: cleanName,
                email: cleanEmail,
                passwordHash: hashedPassword,
            },
            select: {
                id: true,
                name: true,
                email: true,
            },
        });

        return { success: true, user };
    } catch (error) {
        // Two simultaneous signups with the same unique email
        if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "P2002"
        ) {
            return {
                success: false,
                error: "An account with this email already exists.",
            };
        }

        console.error("SIGNUP DB ERROR:", error);

        return {
            success: false,
            error: "Something went wrong. Please try again.",
        };
    }
}