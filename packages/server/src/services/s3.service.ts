import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getEnv } from "../config/env.js";
import path from "path";

function getS3Client(): S3Client {
  const env = getEnv();
  if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY || !env.S3_BUCKET) {
    throw new Error("S3 not configured: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and S3_BUCKET are required");
  }
  return new S3Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Generate a presigned PUT URL for uploading a CV to S3.
 * Returns the upload URL and the S3 key the file will be stored at.
 */
export async function generateUploadUrl(
  contributorId: string,
  fileName: string,
  mimeType: string,
): Promise<{ uploadUrl: string; s3Key: string }> {
  const env = getEnv();
  if (!env.S3_BUCKET) {
    throw new Error("S3 not configured: S3_BUCKET is required");
  }

  const ext = path.extname(fileName).toLowerCase() || "";
  const timestamp = Date.now();
  const s3Key = `cvs/${contributorId}/${timestamp}${ext}`;

  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: s3Key,
    ContentType: mimeType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });
  return { uploadUrl, s3Key };
}

/**
 * Generate a presigned GET URL for downloading an S3 object.
 * Returns the download URL valid for expiresIn seconds (default 300).
 */
export async function generateDownloadUrl(
  s3Key: string,
  expiresIn = 300,
): Promise<string> {
  const env = getEnv();
  if (!env.S3_BUCKET) {
    throw new Error("S3 not configured: S3_BUCKET is required");
  }

  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: s3Key,
  });

  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Download an S3 object and return its contents as a Buffer.
 */
export async function getObjectBuffer(s3Key: string): Promise<Buffer> {
  const env = getEnv();
  if (!env.S3_BUCKET) {
    throw new Error("S3 not configured: S3_BUCKET is required");
  }

  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: s3Key,
  });

  const response = await client.send(command);
  if (!response.Body) {
    throw new Error(`S3 object not found: ${s3Key}`);
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
