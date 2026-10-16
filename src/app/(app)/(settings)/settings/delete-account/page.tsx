import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { getOwnedWorkspaces } from "@/lib/account/owned-workspaces";

import DeleteAccountScreen from "./delete-account";

export default async function DeleteAccountPage() {
    const session = await getSession();

    if (!session?.user?.id) {
        redirect("/signin?callbackUrl=%2Fsettings%2Fdelete-account");
    }

    const { shared, solo } = await getOwnedWorkspaces(session.user.id);

    return (
        <DeleteAccountScreen
            blockingWorkspaces={shared.map(({ name, slug, memberCount }) => ({
                name,
                slug,
                memberCount,
            }))}
            soloWorkspaceNames={solo.map((w) => w.name)}
        />
    );
}
