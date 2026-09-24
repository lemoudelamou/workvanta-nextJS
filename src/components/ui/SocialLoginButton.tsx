import GithubIcon from "@/app/style/githubIcon";
import GoogleIcon from "@/app/style/googleIcon";

type Props = {
    provider: "google" | "github";
};

const labels = {
    google: "Google",
    github: "GitHub",
} as const;

export default function SocialLoginButton({ provider }: Props) {
    return (
        <a
            href={`/api/oauth/${provider}`}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
            {provider === "google" ? (
                <GoogleIcon />
            ) : (
                <GithubIcon />
            )}
            {labels[provider]}
        </a>
    );
}