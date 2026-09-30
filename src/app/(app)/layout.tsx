import { redirect } from "next/navigation";

import { Navbar } from "@/components/ui/Navbar";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export default async function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();

    if (!session?.user) {
        redirect("/signin");
    }


    return (
        <>
            <Navbar
                session={session}
            />
            {children}
        </>
    );
}