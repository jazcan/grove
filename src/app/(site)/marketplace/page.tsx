import { redirect } from "next/navigation";

/** Legacy URL; redirects home—public directory UI is not shipped. */
export default function LegacyDirectoryRedirectPage() {
  redirect("/");
}
