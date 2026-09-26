import nodemailer from "nodemailer";

function getSmtpConfig() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? "587");
    const user = process.env.SMTP_USER;
    const password = process.env.SMTP_PASSWORD;
    const from = process.env.SMTP_FROM;

    if (!host || !user || !password || !from) {
        throw new Error(
            "SMTP configuration is incomplete. Please check SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM.",
        );
    }

    return {
        host,
        port,
        secure: port === 465,
        auth: {
            user,
            pass: password,
        },
        from,
    };
}

function createTransporter() {
    const config = getSmtpConfig();

    return {
        transporter: nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: config.auth,
        }),
        from: config.from,
    };
}

function getAppUrl() {
    return (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function emailLayout({
    content,
}: {
    content: string;
}) {
    const appUrl = getAppUrl();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >
    <title>Workvanta</title>
</head>

<body
    style="
        margin:0;
        padding:0;
        background:#f4f6f8;
        font-family:Arial,Helvetica,sans-serif;
        color:#111827;
    "
>

<table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    role="presentation"
    style="background:#f4f6f8;"
>
    <tr>
        <td
            align="center"
            style="padding:40px 16px;"
        >

            <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                role="presentation"
                style="
                    max-width:600px;
                    background:#ffffff;
                    border:1px solid #e5e7eb;
                    border-radius:12px;
                "
            >

                <!-- Header -->
                <tr>
                    <td
                        style="
                            padding:28px 40px 24px 40px;
                        "
                    >

                        <table
                            cellpadding="0"
                            cellspacing="0"
                            border="0"
                            role="presentation"
                        >
                            <tr>

                                <td valign="middle">

                                    ${appUrl
            ? `
                                    <img
                                        src="${appUrl}/workvanta-planet.svg"
                                        width="44"
                                        height="44"
                                        alt="Workvanta"
                                        style="
                                            display:block;
                                            width:44px;
                                            height:44px;
                                            border:0;
                                            outline:none;
                                            text-decoration:none;
                                        "
                                    >
                                    `
            : ""
        }

                                </td>

                                <td
                                    valign="middle"
                                    style="padding-left:12px;"
                                >
                                    <span
                                        style="
                                            font-size:18px;
                                            line-height:24px;
                                            font-weight:700;
                                            color:#111827;
                                        "
                                    >
                                        Workvanta
                                    </span>
                                </td>

                            </tr>
                        </table>

                    </td>
                </tr>

                <!-- Divider -->
                <tr>
                    <td style="padding:0 40px;">
                        <div
                            style="
                                height:1px;
                                background:#e5e7eb;
                                font-size:0;
                                line-height:0;
                            "
                        ></div>
                    </td>
                </tr>

                <!-- Content -->
                <tr>
                    <td
                        style="
                            padding:36px 40px 40px 40px;
                        "
                    >
                        ${content}
                    </td>
                </tr>

                <!-- Footer -->
                <tr>
                    <td
                        style="
                            padding:0 40px 32px 40px;
                        "
                    >

                        <div
                            style="
                                height:1px;
                                background:#e5e7eb;
                                margin-bottom:20px;
                                font-size:0;
                                line-height:0;
                            "
                        ></div>

                        <p
                            style="
                                margin:0;
                                font-size:12px;
                                line-height:20px;
                                color:#9ca3af;
                            "
                        >
                            This is an automated email from Workvanta.
                        </p>

                        <p
                            style="
                                margin:8px 0 0 0;
                                font-size:12px;
                                line-height:20px;
                                color:#9ca3af;
                            "
                        >
                            © Workvanta
                        </p>

                    </td>
                </tr>

            </table>

        </td>
    </tr>
</table>

</body>
</html>
    `;
}

function primaryButton({
    href,
    label,
}: {
    href: string;
    label: string;
}) {
    return `
<table
    cellpadding="0"
    cellspacing="0"
    border="0"
    role="presentation"
    style="margin-top:28px;"
>
    <tr>
        <td
            style="
                border-radius:7px;
                background:#111827;
            "
        >
            <a
                href="${escapeHtml(href)}"
                style="
                    display:inline-block;
                    padding:13px 22px;
                    font-size:14px;
                    line-height:20px;
                    font-weight:700;
                    color:#ffffff;
                    text-decoration:none;
                    border-radius:7px;
                "
            >
                ${escapeHtml(label)}
            </a>
        </td>
    </tr>
</table>
    `;
}



export async function sendPasswordResetEmail({
    email,
    resetUrl,
}: {
    email: string;
    resetUrl: string;
}) {
    const { transporter, from } = createTransporter();

    const safeResetUrl = resetUrl;
    const appUrl = getAppUrl();

    await transporter.sendMail({
        from,
        to: email,
        subject: "Reset your Workvanta password",

        text: [
            "Reset your Workvanta password",
            "",
            "We received a request to reset your Workvanta password.",
            "",
            `Reset your password: ${resetUrl}`,
            "",
            "This link expires in 30 minutes.",
            "",
            "If you did not request this, you can safely ignore this email.",
            "",
            "Workvanta",
        ].join("\n"),

        html: emailLayout({
            content: `
                <p
                    style="
                        margin:0 0 12px 0;
                        font-size:13px;
                        line-height:20px;
                        font-weight:700;
                        color:#6b7280;
                        text-transform:uppercase;
                        letter-spacing:0.08em;
                    "
                >
                    Account security
                </p>

                <h1
                    style="
                        margin:0 0 16px 0;
                        font-size:28px;
                        line-height:36px;
                        color:#111827;
                    "
                >
                    Reset your password
                </h1>

                <p
                    style="
                        margin:0;
                        font-size:16px;
                        line-height:26px;
                        color:#4b5563;
                    "
                >
                    We received a request to reset your Workvanta password.
                    Click the button below to choose a new password.
                </p>

                ${primaryButton({
                href: safeResetUrl,
                label: "Reset password",
            })}

                <p
                    style="
                        margin:28px 0 0 0;
                        font-size:14px;
                        line-height:22px;
                        color:#6b7280;
                    "
                >
                    This link expires in 30 minutes.
                </p>

                <p
                    style="
                        margin:20px 0 0 0;
                        font-size:13px;
                        line-height:21px;
                        color:#9ca3af;
                    "
                >
                    If you did not request this password reset, you can safely
                    ignore this email.
                </p>

                ${appUrl
                    ? `
                <p
                    style="
                        margin:24px 0 0 0;
                        font-size:12px;
                        line-height:20px;
                        color:#9ca3af;
                        word-break:break-all;
                    "
                >
                    If the button does not work, copy and paste this link into
                    your browser:<br>
                    ${escapeHtml(safeResetUrl)}
                </p>
                `
                    : ""
                }
            `,
        }),
    });
}



export async function sendEmailVerificationEmail({
    email,
    verificationUrl,
}: {
    email: string;
    verificationUrl: string;
}) {
    const { transporter, from } = createTransporter();

    await transporter.sendMail({
        from,
        to: email,
        subject: "Verify your Workvanta email",

        text: [
            "Verify your Workvanta email",
            "",
            "Welcome to Workvanta.",
            "",
            "Please verify your email address:",
            verificationUrl,
            "",
            "This link expires in 30 minutes.",
            "",
            "If you did not create a Workvanta account, you can safely ignore this email.",
            "",
            "Workvanta",
        ].join("\n"),

        html: emailLayout({
            content: `
                <p
                    style="
                        margin:0 0 12px 0;
                        font-size:13px;
                        line-height:20px;
                        font-weight:700;
                        color:#6b7280;
                        text-transform:uppercase;
                        letter-spacing:0.08em;
                    "
                >
                    Welcome to Workvanta
                </p>

                <h1
                    style="
                        margin:0 0 16px 0;
                        font-size:28px;
                        line-height:36px;
                        color:#111827;
                    "
                >
                    Verify your email
                </h1>

                <p
                    style="
                        margin:0;
                        font-size:16px;
                        line-height:26px;
                        color:#4b5563;
                    "
                >
                    Thanks for creating your Workvanta account.
                    Please verify your email address to finish setting up
                    your account.
                </p>

                ${primaryButton({
                href: verificationUrl,
                label: "Verify email",
            })}

                <p
                    style="
                        margin:28px 0 0 0;
                        font-size:14px;
                        line-height:22px;
                        color:#6b7280;
                    "
                >
                    This verification link expires in 30 minutes.
                </p>

                <p
                    style="
                        margin:20px 0 0 0;
                        font-size:13px;
                        line-height:21px;
                        color:#9ca3af;
                    "
                >
                    If you did not create a Workvanta account, you can safely
                    ignore this email.
                </p>
            `,
        }),
    });
}
