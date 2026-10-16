"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Bell, Trash2 } from "lucide-react";

import { PageBody } from "@/components/ui/PageBody";
import { buttonStyles } from "@/app/style/button-style";

export default function TaskNotFound() {
    const { slug, projectId } = useParams<{ slug: string; projectId: string }>();

    return (
        <PageBody>
            <section className="mt-6 flex flex-col items-center rounded-xl border border-border bg-card px-6 py-16 text-center shadow-sm sm:px-10">
                <span
                    aria-hidden="true"
                    className="mb-6 flex size-14 items-center justify-center rounded-xl bg-muted text-muted-foreground"
                >
                    <Trash2 className="size-6" />
                </span>

                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                    This task has been deleted
                </h1>

                <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                    The task you&apos;re looking for no longer exists, or you
                    no longer have access to it. It may have been removed by
                    someone on your team.
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                    <Link
                        href={`/workspace/${slug}/project/${projectId}`}
                        className={buttonStyles()}
                    >
                        <ArrowLeft className="size-4" aria-hidden="true" />
                        Back to project
                    </Link>

                    <Link
                        href="/notifications"
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <Bell className="size-4" aria-hidden="true" />
                        Notifications
                    </Link>
                </div>
            </section>
        </PageBody>
    );
}