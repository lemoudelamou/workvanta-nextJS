import nodemailer from "nodemailer";

type Mailer = {
    transporter: nodemailer.Transporter;
    from: string;
};

let cachedMailer: Mailer | null = null;

function getMailer(): Mailer {
    if (cachedMailer) return cachedMailer;

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? "587");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    const from = process.env.SMTP_FROM;

    if (!host || !user || !pass || !from) {
        throw new Error(
            "SMTP configuration is incomplete. Please check SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM.",
        );
    }

    cachedMailer = {
        transporter: nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
        }),
        from,
    };

    return cachedMailer;
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

function layout(content: string) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Workvanta</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:#f4f6f8;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
               style="max-width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;">
          <tr>
            <td style="padding:28px 40px 24px 40px;">
              <span style="font-size:20px;line-height:28px;font-weight:700;color:#111827;">Workvanta</span>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background:#e5e7eb;font-size:0;line-height:0;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px 40px 40px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px 40px;">
              <div style="height:1px;background:#e5e7eb;margin-bottom:20px;font-size:0;line-height:0;"></div>
              <p style="margin:0;font-size:12px;line-height:20px;color:#9ca3af;">
                This is an automated email from Workvanta.
              </p>
              <p style="margin:8px 0 0 0;font-size:12px;line-height:20px;color:#9ca3af;">
                © Workvanta
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function eyebrow(text: string) {
    return `<p style="margin:0 0 12px 0;font-size:13px;line-height:20px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">${escapeHtml(text)}</p>`;
}

function heading(text: string) {
    return `<h1 style="margin:0 0 16px 0;font-size:28px;line-height:36px;color:#111827;">${escapeHtml(text)}</h1>`;
}

function lead(html: string, bottomMargin = 0) {
    return `<p style="margin:0 0 ${bottomMargin}px 0;font-size:16px;line-height:26px;color:#4b5563;">${html}</p>`;
}

function strong(text: string) {
    return `<strong style="color:#111827;">${escapeHtml(text)}</strong>`;
}

function note(text: string, kind: "expiry" | "disclaimer" | "footnote") {
    const styles = {
        expiry: "margin:28px 0 0 0;font-size:14px;line-height:22px;color:#6b7280;",
        disclaimer: "margin:20px 0 0 0;font-size:13px;line-height:21px;color:#9ca3af;",
        footnote: "margin:28px 0 0 0;font-size:12px;line-height:20px;color:#9ca3af;",
    };

    return `<p style="${styles[kind]}">${escapeHtml(text)}</p>`;
}

function button(href: string, label: string) {
    return `
<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-top:28px;">
  <tr>
    <td style="border-radius:7px;background:#111827;">
      <a href="${escapeHtml(href)}"
         style="display:inline-block;padding:13px 22px;font-size:14px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:7px;">
        ${escapeHtml(label)}
      </a>
    </td>
  </tr>
</table>`;
}

async function sendEmail({
                             to,
                             subject,
                             text,
                             content,
                         }: {
    to: string;
    subject: string;
    text: string[];
    content: string;
}) {
    const { transporter, from } = getMailer();

    await transporter.sendMail({
        from,
        to,
        subject,
        text: text.join("\n"),
        html: layout(content),
    });
}

export async function sendPasswordResetEmail({
                                                 email,
                                                 resetUrl,
                                             }: {
    email: string;
    resetUrl: string;
}) {
    await sendEmail({
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
        ],
        content: `
      ${eyebrow("Account security")}
      ${heading("Reset your password")}
      ${lead("We received a request to reset your Workvanta password. Click the button below to choose a new password.")}
      ${button(resetUrl, "Reset password")}
      ${note("This link expires in 30 minutes.", "expiry")}
      ${note("If you did not request this password reset, you can safely ignore this email.", "disclaimer")}
      <p style="margin:24px 0 0 0;font-size:12px;line-height:20px;color:#9ca3af;word-break:break-all;">
        If the button does not work, copy and paste this link into your browser:<br>
        ${escapeHtml(resetUrl)}
      </p>
    `,
    });
}

export async function sendEmailVerificationEmail({
                                                     email,
                                                     verificationUrl,
                                                 }: {
    email: string;
    verificationUrl: string;
}) {
    await sendEmail({
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
        ],
        content: `
      ${eyebrow("Welcome to Workvanta")}
      ${heading("Verify your email")}
      ${lead("Thanks for creating your Workvanta account. Please verify your email address to finish setting up your account.")}
      ${button(verificationUrl, "Verify email")}
      ${note("This verification link expires in 30 minutes.", "expiry")}
      ${note("If you did not create a Workvanta account, you can safely ignore this email.", "disclaimer")}
    `,
    });
}


export async function sendWorkspaceInvitationEmail({
    email,
    workspaceName,
    invitationUrl,
    inviterName,
}: {
    email: string;
    workspaceName: string;
    invitationUrl: string;
    inviterName: string;
}) {
    await sendEmail({
        to: email,
        subject: `${inviterName} invited you to ${workspaceName}`,
        text: [
            "You're invited to Workvanta.",
            "",
            `${inviterName} invited you to join the "${workspaceName}" workspace on Workvanta.`,
            "",
            `Accept invitation: ${invitationUrl}`,
            "",
            "This invitation expires in 7 days.",
            "",
            "If you were not expecting this invitation, you can safely ignore this email.",
            "",
            "Workvanta",
        ],
        content: `
${eyebrow("Workspace invitation")}
${heading("You're invited")}
${lead(`${strong(inviterName)} invited you to join the ${strong(workspaceName)} workspace on Workvanta.`)}
${button(invitationUrl, "Accept invitation")}
${note("This link expires in 7 days.", "expiry")}
${note("If you were not expecting this invitation, you can safely ignore this email.", "disclaimer")}
`,
    });
}


export async function sendProjectInvitationEmail({
                                                     email,
                                                     workspaceName,
                                                     projectName,
                                                     invitationUrl,
                                                     inviterName,
                                                 }: {
    email: string;
    workspaceName: string;
    projectName: string;
    invitationUrl: string;
    inviterName: string;
}) {
    await sendEmail({
        to: email,
        subject: `${inviterName} invited you to the "${projectName}" project`,
        text: [
            "You're invited to Workvanta.",
            "",
            `${inviterName} invited you to join the "${projectName}" project in the "${workspaceName}" workspace.`,
            "",
            `Accept invitation: ${invitationUrl}`,
            "",
            "This invitation expires in 7 days.",
            "",
            "Workvanta",
        ],
        content: `
            ${eyebrow("Project invitation")}
            ${heading("You're invited")}
            ${lead(`${strong(inviterName)} invited you to join the ${strong(projectName)} project in the ${strong(workspaceName)} workspace on Workvanta.`)}
            ${button(invitationUrl, "Accept invitation")}
            ${note("This link expires in 7 days.", "expiry")}
            ${note("If you were not expecting this invitation, you can safely ignore this email.", "disclaimer")}
        `,
    });
}

export async function sendTaskAssignmentEmail({
                                                  email,
                                                  taskTitle,
                                                  assignedBy,
                                              }: {
    email: string;
    taskTitle: string;
    assignedBy: string;
}) {
    const appUrl = getAppUrl();

    await sendEmail({
        to: email,
        subject: `New task assigned: ${taskTitle}`,
        text: [
            "New task assigned",
            "",
            `${assignedBy} assigned you a task in Workvanta.`,
            "",
            `Task: ${taskTitle}`,
            "",
            appUrl ? `Open Workvanta: ${appUrl}` : "Open Workvanta to view the task.",
            "",
            "Workvanta",
        ],
        content: `
      ${eyebrow("New assignment")}
      ${heading("You have a new task")}
      ${lead(`${strong(assignedBy)} assigned a task to you in Workvanta.`, 28)}
      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
             style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
        <tr>
          <td style="padding:20px 24px;">
            <p style="margin:0 0 8px 0;font-size:12px;line-height:18px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">
              Task
            </p>
            <p style="margin:0;font-size:18px;line-height:26px;font-weight:700;color:#111827;">
              ${escapeHtml(taskTitle)}
            </p>
          </td>
        </tr>
      </table>
      ${appUrl ? button(appUrl, "Open Workvanta") : ""}
      ${note("Open Workvanta to view the task details and start working on it.", "expiry")}
      <p style="margin:20px 0 0 0;font-size:12px;line-height:20px;color:#9ca3af;">
        You're receiving this email because task assignment notifications are enabled in your Workvanta settings.
      </p>
    `,
    });
}

export async function sendTaskCommentedEmail({
                                                 email,
                                                 commentedBy,
                                             }: {
    email: string;
    taskId: string;
    commentedBy: string;
}) {
    const appUrl = getAppUrl();

    await sendEmail({
        to: email,
        subject: `${commentedBy} commented on a task`,
        text: [
            "New comment on a Workvanta task",
            "",
            `${commentedBy} commented on a task you're following.`,
            "",
            appUrl ? `Open Workvanta: ${appUrl}` : "Open Workvanta to view the comment.",
            "",
            "Workvanta",
        ],
        content: `
      ${eyebrow("New comment")}
      ${heading("Someone commented on a task")}
      ${lead(`${strong(commentedBy)} commented on a task you're following in Workvanta.`)}
      ${appUrl ? button(appUrl, "Open Workvanta") : ""}
      ${note("You're receiving this email because comment notifications are enabled in your Workvanta settings.", "footnote")}
    `,
    });
}

export async function sendMentionEmail({
                                           email,
                                           mentionedBy,
                                       }: {
    email: string;
    taskId: string;
    mentionedBy: string;
}) {
    const appUrl = getAppUrl();

    await sendEmail({
        to: email,
        subject: `${mentionedBy} mentioned you in Workvanta`,
        text: [
            "You were mentioned in Workvanta",
            "",
            `${mentionedBy} mentioned you in a comment on a Workvanta task.`,
            "",
            appUrl ? `Open Workvanta: ${appUrl}` : "Open Workvanta to view the mention.",
            "",
            "Workvanta",
        ],
        content: `
      ${eyebrow("Mention")}
      ${heading("You were mentioned")}
      ${lead(`${strong(mentionedBy)} mentioned you in a comment on a Workvanta task.`)}
      ${appUrl ? button(appUrl, "Open Workvanta") : ""}
      ${note("You're receiving this email because mention notifications are enabled in your Workvanta settings.", "footnote")}
    `,
    });
}

/** At most this many tasks per digest section; the rest are counted. */
const DIGEST_SECTION_LIMIT = 8;

type DigestEmailItem = { title: string; projectName: string; url: string; dueLabel: string };

function plural(count: number, word: string) {
    return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** The subject says the most pressing thing first. */
export function digestSubject(digest: { overdue: unknown[]; today: unknown[]; upcoming: unknown[] }) {
    const parts = [
        digest.overdue.length ? `${plural(digest.overdue.length, "task")} overdue` : "",
        digest.today.length ? `${digest.today.length} due today` : "",
    ].filter(Boolean);
    if (parts.length) return `Your tasks: ${parts.join(", ")}`;
    return `Your tasks: ${digest.upcoming.length} coming up`;
}

function digestSection(title: string, accent: string, items: DigestEmailItem[]) {
    if (!items.length) return "";
    const shown = items.slice(0, DIGEST_SECTION_LIMIT);
    const rows = shown
        .map(
            (item) => `
        <tr>
          <td style="padding:12px 0;border-top:1px solid #e5e7eb;">
            <a href="${escapeHtml(item.url)}" style="font-size:15px;line-height:22px;font-weight:700;color:#111827;text-decoration:none;">${escapeHtml(item.title)}</a>
            <p style="margin:2px 0 0 0;font-size:13px;line-height:20px;color:#6b7280;">${escapeHtml(item.projectName)} &nbsp;·&nbsp; due ${escapeHtml(item.dueLabel)}</p>
          </td>
        </tr>`,
        )
        .join("");
    const more =
        items.length > shown.length
            ? `<p style="margin:8px 0 0 0;font-size:13px;line-height:20px;color:#6b7280;">And ${items.length - shown.length} more.</p>`
            : "";
    return `
      <h2 style="margin:28px 0 8px 0;font-size:16px;line-height:24px;color:${accent};">${escapeHtml(title)} (${items.length})</h2>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">${rows}
      </table>${more}`;
}

function digestText(title: string, items: DigestEmailItem[]) {
    if (!items.length) return [];
    return [
        `${title} (${items.length})`,
        ...items.slice(0, DIGEST_SECTION_LIMIT).map((item) => `- ${item.title} (${item.projectName}, due ${item.dueLabel}): ${item.url}`),
        ...(items.length > DIGEST_SECTION_LIMIT ? [`And ${items.length - DIGEST_SECTION_LIMIT} more.`] : []),
        "",
    ];
}

export async function sendDueDigestEmail({
    email,
    name,
    digest,
}: {
    email: string;
    name: string | null;
    digest: { overdue: DigestEmailItem[]; today: DigestEmailItem[]; upcoming: DigestEmailItem[] };
}) {
    const appUrl = getAppUrl();
    const greeting = name?.trim() ? `Good morning, ${name.trim().split(/\s+/)[0]}` : "Good morning";
    const settingsUrl = appUrl ? `${appUrl}/settings` : "";

    await sendEmail({
        to: email,
        subject: digestSubject(digest),
        text: [
            greeting,
            "",
            "Here's what's due on your plate.",
            "",
            ...digestText("Overdue", digest.overdue),
            ...digestText("Due today", digest.today),
            ...digestText("Coming up", digest.upcoming),
            settingsUrl ? `Turn off these emails under Due dates in your settings: ${settingsUrl}` : "Turn off these emails under Due dates in your settings.",
            "",
            "Workvanta",
        ],
        content: `
      ${eyebrow("Your day")}
      ${heading(greeting)}
      ${lead("Here's what's due on your plate.")}
      ${digestSection("Overdue", "#b91c1c", digest.overdue)}
      ${digestSection("Due today", "#b45309", digest.today)}
      ${digestSection("Coming up", "#111827", digest.upcoming)}
      ${appUrl ? button(`${appUrl}/dashboard`, "Open Workvanta") : ""}
      ${note("You get this email because due date emails are on. You can turn them off under Due dates in your settings.", "footnote")}
    `,
    });
}
