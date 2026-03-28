import Link from "next/link";
import { getCsrfTokenForForm } from "@/lib/csrf";
import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  const csrf = await getCsrfTokenForForm();

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-screen max-w-[min(100%,28rem)] flex-col justify-center overflow-x-hidden px-4 py-12 sm:py-16"
    >
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Create your account</h1>
      <p className="mt-3 text-base text-[var(--muted)]">
        Already have an account?{" "}
        <Link href="/login" className="ui-link font-semibold">
          Sign in
        </Link>
      </p>
      <SignupForm csrf={csrf} />
    </main>
  );
}
