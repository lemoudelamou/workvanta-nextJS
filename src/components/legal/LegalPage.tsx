import type { ReactNode } from "react";

import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { LEGAL } from "@/lib/legal";
import { getSession } from "@/lib/auth/session";

export type LegalSection = { id: string; title: string; body: ReactNode };

/** The privacy policy and terms: a contents list, then numbered sections. */
export async function LegalPage({ title, intro, sections }: { title: string; intro: ReactNode; sections: LegalSection[] }) {
    const session = await getSession();
    const signedIn = Boolean(session?.user?.id);

    return (
        <div className="min-h-screen bg-canvas text-foreground">
            <SiteHeader signedIn={signedIn} />

            <main className="mx-auto max-w-3xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
                <h1 className="text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">{title}</h1>
                <p className="mt-3 text-sm text-muted-foreground">Last updated {LEGAL.lastUpdated}</p>
                <div className="mt-6 text-base leading-7 text-muted-foreground">{intro}</div>

                <nav aria-label="Contents" className="mt-10 rounded-2xl border border-border bg-card p-5">
                    <p className="text-sm font-semibold">Contents</p>
                    <ol className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
                        {sections.map((section, index) => (
                            <li key={section.id}>
                                <a href={`#${section.id}`} className="text-muted-foreground hover:text-brand">
                                    {index + 1}. {section.title}
                                </a>
                            </li>
                        ))}
                    </ol>
                </nav>

                <div className="mt-12 space-y-12">
                    {sections.map((section, index) => (
                        <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="scroll-mt-24">
                            <h2 id={`${section.id}-title`} className="text-xl font-semibold tracking-[-0.01em]">
                                {index + 1}. {section.title}
                            </h2>
                            <div className="mt-4 space-y-4 text-[15px] leading-7 text-foreground/85 [&_a]:font-medium [&_a]:text-brand [&_a:hover]:underline [&_li]:mt-1.5 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
                                {section.body}
                            </div>
                        </section>
                    ))}
                </div>
            </main>

            <SiteFooter signedIn={signedIn} />
        </div>
    );
}
