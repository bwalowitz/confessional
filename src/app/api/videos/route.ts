import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { validateUpload } from "@/lib/validation";
import { parseMultipart } from "@/server/multipart";
import { getClientIp } from "@/server/request";
import { checkRateLimit } from "@/server/rate-limit";
import { uploadObject } from "@/server/s3";
import { listVideos } from "@/server/videos";
import { prisma } from "@/server/db";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

const extensionForMime = (mimeType: string) => {
  if (mimeType === "video/webm") return "webm";
  if (mimeType === "video/mp4") return "mp4";
  return "bin";
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limitRaw = searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;

  const { items, nextCursor } = await listVideos({ cursor, limit });

  return NextResponse.json({ items, nextCursor });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rate = await checkRateLimit(`upload:${ip}`, env.rateLimitMax, env.rateLimitWindowSeconds * 1000);

  if (!rate.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": String(rate.remaining),
          "X-RateLimit-Reset": String(rate.resetAt)
        }
      }
    );
  }

  let parsed;
  try {
    parsed = await parseMultipart(req, { maxFileSize: env.maxUploadBytes });
  } catch (error) {
    const reason = (error as Error).message;
    if (reason === "file_too_large") {
      return NextResponse.json({ error: "file_too_large" }, { status: 413 });
    }
    return NextResponse.json({ error: "invalid_upload" }, { status: 400 });
  }

  if (!parsed.file) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }

  const durationSeconds = Number(parsed.fields.durationSeconds ?? "0");
  const width = Number(parsed.fields.width ?? "0");
  const height = Number(parsed.fields.height ?? "0");

  const declaredMimeType = parsed.file.mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  const validation = validateUpload({
    declaredMimeType,
    fileBuffer: parsed.file.buffer,
    sizeBytes: parsed.file.size,
    maxBytes: env.maxUploadBytes,
    durationSeconds,
    width: Math.round(width),
    height: Math.round(height)
  });

  if (!validation.ok) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  const normalizedMimeType = validation.normalizedMimeType;
  const key = `videos/${randomUUID()}.${extensionForMime(normalizedMimeType)}`;
  const videoUrl = await uploadObject({
    key,
    body: parsed.file.buffer,
    contentType: normalizedMimeType
  });

  const record = await prisma.videoPost.create({
    data: {
      videoUrl,
      durationSeconds: Math.round(durationSeconds),
      width: Math.round(width),
      height: Math.round(height),
      mimeType: normalizedMimeType
    }
  });

  return NextResponse.json({ item: record }, { status: 201 });
}
