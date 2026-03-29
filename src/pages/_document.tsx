import { Head, Html, Main, NextScript } from "next/document";

/**
 * Minimal Pages Router document so `next dev` emits `.next/server/pages/_document.js`.
 * The app uses the App Router under `src/app`; this file exists only to satisfy internal
 * dev tooling that still resolves the legacy pages bundle (e.g. error overlay).
 */
export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
