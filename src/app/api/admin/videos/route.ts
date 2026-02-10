import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { deleteObject } from "@/server/s3";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/server/admin-auth";

export const runtime = "nodejs";

const requireAdmin = (req: NextRequest) => {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!token || !verifyAdminSessionToken(token)) {
    return false;
  }
  return true;
};

const keyFromPublicUrl = (rawUrl: string) => {
  try {
    const parsed = new URL(rawUrl);
    let key = parsed.pathname.replace(/^\/+/, "");
    if (!key) return null;
    const bucketName = process.env.S3_BUCKET ?? "";
    if (bucketName && key.startsWith(`${bucketName}/`)) {
      key = key.slice(bucketName.length + 1);
    }
    return key || null;
  } catch {
    return null;
  }
};

export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const items = await prisma.videoPost.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }]
  });

  return NextResponse.json({ items });
}

export async function DELETE(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const id = body?.id;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const post = await prisma.videoPost.findUnique({ where: { id } });
  if (!post) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const key = keyFromPublicUrl(post.videoUrl);
  await prisma.$transaction(async (tx) => {
    await tx.report.deleteMany({ where: { videoPostId: id } });
    await tx.videoPost.delete({ where: { id } });
  });

  if (key) {
    await deleteObject(key);
  }

  return NextResponse.json({ ok: true });
}
