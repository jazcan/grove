import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { isLocalDevProfileUploadAllowed, isObjectStorageConfigured } from "@/lib/object-storage";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extForType(ct: string): string {
  if (ct === "image/png") return "png";
  if (ct === "image/webp") return "webp";
  if (ct === "image/gif") return "gif";
  return "jpg";
}

/**
 * Saves a profile image to `public/uploads/profiles/…` when S3 is not configured.
 * Only runs in development; production should set S3_* env vars.
 */
export async function POST(request: Request) {
  if (!isLocalDevProfileUploadAllowed()) {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }
  if (isObjectStorageConfigured()) {
    return NextResponse.json(
      { error: "Object storage is configured; use the standard upload flow." },
      { status: 400 }
    );
  }

  const u = await getSessionUser();
  if (!u?.providerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }
  const contentType = file.type || "image/jpeg";
  if (!ALLOWED.has(contentType)) {
    return NextResponse.json({ error: "Invalid image type." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 5 MB." }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const ext = extForType(contentType);
  const relKey = `uploads/profiles/${u.providerId}/${id}.${ext}`;
  const absPath = path.join(process.cwd(), "public", relKey);
  await mkdir(path.dirname(absPath), { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(absPath, buf);

  return NextResponse.json({ key: relKey });
}
