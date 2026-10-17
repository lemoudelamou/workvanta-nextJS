import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Lightbulb } from "lucide-react";

import { getSession } from "@/lib/auth/session";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { PROJECT_ROLE_DESCRIPTIONS, WORKSPACE_ROLE_DESCRIPTIONS } from "@/lib/auth/permissions";
import { PRESET_LABELS } from "@/lib/labels/label-colors";

export const metadata: Metadata = {
    title: "Guide · Workvanta",
    description:
        "A step-by-step guide to Workvanta: creating a workspace, inviting your team, planning tasks on a board, list or calendar, and staying on top of what's due.",
    alternates: { canonical: "/guide" },
};

/** Numbered steps: what to click, in order. */
function Steps({ children }: { children: ReactNode }) {
    return <ol className="list-decimal space-y-2 pl-5 marker:font-semibold marker:text-brand">{children}</ol>;
}

function Tip({ children }: { children: ReactNode }) {
    return (
        <p className="flex gap-3 rounded-xl border border-brand/20 bg-brand-soft/50 px-4 py-3 text-sm leading-6 dark:bg-brand/10">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
            <span>{children}</span>
        </p>
    );
}

/** A button or menu name, as it appears on screen. */
function UI({ children }: { children: ReactNode }) {
    return <strong className="font-semibold text-foreground">{children}</strong>;
}

function Question({ q, children }: { q: string; children: ReactNode }) {
    return (
        <details className="group rounded-xl border border-border bg-card px-4 py-3 [&_p]:mt-2">
            <summary className="cursor-pointer list-none font-medium text-foreground marker:hidden">
                <span className="mr-2 inline-block text-brand transition-transform group-open:rotate-90">›</span>
                {q}
            </summary>
            {children}
        </details>
    );
}

type Section = { id: string; title: string; body: ReactNode };

const workspaceRoles = (["OWNER", "ADMIN", "MEMBER", "GUEST"] as const).map((role) => ({
    name: role.charAt(0) + role.slice(1).toLowerCase(),
    text: WORKSPACE_ROLE_DESCRIPTIONS[role],
}));
const projectRoles = (["ADMIN", "EDITOR", "VIEWER"] as const).map((role) => ({
    name: role.charAt(0) + role.slice(1).toLowerCase(),
    text: PROJECT_ROLE_DESCRIPTIONS[role],
}));

const SECTIONS: Section[] = [
    {
        id: "start",
        title: "Create your account",
        body: (
            <>
                <Steps>
                    <li>
                        Go to <Link href="/signup">Sign up</Link>.
                    </li>
                    <li>
                        Choose <UI>Google</UI> or <UI>GitHub</UI> to sign up in one click, or <UI>Create account</UI> to use
                        your email and a password (at least 8 characters, with a capital letter and a number).
                    </li>
                    <li>
                        With email, open the message we send you and click the link to confirm your address. Check your spam
                        folder if it doesn&apos;t arrive within a few minutes.
                    </li>
                </Steps>
                <Tip>
                    Signed up with Google or GitHub? Add a password too, in <UI>Settings → Sign-in methods</UI>, so you can
                    still get in if you lose access to that account.
                </Tip>
            </>
        ),
    },
    {
        id: "workspace",
        title: "Set up a workspace",
        body: (
            <>
                <p>
                    A workspace is your team&apos;s shared home. Everything else (projects, tasks and people) lives inside
                    one. You can belong to several, for example one for work and one for a side project.
                </p>
                <Steps>
                    <li>
                        After signing in, click the workspace name at the top of the sidebar and choose{" "}
                        <UI>Create workspace</UI>. (Your first time, you&apos;ll be offered one straight away.)
                    </li>
                    <li>Give it a name (your team or company) and, if you like, a short description.</li>
                    <li>Open it to see its projects and people.</li>
                </Steps>
                <Tip>
                    Switch between workspaces with the workspace name at the top of the sidebar. Rename, leave or delete a
                    workspace from its <UI>⋯</UI> menu.
                </Tip>
            </>
        ),
    },
    {
        id: "team",
        title: "Invite your team",
        body: (
            <>
                <Steps>
                    <li>
                        In your workspace, open its <UI>⋯</UI> menu and choose <UI>Team &amp; invites</UI>.
                    </li>
                    <li>
                        Under <UI>Invite people</UI>, type their email, pick a role, and click <UI>Send invitation</UI>.
                    </li>
                    <li>
                        They get an email with a link. They sign up or sign in with that same email address and accept. The
                        invitation is valid for 7 days.
                    </li>
                </Steps>
                <p>What each workspace role can do:</p>
                <ul className="list-disc space-y-1 pl-5">
                    {workspaceRoles.map((role) => (
                        <li key={role.name}>
                            <UI>{role.name}</UI>: {role.text}.
                        </li>
                    ))}
                </ul>
                <Tip>
                    Leaving the workspace you own? First give it to someone else with <UI>Make owner</UI> next to their name
                    on the Team page.
                </Tip>
            </>
        ),
    },
    {
        id: "projects",
        title: "Create a project",
        body: (
            <>
                <Steps>
                    <li>
                        In your workspace, click <UI>New project</UI> and give it a name.
                    </li>
                    <li>
                        Choose who can see it: <UI>Everyone in the workspace</UI>, or private, so only the people you add can
                        open it. You can change this later with <UI>Make private</UI> in the project&apos;s <UI>⋯</UI> menu.
                    </li>
                    <li>
                        For a private project, add people from <UI>Members</UI> and give each a project role.
                    </li>
                </Steps>
                <p>Project roles:</p>
                <ul className="list-disc space-y-1 pl-5">
                    {projectRoles.map((role) => (
                        <li key={role.name}>
                            <UI>{role.name}</UI>: {role.text}.
                        </li>
                    ))}
                </ul>
            </>
        ),
    },
    {
        id: "tasks",
        title: "Add and organise tasks",
        body: (
            <>
                <Steps>
                    <li>
                        In a project, click <UI>New task</UI> (or the <UI>+</UI> at the top of a column) and give it a title.
                    </li>
                    <li>
                        Open the task to fill in the rest: <UI>status</UI>, <UI>priority</UI> (Low, Medium, High, Urgent),
                        <UI> assignee</UI>, <UI>due date</UI> and a description. Changes save as you make them.
                    </li>
                    <li>
                        Break bigger work into <UI>Subtasks</UI>, attach files up to 10 MB under <UI>Attachments</UI>, and use
                        <UI> Repeat</UI> for routine work (every day, every weekday, every week or every month). When a
                        repeating task is done, the next one appears.
                    </li>
                </Steps>
                <p>
                    Each task moves through four stages: <UI>To do</UI> → <UI>In progress</UI> → <UI>In review</UI> →{" "}
                    <UI>Done</UI>.
                </p>
            </>
        ),
    },
    {
        id: "views",
        title: "Board, list and calendar",
        body: (
            <>
                <p>Every project has three views; switch between them at the top of the project.</p>
                <ul className="list-disc space-y-1 pl-5">
                    <li>
                        <UI>Board</UI>: drag cards between columns to change their status, or up and down to reorder them.
                    </li>
                    <li>
                        <UI>List</UI>: every task in one table. Click a column header to sort, and change the status straight
                        from the row.
                    </li>
                    <li>
                        <UI>Calendar</UI>: tasks on their due dates. Drag a task to another day to reschedule it.
                    </li>
                </ul>
                <p>
                    Use <UI>Search tasks</UI> and <UI>Filters</UI> to narrow things down by priority, status, assignee,
                    label, or whether a task is blocked.
                </p>
                <Tip>
                    Press <kbd className="rounded border border-border bg-card px-1.5 py-0.5 text-xs">Ctrl</kbd> +{" "}
                    <kbd className="rounded border border-border bg-card px-1.5 py-0.5 text-xs">K</kbd> (
                    <kbd className="rounded border border-border bg-card px-1.5 py-0.5 text-xs">⌘</kbd> +{" "}
                    <kbd className="rounded border border-border bg-card px-1.5 py-0.5 text-xs">K</kbd> on a Mac) anywhere
                    in the app to search and jump to any workspace, project or page.
                </Tip>
            </>
        ),
    },
    {
        id: "labels",
        title: "Labels",
        body: (
            <>
                <Steps>
                    <li>
                        On a task, click <UI>Add label</UI> (or the <UI>+</UI> next to its labels).
                    </li>
                    <li>
                        Tick an existing label, pick one of the <UI>Suggested</UI> ones (
                        {PRESET_LABELS.slice(0, 4).map((label) => label.name).join(", ")}, and more), or type a new name and
                        choose <UI>Create label</UI>.
                    </li>
                </Steps>
                <p>
                    Project admins can rename, recolour and delete labels, and change the suggested list, in the
                    project&apos;s <UI>⋯ → Manage labels</UI>.
                </p>
            </>
        ),
    },
    {
        id: "dependencies",
        title: "Blocked tasks",
        body: (
            <>
                <p>
                    When a task can&apos;t start until another is finished, link them so everyone sees what&apos;s holding
                    things up.
                </p>
                <Steps>
                    <li>
                        Open the waiting task and find <UI>Dependencies</UI>.
                    </li>
                    <li>
                        Click <UI>Add a task this one waits on</UI>, start typing, and pick the task from the list.
                    </li>
                </Steps>
                <p>
                    The waiting task gets a <UI>Blocked</UI> badge on the board until every task it depends on is done. Then
                    its assignee is notified that it&apos;s ready. If you mark a blocked task as done anyway, Workvanta asks
                    you to confirm first.
                </p>
            </>
        ),
    },
    {
        id: "together",
        title: "Work together",
        body: (
            <>
                <ul className="list-disc space-y-1 pl-5">
                    <li>
                        <UI>Comments</UI>: discuss a task at the bottom of its page. Type <UI>@</UI> and a name to mention
                        someone; they get a notification.
                    </li>
                    <li>
                        <UI>Activity</UI>: every task keeps a history of who changed what and when.
                    </li>
                    <li>
                        <UI>Live updates</UI>: when a teammate moves or edits a task, your open board and list update by
                        themselves, without reloading.
                    </li>
                    <li>
                        <UI>My tasks</UI>: everything assigned to you, across all your workspaces, in one place.
                    </li>
                </ul>
            </>
        ),
    },
    {
        id: "notifications",
        title: "Notifications and reminders",
        body: (
            <>
                <p>
                    The bell in the sidebar shows new notifications: tasks assigned to you, comments, mentions,
                    invitations, tasks that are no longer blocked, and reminders when something you own is due within a day
                    or is overdue. You can also get a short summary email each morning of what&apos;s overdue, due today and
                    coming up.
                </p>
                <p>
                    Choose what reaches you in the app and by email in <UI>Settings → Notifications</UI>.
                </p>
            </>
        ),
    },
    {
        id: "account",
        title: "Your account and security",
        body: (
            <ul className="list-disc space-y-1 pl-5">
                <li>
                    <UI>Profile</UI>: your name and picture.
                </li>
                <li>
                    <UI>Sign-in &amp; security</UI>: change your password, connect Google or GitHub, and turn on two-step
                    verification with an authenticator app. Keep your backup codes somewhere safe.
                </li>
                <li>
                    <UI>Where you&apos;re signed in</UI>: see every device that&apos;s signed in, and sign any of them out.
                </li>
                <li>
                    <UI>Preferences</UI>: theme (light, dark or your device&apos;s setting) and language.
                </li>
                <li>
                    <UI>Delete account</UI>: removes your account for good. See the{" "}
                    <Link href="/privacy#retention">privacy policy</Link> for exactly what happens.
                </li>
            </ul>
        ),
    },
    {
        id: "help",
        title: "Something not working?",
        body: (
            <div className="space-y-3">
                <Question q="I didn't get the email (confirmation, invitation or password reset).">
                    <p>
                        Check your spam or promotions folder and wait a few minutes. For a password reset, you can ask again;
                        after a few requests in an hour, new emails pause for a while to protect your inbox.
                    </p>
                </Question>
                <Question q="My invitation link says it's expired.">
                    <p>Invitations last 7 days. Ask someone on the workspace&apos;s Team page to send a new one.</p>
                </Question>
                <Question q="I accepted an invitation but don't see the workspace.">
                    <p>
                        The invitation is tied to the email it was sent to. Make sure you signed in with that same address,
                        whether with a password, Google or GitHub.
                    </p>
                </Question>
                <Question q="I can see a project but can't change anything.">
                    <p>
                        You have the <UI>Viewer</UI> role there, or you&apos;re a guest. Ask a project admin to make you an
                        Editor.
                    </p>
                </Question>
                <Question q="A teammate can't find a project.">
                    <p>
                        It&apos;s probably private. Add them in the project&apos;s <UI>Members</UI>, or switch it to{" "}
                        <UI>Everyone in the workspace</UI>.
                    </p>
                </Question>
                <Question q="I lost my phone with the authenticator app.">
                    <p>
                        Sign in with one of the backup codes you saved when you turned on two-step verification, then set it
                        up again on your new phone.
                    </p>
                </Question>
                <Question q="It says “Too many attempts”.">
                    <p>
                        To stop people guessing passwords, sign-in, sign-up and password resets are limited for a few
                        minutes after many tries. Wait a little and try again.
                    </p>
                </Question>
                <Question q="I can't delete my account.">
                    <p>
                        You still own a workspace other people use. Give it to someone with <UI>Make owner</UI> on its Team
                        page, or delete the workspace, then try again.
                    </p>
                </Question>
                <Question q="A page says “Something went wrong”.">
                    <p>
                        Click <UI>Try again</UI>; it&apos;s usually temporary, and your work is saved. If it keeps happening,
                        note the <UI>Reference</UI> code on the page and send it to us, so we can find the problem.
                    </p>
                </Question>
            </div>
        ),
    },
];

export default async function GuidePage() {
    const session = await getSession();

    return (
        <div className="min-h-screen bg-canvas text-foreground">
            <SiteHeader signedIn={Boolean(session?.user?.id)} />

            <main className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
                <div className="max-w-2xl">
                    <p className="text-sm font-semibold text-brand">Guide</p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">Getting started with Workvanta</h1>
                    <p className="mt-4 text-base leading-7 text-muted-foreground">
                        Everything you need, step by step: from creating your account to running projects with your team.
                        New here? Read the first four sections in order; the rest you can come back to when you need them.
                    </p>
                </div>

                <div className="mt-12 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
                    <nav aria-label="Guide contents" className="mb-10 lg:mb-0">
                        <div className="rounded-2xl border border-border bg-card p-4 lg:sticky lg:top-24">
                            <p className="text-sm font-semibold">On this page</p>
                            <ol className="mt-3 space-y-1.5 text-sm">
                                {SECTIONS.map((section, index) => (
                                    <li key={section.id}>
                                        <a href={`#${section.id}`} className="text-muted-foreground hover:text-brand">
                                            {index + 1}. {section.title}
                                        </a>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </nav>

                    <div className="max-w-3xl space-y-14">
                        {SECTIONS.map((section, index) => (
                            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="scroll-mt-24">
                                <h2 id={`${section.id}-title`} className="text-2xl font-semibold tracking-[-0.01em]">
                                    <span className="mr-2 text-muted-foreground">{index + 1}.</span>
                                    {section.title}
                                </h2>
                                <div className="mt-4 space-y-4 text-[15px] leading-7 text-foreground/85 [&_a]:font-medium [&_a]:text-brand [&_a:hover]:underline">
                                    {section.body}
                                </div>
                            </section>
                        ))}
                    </div>
                </div>
            </main>

            <SiteFooter />
        </div>
    );
}
