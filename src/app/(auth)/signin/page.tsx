
import Link from "next/link";
import SigninForm from "./signin-form";
import LoginBrandPanel from "@/components/ui/WorkvantaPanel";
import WorkvantaBrand from "@/components/ui/WorkvantaBrand";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { safeCallbackUrl, withCallbackUrl } from "@/lib/auth/callback-url";

export default async function SigninPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; deleted?: string }>;
}) {
  const session = await getSession();
  const { callbackUrl, deleted } = await searchParams;

  if (session?.user?.id) {
    redirect(safeCallbackUrl(callbackUrl));
  }



  return (
    <main className="min-h-screen bg-[#F7F8FC] text-[#111827]">
      <div className="grid min-h-screen lg:grid-cols-2">

        <LoginBrandPanel />

        <section className="flex min-h-screen items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">

            <WorkvantaBrand className="mb-12 justify-center lg:hidden" />

            <div className="mb-8">
              <h2 className="text-3xl font-semibold tracking-tight text-[#101828]">
                Welcome back
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Sign in to your Workvanta workspace and keep your team moving
                forward.
              </p>
            </div>

            {deleted === "1" && (
              <p
                role="status"
                className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
              >
                Your account has been deleted. Sorry to see you go.
              </p>
            )}

            <SigninForm />

            <p className="mt-8 text-center text-sm text-slate-500">
              New to Workvanta?{" "}
              <Link
                href={withCallbackUrl("/signup", callbackUrl)}
                className="font-medium text-indigo-600 transition hover:text-indigo-500"
              >
                Create an account
              </Link>
            </p>

          </div>
        </section>
      </div>
    </main>
  );
}
