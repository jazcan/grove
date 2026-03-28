type Props = { token: string };

export function CsrfField({ token }: Props) {
  return <input type="hidden" name="csrf" value={token} />;
}
