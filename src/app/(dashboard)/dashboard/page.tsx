import { redirect } from "next/navigation";
import { Navbar } from "@/components/ui/navbar";
import { getSession } from "@/lib/auth/session";


export default async function DashboardPage() {
    const session = await getSession();

    if (!session?.user) {
        redirect("/signin");
    }



    return (
        <main>
            <Navbar session={session} />

            <section className="p-6">
                <h1>Dashboard</h1>
                <p>
                    Welcome, {session.user.name ?? session.user.email}
                </p>
            </section>
        </main>
    );
}