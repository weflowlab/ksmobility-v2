import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";

// 현재 로그인 상태 확인용 (관리자 페이지 진입 시 호출)
export async function GET() {
  return NextResponse.json({ authed: await isAdmin() });
}