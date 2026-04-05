import Link from "next/link";
import { getCsrfTokenForForm } from "@/lib/csrf";
import { isSafeInternalPath } from "@/lib/safe-internal-path";
import { LoginForm } from "./login-form";

type Props = { searchParams: Promise<{ next?: string; ref?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const csrf = await getCsrfTokenForForm();
  const sp = await searchParams;
  const nextRaw = typeof sp.next === "string" ? sp.next : "";
  const next = isSafeInternalPath(nextRaw) ? nextRaw : "";
  const refRaw = typeof sp.ref === "string" ? sp.ref : "";
  const signupHref =
    refRaw.length > 0 ? `/signup?ref=${encodeURIComponent(refRaw)}` : "/signup";

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-screen max-w-[min(100%,28rem)] flex-col justify-center overflow-x-hidden px-4 py-12 sm:py-16"
    >
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Sign in</h1>
      <p className="mt-3 text-base text-[var(--muted)]">
        New here?{" "}
        <Link href={signupHref} className="ui-link font-semibold">
          Create an account
        </Link>
      </p>
      <LoginForm csrf={csrf} next={next} />
      <p className="mt-6 text-sm">
        <Link href="/forgot-password" className="ui-link font-medium">
          Forgot password?
        </Link>
      </p>
    </main>
  );
}
