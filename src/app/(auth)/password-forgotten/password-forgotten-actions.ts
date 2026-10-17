"use server";

import { prisma } from "@/lib/db/prisma";
import { createPasswordResetToken } from "@/lib/auth/reset-password";
import { sendPasswordResetEmail } from "@/lib/email/mailer";
import { rateLimit, rateLimitByIp } from "@/lib/redis/rate-limit";

const FORGOT_IP_LIMIT = 5;
const FORGOT_IP_WINDOW = 15 * 60;
// Reset emails per address, so nobody can flood someone's inbox.
const FORGOT_EMAIL_LIMIT = 3;
const FORGOT_EMAIL_WINDOW = 60 * 60;

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

    const ipLimit = await rateLimitByIp("rate-limit:forgot-password", {
        limit: FORGOT_IP_LIMIT,
        windowSeconds: FORGOT_IP_WINDOW,
    });
    if (!ipLimit.success) {
        return {
            success: false,
            message: "Too many requests. Please wait a few minutes and try again.",
        };
    }

    // Over the per-address limit: answer as usual but send nothing, so this
    // can't be used to flood an inbox or to tell which emails have accounts.
    const emailLimit = await rateLimit({
        key: `rate-limit:forgot-password:email:${email}`,
        limit: FORGOT_EMAIL_LIMIT,
        windowSeconds: FORGOT_EMAIL_WINDOW,
    });
    if (!emailLimit.success) {
        return { success: true, message: genericMessage };
    }

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