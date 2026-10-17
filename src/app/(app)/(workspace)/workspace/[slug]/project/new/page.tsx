import { ArrowLeft, ArrowRight, FolderKanban } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createProject } from "@/app/(app)/(workspace)/workspace/[slug]/project/new/project-actions";
import { AlertMessage } from "@/components/ui/AlertMessage";
import { CenteredFormPage } from "@/components/ui/PageBody";
import { IconBadge } from "@/components/ui/IconBadge";
import {
    Field,
    Input,
    Select,
    Textarea,
} from "@/components/ui/FormField";
import { buttonStyles } from "@/app/style/button-style";
import { canWorkspace } from "@/lib/auth/permissions";

export default async function NewProjectPage({
                                                 params,
                                                 searchParams,
                                             }: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ error?: string }>;
}) {
    const session = await getSession();

    if (!session?.user) {
        redirect("/signin");
    }

    const { slug } = await params;
    const { error } = await searchParams;

    const workspace = await prisma.workspace.findFirst({
        where: {
            slug,
            members: {
                some: {
                    userId: session.user.id,
                },
            },
        },
        select: {
            id: true,
            name: true,
            slug: true,
            members: {
                where: { userId: session.user.id },
                select: { role: true },
                take: 1,
            },
        },
    });

    if (!workspace) {
        notFound();
    }

    if (!canWorkspace(workspace.members[0]?.role, "projects.create")) {
        redirect(`/workspace/${workspace.slug}`);
    }


    const createProjectForWorkspace = async (formData: FormData) => {
        "use server";

        const result = await createProject(workspace.id, formData);

        if (result?.error === "duplicate-name") {
            redirect(
                `/workspace/${workspace.slug}/project/new?error=duplicate-name`,
            );
        }

        // Surface validation / permission failures instead of failing silently.
        if (result?.error) {
            redirect(
                `/workspace/${workspace.slug}/project/new?error=invalid`,
            );
        }
    };

    return (
        <CenteredFormPage>
            <Link
                href={`/workspace/${workspace.slug}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
            >
                <ArrowLeft className="size-4" />
                {workspace.name}
            </Link>

            <IconBadge solid className="mt-7">
                <FolderKanban />
            </IconBadge>

            <h1 className="mt-6 text-2xl font-semibold tracking-tight">
                Create a project
            </h1>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Projects give your team a focused place to plan, assign, and
                complete work.
            </p>

            {error === "invalid" && (
                <div className="mt-6">
                    <AlertMessage
                        variant="error"
                        title="Couldn't create the project"
                        message="Check the name and description and try again."
                    />
                </div>
            )}

            {error === "duplicate-name" && (
                <div className="mt-6">
                    <AlertMessage
                        variant="error"
                        title="A project with this name already exists"
                        message="Choose a different name for your new project in this workspace."
                    />
                </div>
            )}

            <form
                action={createProjectForWorkspace}
                className="mt-7 space-y-5"
            >
                <Field label="Project name">
                    <Input
                        required
                        name="name"
                        maxLength={100}
                        placeholder="e.g. Website redesign"
                    />
                </Field>

                <Field label="Description" optional>
                    <Textarea
                        name="description"
                        maxLength={500}
                        rows={4}
                        placeholder="What is this project trying to achieve?"
                    />
                </Field>

                <Field label="Who can access it?">
                    <Select name="visibility" defaultValue="WORKSPACE">
                        <option value="WORKSPACE">
                            Everyone in the workspace (members can edit)
                        </option>
                        <option value="PRIVATE">
                            Private — only people I add
                        </option>
                    </Select>
                </Field>

                <button
                    type="submit"
                    className={buttonStyles({
                        size: "lg",
                        className: "w-full",
                    })}
                >
                    Create project
                    <ArrowRight className="size-4" />
                </button>
            </form>
        </CenteredFormPage>
    );
}