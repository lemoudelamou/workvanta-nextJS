import Link from "next/link";

import SignupForm from "./signup-form";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

import BrandPanel from "@/components/layout/workvanta-panel";
import WorkvantaBrand from "@/components/ui/workvanta-brand";

export default async function SignupPage() {

    const session = await getSession();

    if (session?.user?.id) {
        redirect("/dashboard");
    }
    return (
        <main className="min-h-screen bg-[#F7F8FC] text-[#111827]">
            <div className="grid min-h-screen lg:grid-cols-2">
                <BrandPanel />

                <section className="flex min-h-screen items-center justify-center px-6 py-12">
                    <div className="w-full max-w-md">
                        <WorkvantaBrand className="mb-12 justify-center lg:hidden" />

                        <div className="mb-8">
                            <h2 className="text-3xl font-semibold tracking-tight text-[#101828]">
                                Create your account
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                Start organizing your projects, tasks, and
                                workspace in one place.
                            </p>
                        </div>

                        <SignupForm />
                        <p className="mt-8 text-center text-sm text-slate-500">
                            Already have an account?{" "}
                            <Link
                                href="/signin"
                                className="font-medium text-indigo-600 transition hover:text-indigo-500"
                            >
                                Sign in
                            </Link>
                        </p>

                    </div>
                </section>
            </div>
        </main>
    );
}