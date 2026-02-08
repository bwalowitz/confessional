export const allowedVideoTypes = ["video/webm", "video/mp4"] as const;

export type UploadValidationInput = {
  mimeType: string;
  sizeBytes: number;
  maxBytes: number;
  durationSeconds: number;
};

export type UploadValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

export const validateUpload = ({
  mimeType,
  sizeBytes,
  maxBytes,
  durationSeconds
}: UploadValidationInput): UploadValidationResult => {
  if (!allowedVideoTypes.includes(mimeType as (typeof allowedVideoTypes)[number])) {
    return { ok: false, reason: "unsupported_mime" };
  }

  if (sizeBytes > maxBytes) {
    return { ok: false, reason: "size_exceeded" };
  }

  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > 30) {
    return { ok: false, reason: "invalid_duration" };
  }

  return { ok: true };
};
