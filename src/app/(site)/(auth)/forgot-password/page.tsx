import Link from "next/link";
import { getCsrfTokenForForm } from "@/lib/csrf";
import { ForgotPasswordForm } from "./forgot-form";

export default async function ForgotPasswordPage() {
  const csrf = await getCsrfTokenForForm();
  return (
    <main id="main-content" className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold">Reset password</h1>
      <p className="mt-2 text-sm text-[color-mix(in_oklab,var(--foreground)_72%,transparent)]">
        We will email you a link if an account exists.
      </p>
      <ForgotPasswordForm csrf={csrf} />
      <p className="mt-6 text-sm">
        <Link href="/login" className="text-[var(--accent)] underline-offset-2 hover:underline">
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
