"use client";

import { useParams } from "next/navigation";
import { ArrowLeft, Bell, Trash2 } from "lucide-react";

import { PageBody } from "@/components/ui/PageBody";
import { NotFoundNotice } from "@/components/ui/NotFoundNotice";

export default function TaskNotFound() {
    const { slug, projectId } = useParams<{ slug: string; projectId: string }>();

    return (
        <PageBody>
            <NotFoundNotice
                icon={<Trash2 className="size-5" />}
                title="This task has been deleted"
                message="The task you're looking for no longer exists. It may have been removed by someone on your team."
                actions={[
                    {
                        href: `/workspace/${slug}/project/${projectId}`,
                        label: "Back to project",
                        icon: <ArrowLeft className="size-4" aria-hidden="true" />,
                    },
                    {
                        href: "/notifications",
                        label: "Notifications",
                        icon: <Bell className="size-4" aria-hidden="true" />,
                    },
                ]}
            />
        </PageBody>
    );
}
