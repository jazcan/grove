import Image from "next/image";

type Props = {
  /** Approximate square size in CSS pixels (logo asset is square). */
  size?: number;
  className?: string;
};

/** Main Handshake Local logo (`hsl-logo.svg`) — use in header beside the wordmark. */
export function HandshakeLogo({ size = 40, className }: Props) {
  return (
    <Image
      src="/brand/hsl-logo.svg"
      width={size}
      height={size}
      alt=""
      className={className}
      unoptimized
    />
  );
}
