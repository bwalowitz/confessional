import { NextRequest, NextResponse } from "next/server";
import {
  adminSessionCookie,
  createAdminSessionToken,
  isAdminPasswordValid
} from "@/server/admin-auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
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
