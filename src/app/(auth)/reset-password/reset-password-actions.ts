"use server";

import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db/prisma";
import {
    consumePasswordResetToken,
    getPasswordResetToken,
} from "@/lib/auth/reset-password";

export type ResetPasswordState = {
    success: boolean;
    message: string;
};

export async function resetPassword(
    _previousState: ResetPasswordState,
    formData: FormData,
): Promise<ResetPasswordState> {
    const token = String(formData.get("token") ?? "");
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(
        formData.get("confirmPassword") ?? "",
    );

    // Check if reset token exists
    if (!token) {
        return {
            success: false,
            message: "This password reset link is invalid.",
        };
    }

    if (password.length < 8) {
        return {
            success: false,
            message:
                "Your password must be at least 8 characters long.",
        };
    }

    if (!/[A-Z]/.test(password)) {
        return {
            success: false,
            message:
                "Your password must contain at least one uppercase letter.",
        };
    }

    if (!/[a-z]/.test(password)) {
        return {
            success: false,
            message:
                "Your password must contain at least one lowercase letter.",
        };
    }

    if (password !== confirmPassword) {
        return {
            success: false,
            message: "The passwords do not match.",
        };
    }

    const resetToken = await getPasswordResetToken(token);

    if (!resetToken) {
        return {
            success: false,
            message:
                "This password reset link is invalid or has expired.",
        };
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const consumed = await consumePasswordResetToken(token);

    if (consumed.count !== 1) {
        return {
            success: false,
            message:
                "This password reset link is invalid or has expired.",
        };
    }

    // Update password and invalidate all existing sessions
    await prisma.$transaction([
        prisma.user.update({
            where: {
                id: resetToken.userId,
            },
            data: {
                passwordHash,
            },
        }),

        prisma.session.deleteMany({
            where: {
                userId: resetToken.userId,
            },
        }),

        prisma.passwordResetToken.deleteMany({
            where: {
                userId: resetToken.userId,
            },
        }),
    ]);

    return {
        success: true,
        message:
            "Your password has been reset. You can now sign in with your new password.",
    };
}