"use server";

import { prisma } from "@/lib/db/prisma";
import { createPasswordResetToken } from "@/lib/auth/reset-password";
import { sendPasswordResetEmail } from "@/lib/email/mailer";

export type ForgotPasswordState = {
    success: boolean;
    message: string;
};

export async function forgotPassword(
    _previousState: ForgotPasswordState,
    formData: FormData,
): Promise<ForgotPasswordState> {
    const email = String(formData.get("email") ?? "")
        .trim()
        .toLowerCase();

    if (!email) {
        return {
            success: false,
            message: "Please enter your email address.",
        };
    }


    const genericMessage =
        "If an account exists for that email, a password reset link has been sent.";

    const user = await prisma.user.findUnique({
        where: {
            email,
        },
        select: {
            id: true,
            email: true,
        },
    });

    if (!user) {
        return {
            success: true,
            message: genericMessage,
        };
    }

    const { token } = await createPasswordResetToken(user.id);

    const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        "http://localhost:3000";

    const resetUrl =
        `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

    try {
        await sendPasswordResetEmail({
            email: user.email,
            resetUrl,
        });
    } catch (error) {
        console.error(
            "Failed to send password reset email:",
            error,
        );

        return {
            success: false,
            message:
                "We couldn't send the password reset email right now. Please try again.",
        };
    }

    return {
        success: true,
        message: genericMessage,
    };
}