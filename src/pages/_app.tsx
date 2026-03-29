import type { AppProps } from "next/app";

/**
 * Required companion to `_document` when the `pages` directory exists.
 * All real routes live under `src/app`; this is not used for normal navigation.
 */
export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
