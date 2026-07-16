import { NextResponse } from "next/server";
import { faqStore } from "@/lib/store";
import { isAdmin } from "@/lib/adminAuth";

// body: { ids: string[] } — 원하는 표시 순서대로 나열된 FAQ id 목록
export async function PUT(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const ids = body?.ids;
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
    return NextResponse.json(
      { error: "ids 는 문자열 배열이어야 합니다." },
      { status: 400 },
    );
  }
  const ok = await faqStore.reorder(ids);
  if (!ok)
    return NextResponse.json({ error: "순서 변경에 실패했습니다." }, { status: 500 });
  return NextResponse.json({ success: true });
}