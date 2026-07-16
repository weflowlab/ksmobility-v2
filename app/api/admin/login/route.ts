import { NextResponse } from "next/server";
import { createSession, ADMIN_COOKIE, ADMIN_MAX_AGE } from "@/lib/adminAuth";

// 서버에서 비밀번호 검증 → 성공 시 httpOnly 세션 쿠키 발급
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { password?: string };
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_PASSWORD 환경변수가 설정되지 않았습니다." },
      { status: 500 },
    );
  }
  if (body.password !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, createSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_MAX_AGE,
  });
  return res;
}