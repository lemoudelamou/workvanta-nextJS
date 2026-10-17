import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
    title: "Terms of service · Workvanta",
    description: "The terms for using Workvanta: accounts, your content, acceptable use and our responsibilities.",
    alternates: { canonical: "/terms" },
};

const contact = <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>;

const sections: LegalSection[] = [
    {
        id: "agreement",
        title: "Agreeing to these terms",
        body: (
            <p>
                Workvanta is provided by <strong>{LEGAL.operator}</strong>, {LEGAL.address}. By creating an account
                or using Workvanta, you agree to these terms. If you use it for an organisation, you confirm you may
                agree for it.
            </p>
        ),
    },
    {
        id: "account",
        title: "Your account",
        body: (
            <ul>
                <li>You must be at least 16 years old.</li>
                <li>Give accurate details, and keep your password and sign-in methods safe.</li>
                <li>You&apos;re responsible for what happens in your account. Tell us at {contact} if you think someone else got into it.</li>
            </ul>
        ),
    },
    {
        id: "content",
        title: "Your content",
        body: (
            <>
                <p>
                    What you put into Workvanta (tasks, comments, files and the rest) stays yours. You give us
                    permission to store, process and display it only as needed to run Workvanta for you and the people
                    you share it with.
                </p>
                <p>
                    Workspace owners and admins decide who can join their workspace and what they can see. Content you
                    add to a shared workspace stays available to that workspace, including after you leave or delete
                    your account (see the <Link href="/privacy#retention">privacy policy</Link>).
                </p>
            </>
        ),
    },
    {
        id: "use",
        title: "Acceptable use",
        body: (
            <>
                <p>Don&apos;t use Workvanta to:</p>
                <ul>
                    <li>break the law, or store or share content that is illegal or infringes others&apos; rights;</li>
                    <li>send spam, or invite people who haven&apos;t agreed to hear from you;</li>
                    <li>upload malware, or try to get into accounts, workspaces or systems that aren&apos;t yours;</li>
                    <li>overload or disrupt the service, or get around its limits and security.</li>
                </ul>
                <p>We may remove content or suspend accounts that break these rules.</p>
            </>
        ),
    },
    {
        id: "service",
        title: "The service",
        body: (
            <p>
                We work to keep Workvanta available and your data safe, but we can&apos;t promise it will always be
                uninterrupted or error-free. We may change, add or remove features. If we ever shut Workvanta down,
                we&apos;ll give reasonable notice so you can take your data out.
            </p>
        ),
    },
    {
        id: "ending",
        title: "Ending your account",
        body: (
            <p>
                You can delete your account at any time in <strong>Settings &rarr; Delete account</strong>. We may
                suspend or close an account that seriously or repeatedly breaks these terms, telling you why unless
                the law or safety prevents it.
            </p>
        ),
    },
    {
        id: "liability",
        title: "Liability",
        body: (
            <p>
                Workvanta is provided as it is. As far as the law allows, we are not liable for indirect losses or
                lost data, profits or business. Nothing in these terms limits liability that can&apos;t be limited
                by law, such as for intent, gross negligence, or injury to life, body or health, or your rights as a
                consumer.
            </p>
        ),
    },
    {
        id: "changes",
        title: "Changes to these terms",
        body: (
            <p>
                If we change these terms in a way that matters, we&apos;ll tell you in the app or by email before the
                change applies. If you keep using Workvanta afterwards, the new terms apply; if you don&apos;t agree,
                you can delete your account.
            </p>
        ),
    },
    {
        id: "law",
        title: "Governing law and contact",
        body: (
            <p>
                These terms are governed by the law of {LEGAL.governingLaw}, without taking away protections you have
                as a consumer under the law of the country where you live. Questions? Write to {contact}.
            </p>
        ),
    },
];

export default function TermsPage() {
    return (
        <LegalPage
            title="Terms of service"
            intro={<p>These terms set out the rules for using Workvanta, and what you and we can expect from each other.</p>}
            sections={sections}
        />
    );
}
