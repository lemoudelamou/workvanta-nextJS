import { BriefcaseBusiness } from "lucide-react";

import { PageBody } from "@/components/ui/PageBody";
import { NotFoundNotice } from "@/components/ui/NotFoundNotice";

// Covers the workspace page, its team page and "New project". The workspace
// page also uses notFound() for people who aren't members, so it doesn't
// reveal whether the workspace exists; the copy covers both cases.
export default function WorkspaceNotFound() {
    return (
        <PageBody>
            <NotFoundNotice
                icon={<BriefcaseBusiness className="size-5" />}
                title="Workspace not available"
                message="This workspace doesn't exist, or you're not a member of it. If you were removed or the link is old, ask a workspace admin to invite you again."
                actions={[
                    { href: "/workspace", label: "All workspaces" },
                    { href: "/dashboard", label: "Dashboard" },
                ]}
            />
        </PageBody>
    );
}
