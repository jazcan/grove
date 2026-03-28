"use client";

import { useCallback, useState } from "react";

type Props = {
  url: string;
  className?: string;
  children: React.ReactNode;
  copiedLabel?: string;
};

export function CopyPublicProfileUrlButton({
  url,
  className,
  children,
  copiedLabel = "Copied",
}: Props) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore — clipboard may be blocked */
    }
  }, [url]);

  return (
    <button type="button" onClick={onCopy} className={className}>
      {copied ? copiedLabel : children}
    </button>
  );
}
