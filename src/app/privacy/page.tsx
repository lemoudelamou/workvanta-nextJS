import Link from "next/link";

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-[#F7F8FC] px-6 py-16">
            <div className="mx-auto max-w-3xl">
                <Link
                    href="/signup"
                    className="text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                    ← Back to signup
                </Link>

                <h1 className="mt-8 text-3xl font-semibold text-slate-900">
                    Privacy Policy
                </h1>

                <p className="mt-4 text-slate-600">
                    Your Privacy Policy content goes here.
                </p>
            </div>
        </main>
    );
}