import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { getEnv } from "@/lib/env";

const SALT = "grove-shopify-at";

function encryptionKey(): Buffer {
  return scryptSync(getEnv().SESSION_SECRET, SALT, 32);
}

/** AES-256-GCM; output is base64(iv|ciphertext|tag). */
export function encryptShopifyToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, enc, tag]).toString("base64url");
}

export function decryptShopifyToken(enc: string): string {
  const buf = Buffer.from(enc, "base64url");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(buf.length - 16);
  const data = buf.subarray(12, buf.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
