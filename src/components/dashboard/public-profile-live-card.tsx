import Link from "next/link";
import { CopyPublicProfileUrlButton } from "./copy-public-profile-url-button";

type Props = {
  username: string;
  profileUrl: string;
};

export function PublicProfileLiveCard({ username, profileUrl }: Props) {
  return (
    <section className="ui-card p-5 sm:p-7" aria-labelledby="profile-live-heading">
      <div className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 id="profile-live-heading" className="text-lg font-semibold tracking-tight">
            Your public profile is live
          </h2>
          <p className="ui-hint mt-2 max-w-prose leading-relaxed">
            Clients can view your services and request or book time with you.
          </p>
        </div>
        <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Link href={`/${username}`} className="ui-btn-primary inline-flex min-h-11 justify-center px-5 py-2.5 text-sm no-underline sm:py-3">
            View your profile
          </Link>
          <CopyPublicProfileUrlButton
            url={profileUrl}
            className="ui-btn-secondary inline-flex min-h-11 w-full justify-center px-5 py-2.5 text-sm font-semibold sm:w-auto sm:py-3"
          >
            Copy profile link
          </CopyPublicProfileUrlButton>
        </div>
      </div>
    </section>
  );
}
