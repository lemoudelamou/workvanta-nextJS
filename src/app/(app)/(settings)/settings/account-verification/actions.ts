"use server";

import { getSession } from "@/lib/auth/session";
import { createEmailVerificationToken } from "@/lib/auth/email-verification";
import { prisma } from "@/lib/db/prisma";
import { sendEmailVerificationEmail } from "@/lib/email/mailer";

export type EmailVerificationState = {
    success: boolean;
    message: string;
};

export async function resendEmailVerification(
    _previousState: EmailVerificationState,
    _formData: FormData,
): Promise<EmailVerificationState> {
    const session = await getSession();

    if (!session) {
        return {
            success: false,
            message: "Your session has expired. Please sign in again.",
        };
    }

    const user = await prisma.user.findUnique({
        where: {
            id: session.user.id,
        },
        select: {
            id: true,
            email: true,
            emailVerified: true,
        },
    });

    if (!user) {
        return {
            success: false,
            message: "Your account could not be found.",
        };
    }

    if (user.emailVerified) {
        return {
            success: true,
            message: "Your email address is already verified.",
        };
    }

    try {
        const { token } = await createEmailVerificationToken(user.id);

        const appUrl =
            process.env.NEXT_PUBLIC_APP_URL ??
            "http://localhost:3000";

        const verificationUrl =
            `${appUrl}/verify-mail?token=${encodeURIComponent(token)}`;

        await sendEmailVerificationEmail({
            email: user.email,
            verificationUrl,
        });

        return {
            success: true,
            message:
                "Verification email sent. Check your inbox for the verification link.",
        };
    } catch (error) {
        console.error(
            "Failed to resend email verification:",
            error,
        );

        return {
            success: false,
            message:
                "We could not send the verification email right now. Please try again.",
        };
    }
}

