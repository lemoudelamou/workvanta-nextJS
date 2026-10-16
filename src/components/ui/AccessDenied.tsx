import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { buttonStyles } from "@/app/style/button-style";

export function AccessDeniedNotice({
                                       message,
                                       workspaceSlug,
                                   }: {
    message: string;
    workspaceSlug: string;
}) {
    return (
        <main className="flex min-h-[70dvh] items-center justify-center px-4 text-foreground">
            <Card as="div" className="max-w-sm p-8 text-center">
                <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded-full bg-danger/10 text-danger">
                    <ShieldAlert className="size-5" />
                </div>
                <h1 className="text-lg font-semibold">Access denied</h1>
                <p className="mt-2 text-sm text-muted-foreground">{message}</p>
                <Link
                    href={`/workspace/${workspaceSlug}`}
                    className={buttonStyles({ className: "mt-5" })}
                >
                    Back to workspace
                </Link>
            </Card>
        </main>
    );
}