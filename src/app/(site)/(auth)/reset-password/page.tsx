import Link from "next/link";
import { getCsrfTokenForForm } from "@/lib/csrf";
import { ResetPasswordForm } from "./reset-form";

type Props = { searchParams: Promise<{ token?: string }> };

export default async function ResetPasswordPage({ searchParams }: Props) {
  const csrf = await getCsrfTokenForForm();
  const { token = "" } = await searchParams;

  return (
    <main id="main-content" className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold">Choose a new password</h1>
      <ResetPasswordForm csrf={csrf} token={token} />
      <p className="mt-6 text-sm">
        <Link href="/login" className="text-[var(--accent)] underline-offset-2 hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
