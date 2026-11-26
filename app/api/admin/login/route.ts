import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminCookieValue, passwordMatches } from "@/lib/admin";
import { rateLimited } from "@/lib/images";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(`login:${ip}`, 5)) return NextResponse.json({ error: "Too many attempts. Wait a minute." }, { status: 429 });
  const body = (await req.json().catch(() => ({}))) as { password?: string };
  if (!adminCookieValue()) return NextResponse.json({ error: "ADMIN_PASSWORD isn't set in .env." }, { status: 500 });
  if (!body.password || !passwordMatches(body.password)) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, adminCookieValue()!, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}
