import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getClientIp } from "@/server/request";
import { env } from "@/lib/env";
import { createHash } from "node:crypto";
import { checkRateLimit } from "@/server/rate-limit";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.videoPostId || typeof body.videoPostId !== "string") {
    return NextResponse.json({ error: "missing_video_post_id" }, { status: 400 });
  }

  const ip = getClientIp(req);
  const rate = await checkRateLimit(`report:${ip}`, env.rateLimitMax, env.rateLimitWindowSeconds * 1000);
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
  const ipHash = createHash("sha256").update(`${ip}:${env.ipHashSalt}`).digest("hex");

  try {
    const result = await prisma.$transaction(async (tx) => {
      const report = await tx.report.create({
        data: {
          videoPostId: body.videoPostId,
          ipHash
        }
      });

      const updated = await tx.videoPost.update({
        where: { id: body.videoPostId },
        data: { reportedCount: { increment: 1 } }
      });

      return { report, updated };
    });

    return NextResponse.json({ report: result.report, post: result.updated }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "already_reported" }, { status: 200 });
    }
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
