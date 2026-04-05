"use client";

import { useCallback, useState } from "react";

type Props = {
  text: string;
  className?: string;
  children: React.ReactNode;
};

export function LocalAmbassadorCopyButton({ text, className, children }: Props) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [text]);

  return (
    <button type="button" onClick={onCopy} className={className}>
      {copied ? "Copied" : children}
    </button>
  );
}
