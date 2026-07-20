import { NextResponse } from "next/server";
import { pageViewStore } from "@/lib/store";
import { isAdmin } from "@/lib/adminAuth";

export async function GET(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("days");
  // days=all 이면 기간 제한 없이 전체 (관리자 '전체' 선택)
  const days =
    raw === "all" ? null : Math.min(Math.max(Number(raw) || 30, 1), 3650);
  const rows = await pageViewStore.getRecent(days);
  return NextResponse.json(rows);
}