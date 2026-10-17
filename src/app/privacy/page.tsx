import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
    title: "Privacy policy · Workvanta",
    description: "What Workvanta collects, why, who processes it, and your rights over your data.",
    alternates: { canonical: "/privacy" },
};

const contact = <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>;

// The services that process data for Workvanta. Keep this in step with the
// providers the app actually uses.
const PROVIDERS = [
    { name: "Vercel", purpose: "Hosting the website and app" },
    { name: "Neon", purpose: "The database: your account, workspaces, projects, tasks and comments" },
    { name: "Cloudinary", purpose: "Storing files you attach to tasks" },
    { name: "Upstash", purpose: "Rate limiting (counting sign-in attempts per IP address) and sending the morning summary once a day" },
    { name: "Ably", purpose: "Live updates: short signals such as “a task in this project changed”, with IDs but not task content" },
    { name: "Sentry", purpose: "Error reports, so we can find and fix bugs (stored in the EU)" },
    { name: "Our email provider", purpose: "Sending account, invitation and notification emails" },
    { name: "Google and GitHub", purpose: "Only if you choose to sign in with them: confirming who you are" },
];

const sections: LegalSection[] = [
    {
        id: "who",
        title: "Who is responsible",
        body: (
            <>
                <p>
                    Workvanta is run by <strong>{LEGAL.operator}</strong>, {LEGAL.address} (&ldquo;we&rdquo;). We are
                    the controller of your personal data under the EU General Data Protection Regulation (GDPR).
                </p>
                <p>For anything about your data, write to {contact}.</p>
            </>
        ),
    },
    {
        id: "collect",
        title: "What we collect",
        body: (
            <ul>
                <li>
                    <strong>Account details:</strong> your name, email address and password (stored only as a secure
                    hash). If you sign in with Google or GitHub, we receive your name, email address and profile
                    picture from them.
                </li>
                <li>
                    <strong>What you create:</strong> workspaces, projects, tasks, subtasks, comments, labels, due
                    dates, files you attach, and who did what (the activity history).
                </li>
                <li>
                    <strong>Sign-in and security data:</strong> for each signed-in device we keep the device type,
                    browser, IP address and an approximate location (city, region, country), so you can see and end
                    your sessions in Settings. We also record failed sign-in attempts, and two-factor settings if you
                    turn them on.
                </li>
                <li>
                    <strong>Settings:</strong> your theme, language and notification preferences.
                </li>
                <li>
                    <strong>Error reports:</strong> when something breaks, technical details such as the page, the
                    browser and the error. We don&apos;t attach your name or email to them.
                </li>
            </ul>
        ),
    },
    {
        id: "why",
        title: "Why we use it",
        body: (
            <ul>
                <li>
                    <strong>To provide Workvanta</strong> to you and your team: your account, workspaces, notifications
                    and emails (GDPR Art. 6(1)(b): performing our contract with you).
                </li>
                <li>
                    <strong>To keep it secure and working:</strong> limiting repeated sign-in attempts, protecting
                    accounts, preventing abuse and fixing errors (Art. 6(1)(f): our legitimate interest in a safe,
                    reliable service).
                </li>
                <li>
                    <strong>When the law requires it</strong> (Art. 6(1)(c)).
                </li>
            </ul>
        ),
    },
    {
        id: "cookies",
        title: "Cookies and local storage",
        body: (
            <>
                <p>
                    We only use cookies that Workvanta needs to work or that remember a choice you made. There are no
                    advertising or analytics cookies, and nothing tracks you across other sites.
                </p>
                <ul>
                    <li>A session cookie that keeps you signed in.</li>
                    <li>Short-lived cookies during sign-in with Google or GitHub, and during two-factor sign-in.</li>
                    <li>
                        Preferences: your language, whether the sidebar is collapsed, the last workspace you opened, and
                        your theme (kept in your browser&apos;s local storage).
                    </li>
                </ul>
            </>
        ),
    },
    {
        id: "providers",
        title: "Who processes your data",
        body: (
            <>
                <p>
                    We don&apos;t sell your data. These providers process it on our behalf, only to run Workvanta:
                </p>
                <ul>
                    {PROVIDERS.map((provider) => (
                        <li key={provider.name}>
                            <strong>{provider.name}:</strong> {provider.purpose}
                        </li>
                    ))}
                </ul>
                <p>
                    People in your workspaces see what you share there: your name, picture, and the tasks and comments
                    you add.
                </p>
            </>
        ),
    },
    {
        id: "transfers",
        title: "Data outside the EU",
        body: (
            <p>
                Some of these providers store or process data in the United States. Where they do, the transfer is
                covered by the EU&ndash;US Data Privacy Framework or by the European Commission&apos;s Standard
                Contractual Clauses.
            </p>
        ),
    },
    {
        id: "retention",
        title: "How long we keep it",
        body: (
            <>
                <p>
                    We keep your data while you have an account. You can delete your account at any time in{" "}
                    <strong>Settings &rarr; Delete account</strong>. When you do, we delete your sign-in methods,
                    sessions, security settings, notifications and preferences, and any workspace only you were part
                    of. Your name and email are removed from what remains.
                </p>
                <p>
                    Tasks and comments you added to workspaces shared with other people stay there, so your team keeps
                    its history; they are shown as written by &ldquo;Deleted user&rdquo;. If you own a shared
                    workspace, you&apos;ll be asked to hand it over or delete it first.
                </p>
                <p>
                    Sign-in links and codes expire after a short time. Error reports are deleted automatically by
                    Sentry after its retention period. Backups kept by our providers are overwritten on their usual
                    schedule.
                </p>
            </>
        ),
    },
    {
        id: "rights",
        title: "Your rights",
        body: (
            <>
                <p>Under the GDPR you can:</p>
                <ul>
                    <li>get a copy of your data, and have it in a portable format;</li>
                    <li>correct it (most of it you can edit yourself in Settings);</li>
                    <li>have it deleted (see above), or its use restricted;</li>
                    <li>object to how we use it based on our legitimate interests.</li>
                </ul>
                <p>
                    Write to {contact} and we&apos;ll answer within one month. You can also complain to your data
                    protection supervisory authority.
                </p>
            </>
        ),
    },
    {
        id: "security",
        title: "How we protect it",
        body: (
            <p>
                Connections are encrypted (HTTPS). Passwords are stored only as secure hashes, and you can turn on
                two-factor authentication. Files you attach are private: they open only for people who can see the
                project, through links that expire. Repeated sign-in attempts are limited.
            </p>
        ),
    },
    {
        id: "children",
        title: "Children",
        body: <p>Workvanta is not meant for children under 16, and we don&apos;t knowingly collect their data.</p>,
    },
    {
        id: "changes",
        title: "Changes to this policy",
        body: (
            <p>
                If we change this policy, we&apos;ll update the date at the top, and tell you in the app or by email
                when the change matters. See also our <Link href="/terms">terms of service</Link>.
            </p>
        ),
    },
];

export default function PrivacyPage() {
    return (
        <LegalPage
            title="Privacy policy"
            intro={
                <p>
                    This policy explains what personal data Workvanta collects when you use it, why, who processes it
                    for us, and the rights you have.
                </p>
            }
            sections={sections}
        />
    );
}
