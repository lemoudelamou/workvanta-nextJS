import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BellRing, Lock, ShieldCheck, SquareKanban, Tag, Zap } from "lucide-react";

import { getSession } from "@/lib/auth/session";
import { buttonStyles } from "@/app/style/button-style";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { BoardPreview } from "@/components/marketing/BoardPreview";

export const metadata: Metadata = {
    title: "Workvanta · Project management for small teams",
    description:
        "Plan work on a board, list or calendar, see who's waiting on what, and watch tasks move live. Workvanta keeps a small team's projects in one clear view.",
    alternates: { canonical: "/" },
};

const FEATURES = [
    {
        icon: SquareKanban,
        title: "Board, list and calendar",
        text: "Drag tasks across To do, In progress, In review and Done, sort them in a list, or see them by due date.",
    },
    {
        icon: Zap,
        title: "Live for everyone",
        text: "When a teammate moves or edits a task, your open board updates within a second. No refresh.",
    },
    {
        icon: Lock,
        title: "See what's blocked",
        text: "Mark the tasks one depends on. Blocked work is flagged, and the assignee hears the moment it's free.",
    },
    {
        icon: Tag,
        title: "Labels that mean something",
        text: "Start with ready-made labels like Bug or Feature, make your own, and filter the board by them.",
    },
    {
        icon: BellRing,
        title: "Nothing slips",
        text: "Reminders before a task is due, a heads-up when it's late, and a short morning summary by email.",
    },
    {
        icon: ShieldCheck,
        title: "Private when it needs to be",
        text: "Share a project with the whole workspace or only the people on it. Roles decide who can edit.",
    },
];

const STEPS = [
    { title: "Create a workspace", text: "Sign up with email, Google or GitHub, and name your team's workspace." },
    { title: "Invite your team", text: "Send an email invite with a role: admin, member or guest." },
    { title: "Plan and ship", text: "Add projects and tasks, assign them, and watch the board move." },
];

// The first page for everyone; signed-in people get a way into the app.
export default async function HomePage() {
    const session = await getSession();
    const signedIn = Boolean(session?.user?.id);
    const primary = signedIn ? { href: "/dashboard", label: "Open dashboard" } : { href: "/signup", label: "Get started" };

    return (
        <div className="min-h-screen bg-canvas text-foreground">
            <SiteHeader signedIn={signedIn} />

            <main>
                {/* Hero */}
                <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:pb-24">
                    <div className="mx-auto max-w-3xl text-center">
                        <p className="text-sm font-semibold text-brand">Project management for small teams</p>
                        <h1 className="mt-4 text-4xl font-semibold leading-[1.08] tracking-[-0.025em] sm:text-5xl lg:text-6xl">
                            Every project, every task, one clear view.
                        </h1>
                        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                            Plan work on a board or a list, assign it, and see what&apos;s moving, what&apos;s blocked
                            and what&apos;s late across your team.
                        </p>
                        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                            <Link href={primary.href} className={buttonStyles({ variant: "primary", size: "lg" })}>
                                {primary.label}
                                <ArrowRight className="size-4" aria-hidden="true" />
                            </Link>
                            {!signedIn && (
                                <Link href="/signin" className={buttonStyles({ variant: "secondary", size: "lg" })}>
                                    Sign in
                                </Link>
                            )}
                        </div>
                    </div>

                    <div className="mx-auto mt-14 max-w-5xl">
                        <BoardPreview />
                    </div>
                </section>

                {/* Features */}
                <section id="features" aria-labelledby="features-heading" className="scroll-mt-20 border-t border-border bg-card">
                    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
                        <div className="max-w-2xl">
                            <h2 id="features-heading" className="text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
                                Everything a small team needs, nothing it doesn&apos;t
                            </h2>
                            <p className="mt-4 text-base leading-7 text-muted-foreground">
                                Workvanta covers planning, tracking and keeping each other in the loop, without the setup
                                and settings of tools built for a thousand people.
                            </p>
                        </div>

                        <ul className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                            {FEATURES.map(({ icon: Icon, title, text }) => (
                                <li key={title}>
                                    <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand/15">
                                        <Icon className="size-5" aria-hidden="true" />
                                    </span>
                                    <h3 className="mt-4 text-base font-semibold">{title}</h3>
                                    <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{text}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                {/* How it works */}
                <section aria-labelledby="steps-heading" className="border-t border-border">
                    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
                        <h2 id="steps-heading" className="text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
                            Up and running in minutes
                        </h2>
                        <ol className="mt-10 grid gap-6 sm:grid-cols-3">
                            {STEPS.map((step, index) => (
                                <li key={step.title} className="rounded-2xl border border-border bg-card p-6">
                                    <span className="flex size-8 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
                                        {index + 1}
                                    </span>
                                    <h3 className="mt-4 text-base font-semibold">{step.title}</h3>
                                    <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{step.text}</p>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                {/* Closing call to action */}
                <section className="bg-[#171a21]">
                    <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:py-20">
                        <div>
                            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-white">Bring your team&apos;s work together</h2>
                            <p className="mt-3 max-w-xl text-base leading-7 text-[#a3a9b6]">
                                Create a workspace, invite people, and see where everything stands.
                            </p>
                        </div>
                        <Link
                            href={primary.href}
                            className={buttonStyles({ variant: "primary", size: "lg", className: "shrink-0" })}
                        >
                            {primary.label}
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                    </div>
                </section>
            </main>

            <SiteFooter />
        </div>
    );
}
