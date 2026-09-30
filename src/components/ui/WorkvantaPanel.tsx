import WorkvantaBrand from "@/components/ui/WorkvantaBrand";

export default function LoginBrandPanel() {
  return (
    <section className="relative hidden overflow-hidden bg-[#101828] lg:flex">
      {/* Decorative shapes */}
      <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />

      <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">
        {/* Brand */}
        <WorkvantaBrand light />

        {/* Main content */}
        <div className="max-w-xl">
          <div className="mb-6 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
            ✦ Built for modern teams
          </div>

          <h1 className="text-5xl font-semibold leading-[1.08] tracking-tight text-white xl:text-6xl">
            Work smarter.
            <br />
            <span className="text-indigo-400">
              Manage everything.
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-400">
            One powerful workspace to manage projects, teams, tasks,
            workflows, and everything that keeps your business moving.
          </p>

          {/* Dashboard preview */}
          <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-2xl backdrop-blur">
            <div className="rounded-xl bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400">
                    PROJECT OVERVIEW
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    Product launch
                  </p>
                </div>

                <div className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600">
                  On track
                </div>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-[72%] rounded-full bg-indigo-500" />
              </div>

              <div className="mt-3 flex justify-between text-xs text-slate-400">
                <span>72% complete</span>
                <span>18 tasks remaining</span>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <p className="text-sm text-slate-500">
          © 2026 Workvanta. All rights reserved.
        </p>
      </div>
    </section>
  );
}