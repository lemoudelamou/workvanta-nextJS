import Link from "next/link";

import SignupGate from "./signup-gate";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { safeCallbackUrl, withCallbackUrl } from "@/lib/auth/callback-url";

import BrandPanel from "@/components/ui/WorkvantaPanel";
import WorkvantaBrand from "@/components/ui/WorkvantaBrand";

export default async function SignupPage({
    searchParams,
}: {
    searchParams: Promise<{ callbackUrl?: string }>;
}) {
    const session = await getSession();
    const { callbackUrl } = await searchParams;

    if (session?.user?.id) {
        redirect(safeCallbackUrl(callbackUrl));
    }

    return (
        <main className="min-h-screen bg-[#F7F8FC] text-[#111827]">
            <div className="grid min-h-screen lg:grid-cols-2">
                <BrandPanel />

                <section className="flex min-h-screen items-center justify-center px-6 py-12">
                    <div className="w-full max-w-md">
                        <WorkvantaBrand className="mb-12 justify-center lg:hidden" />

                        <SignupGate />

                        <p className="mt-8 text-center text-sm text-slate-500">
                            Already have an account?{" "}
                            <Link
                                href={withCallbackUrl("/signin", callbackUrl)}
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