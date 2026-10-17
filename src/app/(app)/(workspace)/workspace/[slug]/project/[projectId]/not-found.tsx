"use client";

import { useParams } from "next/navigation";
import { ArrowLeft, FolderX } from "lucide-react";

import { PageBody } from "@/components/ui/PageBody";
import { NotFoundNotice } from "@/components/ui/NotFoundNotice";

// Covers the project page and its members page, plus task links whose
// project is gone (the task page sends those here).
export default function ProjectNotFound() {
    const { slug } = useParams<{ slug: string }>();

    return (
        <PageBody>
            <NotFoundNotice
                icon={<FolderX className="size-5" />}
                title="This project no longer exists"
                message="It may have been deleted, or the link is out of date. Its tasks were removed with it."
                actions={[
                    {
                        href: `/workspace/${slug}`,
                        label: "Back to workspace",
                        icon: <ArrowLeft className="size-4" aria-hidden="true" />,
                    },
                    { href: "/dashboard", label: "Dashboard" },
                ]}
            />
        </PageBody>
    );
}
