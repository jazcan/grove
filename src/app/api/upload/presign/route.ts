import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSessionUser } from "@/lib/session";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { providers } from "@/db/schema";

/**
 * Returns a presigned PUT URL for profile images when S3 env is configured.
 */
export async function POST(request: Request) {
  const u = await getSessionUser();
  if (!u?.providerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION ?? "us-east-1";
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    return NextResponse.json({ error: "Object storage is not configured." }, { status: 501 });
  }

  const body = (await request.json().catch(() => null)) as { contentType?: string } | null;
  const contentType = body?.contentType ?? "image/jpeg";
  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ error: "Invalid content type" }, { status: 400 });
  }

  const db = getDb();
  const [prov] = await db
    .select({ id: providers.id })
    .from(providers)
    .where(eq(providers.id, u.providerId))
    .limit(1);
  if (!prov) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const key = `profiles/${u.providerId}/${crypto.randomUUID()}`;
  const client = new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });

  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(client, cmd, { expiresIn: 60 });
  const publicBase = process.env.S3_PUBLIC_BASE_URL ?? `${endpoint.replace(/\/$/, "")}/${bucket}`;

  return NextResponse.json({
    url,
    key,
    publicUrl: `${publicBase.replace(/\/$/, "")}/${key}`,
  });
}
