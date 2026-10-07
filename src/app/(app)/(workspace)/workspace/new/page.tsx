import { ArrowRight, Building2, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { createWorkspace } from "@/app/(app)/(workspace)/workspace/workspace-actions";
import { AlertMessage } from "@/components/ui/AlertMessage";
import { CenteredFormPage } from "@/components/ui/PageBody";
import { IconBadge } from "@/components/ui/IconBadge";
import { Field, Input, Textarea } from "@/components/ui/FormField";
import { buttonStyles } from "@/app/style/button-style";

export default async function NewWorkspacePage({
                                                   searchParams,
                                               }: {
    searchParams: Promise<{ error?: string }>;
}) {
    const session = await getSession();
    if (!session?.user) redirect("/signin");

    const { error } = await searchParams;

    return (
        <CenteredFormPage>
            <IconBadge solid>
                <Building2 />
            </IconBadge>

            <p className="mt-6 text-sm font-medium text-violet-600 dark:text-violet-400">
                Get started
            </p>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                Create your workspace
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                A workspace is your team&apos;s shared home. Once it&apos;s ready,
                you can create projects and invite teammates.
            </p>

            {error === "duplicate-name" && (
                <div className="mt-6">
                    <AlertMessage
                        variant="error"
                        title="A workspace with this name already exists"
                        message="Choose a different name for your new workspace."
                    />
                </div>
            )}

            <form action={createWorkspace} className="mt-7 space-y-5">
                <Field label="Workspace name">
                    <Input
                        required
                        name="name"
                        maxLength={80}
                        placeholder="e.g. Acme Studio"
                    />
                </Field>

                <Field label="What does your team work on?" optional>
                    <Textarea
                        name="description"
                        maxLength={280}
                        rows={3}
                        placeholder="A short description of your team or organization."
                    />
                </Field>

                <button
                    type="submit"
                    className={buttonStyles({ size: "lg", className: "w-full" })}
                >
                    Create workspace
                    <ArrowRight className="size-4" />
                </button>
            </form>

            <div className="mt-6 flex gap-2 rounded-xl bg-violet-50 p-3 text-xs leading-5 text-violet-800 dark:bg-violet-500/10 dark:text-violet-200">
                <Sparkles className="mt-0.5 size-3.5 shrink-0" />
                You&apos;ll be the workspace owner and can invite people once it&apos;s created.
            </div>
        </CenteredFormPage>
    );
}