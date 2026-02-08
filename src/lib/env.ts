const readEnv = (key: string, fallback?: string) => {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

export const env = {
  databaseUrl: readEnv("DATABASE_URL", ""),
  s3Region: readEnv("S3_REGION", "us-east-1"),
  s3Bucket: readEnv("S3_BUCKET", ""),
  s3Endpoint: process.env.S3_ENDPOINT,
  s3AccessKeyId: readEnv("S3_ACCESS_KEY_ID", ""),
  s3SecretAccessKey: readEnv("S3_SECRET_ACCESS_KEY", ""),
  s3PublicBaseUrl: readEnv("S3_PUBLIC_BASE_URL", ""),
  s3ForcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? "15000000"),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX ?? "8"),
  rateLimitWindowSeconds: Number(process.env.RATE_LIMIT_WINDOW_SECONDS ?? "300"),
  ipHashSalt: readEnv("IP_HASH_SALT", ""),
  appBaseUrl: process.env.NEXT_PUBLIC_BASE_URL ?? "",
  adminPassword: process.env.ADMIN_PASSWORD ?? ""
};
