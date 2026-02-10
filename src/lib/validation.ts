export const allowedVideoTypes = ["video/webm", "video/mp4"] as const;

type AllowedVideoType = (typeof allowedVideoTypes)[number];

export type UploadValidationInput = {
  declaredMimeType: string;
  fileBuffer: Buffer;
  sizeBytes: number;
  maxBytes: number;
  durationSeconds: number;
  width: number;
  height: number;
};

export type UploadValidationResult =
  | { ok: true; normalizedMimeType: AllowedVideoType }
  | { ok: false; reason: string };

const isWebm = (buffer: Buffer) => {
  if (buffer.length < 4) return false;
  return (
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  );
};

const isMp4 = (buffer: Buffer) => {
  if (buffer.length < 12) return false;
  const boxSize = buffer.readUInt32BE(0);
  const boxType = buffer.subarray(4, 8).toString("ascii");
  const brand = buffer.subarray(8, 12).toString("ascii");
  return boxSize >= 8 && boxType === "ftyp" && brand.length === 4;
};

export const sniffVideoMimeType = (buffer: Buffer): AllowedVideoType | null => {
  if (isWebm(buffer)) return "video/webm";
  if (isMp4(buffer)) return "video/mp4";
  return null;
};

export const validateUpload = ({
  declaredMimeType,
  fileBuffer,
  sizeBytes,
  maxBytes,
  durationSeconds,
  width,
  height
}: UploadValidationInput): UploadValidationResult => {
  if (sizeBytes < 1024) {
    return { ok: false, reason: "file_too_small" };
  }

  if (sizeBytes > maxBytes) {
    return { ok: false, reason: "size_exceeded" };
  }

  const sniffedMimeType = sniffVideoMimeType(fileBuffer);
  if (!sniffedMimeType) {
    return { ok: false, reason: "invalid_container" };
  }

  if (!allowedVideoTypes.includes(declaredMimeType as AllowedVideoType)) {
    return { ok: false, reason: "unsupported_mime" };
  }

  if (declaredMimeType !== sniffedMimeType) {
    return { ok: false, reason: "mime_mismatch" };
  }

  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > 30) {
    return { ok: false, reason: "invalid_duration" };
  }

  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    return { ok: false, reason: "invalid_dimensions" };
  }

  if (width < 64 || height < 64 || width > 1920 || height > 1920) {
    return { ok: false, reason: "invalid_dimensions" };
  }

  return { ok: true, normalizedMimeType: sniffedMimeType };
};
