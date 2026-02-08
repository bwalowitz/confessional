import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

const s3Client = new S3Client({
  region: env.s3Region,
  endpoint: env.s3Endpoint,
  forcePathStyle: env.s3ForcePathStyle,
  credentials: {
    accessKeyId: env.s3AccessKeyId,
    secretAccessKey: env.s3SecretAccessKey
  }
});

export const uploadObject = async ({
  key,
  body,
  contentType
}: {
  key: string;
  body: Buffer;
  contentType: string;
}) => {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.s3Bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable"
    })
  );

  const base = env.s3PublicBaseUrl.replace(/\/$/, "");
  return `${base}/${key}`;
};

export const deleteObject = async (key: string) => {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: env.s3Bucket,
      Key: key
    })
  );
};
