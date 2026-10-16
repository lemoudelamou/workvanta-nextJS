import { cache } from "react";

import { prisma } from "@/lib/db/prisma";


export const getIsWorkspaceOwner = cache(async (userId: string) => {
    const count = await prisma.workspaceMember.count({
        where: { userId, role: "OWNER" },
    });

    return count > 0;
});