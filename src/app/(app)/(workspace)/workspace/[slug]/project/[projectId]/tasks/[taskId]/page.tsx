import { notFound, redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
    listProjectAudience,
    requireProjectAccess,
    type ProjectAccessResult,
} from "@/lib/auth/members";
import { canProject } from "@/lib/auth/permissions";
import { AccessDeniedNotice } from "@/components/ui/AccessDenied";
import { canEditTasks } from "@/lib/auth/task_permission";
import { Breadcrumb } from "@/components/ui/BreadCrumb";
import { PageBody } from "@/components/ui/PageBody";
import { projectHex } from "@/lib/navigation/project-color";

import { CommentForm } from "./components/comment-form";
import { ActivityFeed, type FeedItem } from "./components/activity-feed";
import { HIDDEN_IN_FEED } from "./components/activity-text";
import { AttachmentsSection } from "./components/attachments-section";
import { SubtasksSection } from "./components/subtasks-section";
import { DeleteTaskConfirmation } from "./components/delete-task-button";
import { TaskHeader } from "./components/task-header";
import { PropertyRow, TaskProperties } from "./components/task-properties";
import type { TaskValues } from "./components/task-meta";
import {
    createCommentAction,
    deleteAttachmentAction,
    deleteCommentAction,
    deleteTaskAction,
    updateCommentAction,
    updateTaskAction,
    uploadAttachmentAction,
} from "./task-actions";

const DATE = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

const USER_SELECT = { id: true, name: true, email: true, image: true } as const;

type TaskPageProps = {
    params: Promise<{ slug: string; projectId: string; taskId: string }>;
    searchParams?: Promise<{ comments?: string; activity?: string }>;
};

/** Newest comments / activity entries shown before "show all". */
const COMMENT_PAGE_SIZE = 50;
const ACTIVITY_PAGE_SIZE = 20;

export default async function TaskPage({ params, searchParams }: TaskPageProps) {
    const session = await getSession();
    if (!session?.user?.id) redirect("/signin");

    const userId = session.user.id;
    const { slug, projectId, taskId } = await params;
    const query = (await searchParams) ?? {};
    const showAllComments = query.comments === "all";
    const showAllActivity = query.activity === "all";
    const taskHref = `/workspace/${slug}/project/${projectId}/tasks/${taskId}`;

    // Check project access first so private projects never load task data
    // for people who can't open them.
    let access: ProjectAccessResult;

    try {
        access = await requireProjectAccess(slug, projectId);
    } catch (error) {
        const digest = (error as { digest?: string })?.digest;
        if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
            throw error;
        }
        // The project itself is gone: send people to the project URL so they
        // get the project's not-found page, not "this task was deleted".
        if (error instanceof Error && error.message === "Project not found.") {
            redirect(`/workspace/${slug}/project/${projectId}`);
        }
        return (
            <AccessDeniedNotice
                workspaceSlug={slug}
                message={
                    error instanceof Error
                        ? error.message
                        : "Something went wrong loading this task."
                }
            />
        );
    }

    const task = await prisma.task.findFirst({
        where: {
            id: taskId,
            projectId,
            project: {
                workspace: { is: { slug, members: { some: { userId } } } },
            },
        },
        include: {
            project: { include: { workspace: true } },
            creator: { select: USER_SELECT },
            assignee: { select: USER_SELECT },
            subtasks: { orderBy: { position: "asc" } },
            // Newest first so "take" keeps the latest; flipped back below.
            comments: {
                orderBy: { createdAt: "desc" },
                ...(showAllComments ? {} : { take: COMMENT_PAGE_SIZE }),
                include: { author: { select: USER_SELECT } },
            },
            attachments: { orderBy: { createdAt: "desc" } },
            activities: {
                orderBy: { createdAt: "desc" },
                ...(showAllActivity ? {} : { take: ACTIVITY_PAGE_SIZE }),
                include: { user: { select: USER_SELECT } },
            },
            _count: { select: { comments: true, activities: true } },
        },
    });

    if (!task) notFound();

    // Assignee and @mention suggestions only include people who can open
    // this project.
    const people = await listProjectAudience(access.project);

    const canEdit = canEditTasks(access);
    const canModerate = canProject(access.effectiveRole, "comment.moderate");

    const updateTask = updateTaskAction.bind(null, slug, projectId, taskId);
    const deleteTask = deleteTaskAction.bind(null, slug, projectId, taskId);
    const createComment = createCommentAction.bind(null, slug, projectId, taskId);
    const deleteComment = deleteCommentAction.bind(null, slug, projectId, taskId);
    const updateComment = updateCommentAction.bind(null, slug, projectId, taskId);
    const uploadAttachment = uploadAttachmentAction.bind(null, slug, projectId, taskId);
    const deleteAttachment = deleteAttachmentAction.bind(null, slug, projectId, taskId);

    const overdue = !!task.dueDate && task.status !== "DONE" && task.dueDate < new Date();

    const values: TaskValues = {
        title: task.title,
        description: task.description ?? "",
        status: task.status,
        priority: task.priority,
        assigneeId: task.assigneeId ?? "",
        dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : "",
    };
    // Reset in-place edits whenever the task changes underneath them.
    const version = [task.updatedAt?.getTime() ?? 0, ...Object.values(values)].join("|");

    // One stream: comments plus history, oldest first. Comment events are
    // left out because the comment itself is in the stream.
    const feed: FeedItem[] = [
        ...task.comments.map((comment) => ({ kind: "comment" as const, ...comment })),
        ...task.activities
            .filter((activity) => !HIDDEN_IN_FEED.has(activity.action))
            .map((activity) => ({ kind: "event" as const, ...activity })),
    ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const truncated =
        task._count.comments > task.comments.length || task._count.activities > task.activities.length;

    const currentUser = people.find((person) => person.id === userId) ?? null;

    return (
        <PageBody glow={projectHex(projectId)}>
            <Breadcrumb
                items={[
                    { label: task.project.workspace.name, href: `/workspace/${slug}`, truncate: true },
                    {
                        label: access.project.name,
                        href: `/workspace/${slug}/project/${projectId}`,
                        truncate: true,
                    },
                    { label: task.title, truncate: true },
                ]}
            />

            {/* Phones: header, properties, the work, then delete. Wide screens: properties in a
                sticky column (the aside is display:contents below xl so its parts can be ordered). */}
            <div className="mt-6 grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px] xl:grid-rows-[auto_1fr] xl:gap-x-12">
                <header className="min-w-0 xl:col-start-1 xl:row-start-1">
                    <TaskHeader key={`h-${version}`} values={values} canEdit={canEdit} updateTask={updateTask} />
                </header>

                <aside
                    aria-label="Task properties"
                    className="contents xl:sticky xl:top-6 xl:z-10 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:block xl:min-w-0 xl:self-start"
                >
                    <div className="rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(23,26,33,0.04)]">
                        <TaskProperties
                            key={`p-${version}`}
                            values={values}
                            people={people}
                            assignee={task.assignee}
                            overdue={overdue}
                            canEdit={canEdit}
                            updateTask={updateTask}
                            footer={
                                <>
                                    <PropertyRow label="Created by">
                                        {task.creator ? (task.creator.name ?? task.creator.email) : "Unknown"}
                                    </PropertyRow>
                                    <PropertyRow label="Created">{DATE.format(task.createdAt)}</PropertyRow>
                                </>
                            }
                        />
                    </div>

                    {canEdit && (
                        <div className="order-last -mt-4 xl:order-none xl:mt-3 xl:px-2">
                            <DeleteTaskConfirmation action={deleteTask} />
                        </div>
                    )}
                </aside>

                <div className="min-w-0 space-y-10 xl:col-start-1 xl:row-start-2">
                    <SubtasksSection
                        taskId={task.id}
                        subtasks={task.subtasks}
                        slug={slug}
                        projectId={projectId}
                        canEdit={canEdit}
                    />

                    <AttachmentsSection
                        attachments={task.attachments}
                        canEdit={canEdit}
                        upload={uploadAttachment}
                        remove={deleteAttachment}
                    />

                    <ActivityFeed
                        items={feed}
                        commentCount={task._count.comments}
                        composer={<CommentForm action={createComment} members={people} />}
                        currentUser={currentUser}
                        currentUserId={userId}
                        members={people}
                        deleteComment={deleteComment}
                        updateComment={updateComment}
                        canModerate={canModerate}
                        showEarlierHref={truncated ? `${taskHref}?comments=all&activity=all` : null}
                    />
                </div>
            </div>
        </PageBody>
    );
}
