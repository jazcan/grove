import Link from "next/link";
import { verifyEmailToken } from "@/domain/auth/actions";

type Props = { searchParams: Promise<{ token?: string }> };

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token = "" } = await searchParams;
  const result =
    token ? ((await verifyEmailToken(token)) ?? { error: "Verification failed." }) : { error: "Missing token." };

  return (
    <main id="main-content" className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold">Email verification</h1>
      {result.error ? (
        <p className="mt-4 text-[var(--error)]" role="alert">
          {result.error}
        </p>
      ) : (
        <p className="mt-4" role="status">
          {result.success}
        </p>
      )}
      <p className="mt-8 text-sm">
        <Link href="/dashboard" className="text-[var(--accent)] underline-offset-2 hover:underline">
          Go to dashboard
        </Link>
      </p>
    </main>
  );
}
