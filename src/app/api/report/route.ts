import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getClientIp } from "@/server/request";
import { env } from "@/lib/env";
import { createHash } from "node:crypto";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.videoPostId || typeof body.videoPostId !== "string") {
    return NextResponse.json({ error: "missing_video_post_id" }, { status: 400 });
  }

  const ip = getClientIp(req);
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
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
