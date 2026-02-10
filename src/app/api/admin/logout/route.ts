import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/server/admin-auth";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0
  });
  return response;
}
