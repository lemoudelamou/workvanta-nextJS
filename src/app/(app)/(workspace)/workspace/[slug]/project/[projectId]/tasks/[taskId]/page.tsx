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
import Link from "next/link";
import { projectDot, projectHex } from "@/lib/navigation/project-color";

import { CommentForm } from "./components/comment-form";
import { ActivityFeed, type FeedItem } from "./components/activity-feed";
import { HIDDEN_IN_FEED } from "./components/activity-text";
import { AttachmentsSection } from "./components/attachments-section";
import { SubtasksSection } from "./components/subtasks-section";
import { DeleteTaskConfirmation } from "./components/delete-task-button";
import { TaskHeader } from "./components/task-header";
import { TaskProperties } from "./components/task-properties";
import { LabelPicker } from "./components/label-picker";
import { RepeatMenu } from "./components/repeat-menu";
import { DependenciesSection } from "./components/dependencies-section";
import { isRecurrence } from "@/lib/tasks/recurrence";
import { openBlockerCount } from "@/lib/tasks/dependencies";
import { CopyLinkButton } from "./components/copy-link-button";
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
            labels: { select: { labelId: true } },
            blockedBy: {
                orderBy: { createdAt: "asc" },
                select: { blockingTask: { select: { id: true, title: true, status: true } } },
            },
            blocking: {
                orderBy: { createdAt: "asc" },
                select: { blockedTask: { select: { id: true, title: true, status: true } } },
            },
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
    const canEdit = canEditTasks(access);

    const [people, projectLabels, otherTasks] = await Promise.all([
        listProjectAudience(access.project),
        prisma.label.findMany({
            where: { projectId: access.project.id },
            orderBy: { name: "asc" },
            select: { id: true, name: true, color: true },
        }),
        // Tasks that could be picked as a blocker.
        canEdit
            ? prisma.task.findMany({
                  where: { projectId: access.project.id, id: { not: task.id } },
                  orderBy: { updatedAt: "desc" },
                  take: 500,
                  select: { id: true, title: true, status: true },
              })
            : Promise.resolve([]),
    ]);
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

    const creatorName = task.creator ? (task.creator.name ?? task.creator.email) : "Unknown";

    return (
        <PageBody glow={projectHex(projectId)} className="max-w-[1440px] lg:py-6">
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

            {/* The task on a sheet; the conversation beside it on wide screens, below on phones. */}
            <div className="mt-4 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_420px] xl:gap-6">
                <article className="min-w-0 rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(23,26,33,0.04),0_8px_24px_-16px_rgba(23,26,33,0.12)]">
                    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 sm:px-8">
                        <Link
                            href={`/workspace/${slug}/project/${projectId}`}
                            className="flex min-w-0 items-center gap-2 rounded-full py-1 pr-2 text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand"
                        >
                            <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-[3px] ${projectDot(projectId)}`} />
                            <span className="truncate">{access.project.name}</span>
                        </Link>
                        <div className="flex shrink-0 items-center gap-0.5">
                            <CopyLinkButton />
                            {canEdit && <DeleteTaskConfirmation action={deleteTask} />}
                        </div>
                    </div>

                    <div className="space-y-8 px-4 pb-8 pt-6 sm:px-8 sm:pt-8">
                        <div className="space-y-4">
                            <TaskHeader key={`h-${version}`} values={values} canEdit={canEdit} updateTask={updateTask} />
                            <TaskProperties
                                key={`p-${version}`}
                                values={values}
                                people={people}
                                assignee={task.assignee}
                                overdue={overdue}
                                canEdit={canEdit}
                                updateTask={updateTask}
                                openBlockers={openBlockerCount(task.blockedBy.map((d) => d.blockingTask))}
                                extra={
                                    <RepeatMenu
                                        slug={slug}
                                        projectId={projectId}
                                        taskId={task.id}
                                        value={isRecurrence(task.recurrence) ? task.recurrence : null}
                                        canEdit={canEdit}
                                    />
                                }
                            />
                            <LabelPicker
                                slug={slug}
                                projectId={projectId}
                                taskId={task.id}
                                projectLabels={projectLabels}
                                initialSelected={task.labels.map((l) => l.labelId)}
                                canEdit={canEdit}
                            />
                        </div>

                        <SubtasksSection
                            taskId={task.id}
                            subtasks={task.subtasks}
                            slug={slug}
                            projectId={projectId}
                            canEdit={canEdit}
                        />

                        <DependenciesSection
                            slug={slug}
                            projectId={projectId}
                            taskId={task.id}
                            blockedBy={task.blockedBy.map((d) => d.blockingTask)}
                            blocking={task.blocking.map((d) => d.blockedTask)}
                            candidates={otherTasks}
                            canEdit={canEdit}
                        />

                        <AttachmentsSection
                            attachments={task.attachments}
                            canEdit={canEdit}
                            upload={uploadAttachment}
                            remove={deleteAttachment}
                        />

                        <p className="border-t border-border pt-4 text-xs text-muted-foreground">
                            Created by <span className="font-medium text-foreground">{creatorName}</span> on{" "}
                            {DATE.format(task.createdAt)}
                        </p>
                    </div>
                </article>

                <ActivityFeed
                    items={feed}
                    commentCount={task._count.comments}
                    composer={<CommentForm action={createComment} members={people} />}
                    currentUserId={userId}
                    members={people}
                    deleteComment={deleteComment}
                    updateComment={updateComment}
                    canModerate={canModerate}
                    showEarlierHref={truncated ? `${taskHref}?comments=all&activity=all` : null}
                />
            </div>
        </PageBody>
    );
}
