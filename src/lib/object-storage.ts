/** True when presigned S3 uploads are available (see `/api/upload/presign`). */
export function isObjectStorageConfigured(): boolean {
  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  return Boolean(endpoint && bucket && accessKeyId && secretAccessKey);
}

/** Local disk uploads under `public/uploads/` — development only (see `/api/upload/profile`). */
export function isLocalDevProfileUploadAllowed(): boolean {
  return process.env.NODE_ENV === "development";
}
