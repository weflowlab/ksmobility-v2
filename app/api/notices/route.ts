import { NextResponse } from "next/server";
import { noticeStore } from "@/lib/store";
import { isAdmin } from "@/lib/adminAuth";

// 관리자면 임시저장 포함 전체, 아니면 게시된 공지만 (사이트에서 사용)
export async function GET() {
  const rows = (await isAdmin())
    ? await noticeStore.getAll()
    : await noticeStore.getPublished();
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { title, body: content, published, pinned } = body;
  if (!title?.trim()) {
    return NextResponse.json({ error: "제목은 필수입니다." }, { status: 400 });
  }
  const item = await noticeStore.create({
    title: title.trim(),
    body: content || "",
    published: published ?? true,
    pinned: !!pinned,
  });
  return NextResponse.json(item, { status: 201 });
}