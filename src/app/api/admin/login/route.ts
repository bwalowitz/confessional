import { NextRequest, NextResponse } from "next/server";
import {
  adminSessionCookie,
  createAdminSessionToken,
  isAdminPasswordValid
} from "@/server/admin-auth";
import { getClientIp } from "@/server/request";
import { checkRateLimit } from "@/server/rate-limit";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rate = await checkRateLimit(`admin-login:${ip}`, 10, env.rateLimitWindowSeconds * 1000);
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

  const body = await req.json().catch(() => null);
  const password = body?.password;

  if (typeof password !== "string" || !password) {
    return NextResponse.json({ error: "missing_password" }, { status: 400 });
  }

  if (!isAdminPasswordValid(password)) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const token = createAdminSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(adminSessionCookie(token));
  return response;
}
