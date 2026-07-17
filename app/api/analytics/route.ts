import { NextResponse } from "next/server";
import { pageViewStore } from "@/lib/store";
import { isAdmin } from "@/lib/adminAuth";

export async function GET(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const days = Math.min(Math.max(Number(searchParams.get("days")) || 30, 1), 90);
  const rows = await pageViewStore.getRecent(days);
  return NextResponse.json(rows);
}