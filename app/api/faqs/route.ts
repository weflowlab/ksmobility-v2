import { NextResponse } from "next/server";
import { faqStore } from "@/lib/store";
import { isAdmin } from "@/lib/adminAuth";

// 관리자면 비공개 포함 전체, 아니면 공개된 FAQ만 (사이트에서 사용)
export async function GET() {
  const rows = (await isAdmin())
    ? await faqStore.getAll()
    : await faqStore.getPublished();
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { question, answer, published } = body;
  if (!question?.trim()) {
    return NextResponse.json({ error: "질문은 필수입니다." }, { status: 400 });
  }
  const item = await faqStore.create({
    question: question.trim(),
    answer: answer?.trim() || "",
    published: published ?? true,
  });
  return NextResponse.json(item, { status: 201 });
}