
import Link from "next/link";
import SigninForm from "./signin-form";
import LoginBrandPanel from "@/components/ui/workvanta-panel";
import WorkvantaBrand from "@/components/ui/workvanta-brand";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function SigninPage() {
  const session = await getSession();

  if (session?.user?.id) {
    redirect("/dashboard");
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

            <SigninForm />

            <p className="mt-8 text-center text-sm text-slate-500">
              New to Workvanta?{" "}
              <Link
                href="/signup"
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
