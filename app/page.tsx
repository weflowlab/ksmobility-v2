import { noticeStore, faqStore } from "@/lib/store";
import {
  DEFAULT_FAQ,
  DEFAULT_NOTICES,
  type FaqView,
  type NoticeView,
} from "./defaults";
import HomeClient from "./HomeClient";

// 공지·FAQ는 관리자(/admin)에서 수정되므로 주기적으로 다시 생성한다.
// 정적 프리렌더는 유지하면서 최대 60초 뒤 반영 (SEO·TTFB 손해 없음).
export const revalidate = 60;

async function getNotices(): Promise<NoticeView[]> {
  try {
    const rows = await noticeStore.getPublished();
    return rows.map((n) => ({
      id: n.id,
      date: new Date(n.createdAt)
        .toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
        .replace(/\.\s?$/, "")
        .replace(/\.\s/g, "."),
      title: n.title,
      body: n.body,
    }));
  } catch {
    // Supabase 미설정·장애 — 사이트에서 섹션이 통째로 사라지지 않도록 기본값 유지
    return DEFAULT_NOTICES;
  }
}

async function getFaqs(): Promise<FaqView[]> {
  try {
    const rows = await faqStore.getPublished();
    return rows.map((f) => ({ id: f.id, q: f.question, a: f.answer }));
  } catch {
    return DEFAULT_FAQ;
  }
}

export default async function Page() {
  const [notices, faqs] = await Promise.all([getNotices(), getFaqs()]);
  return <HomeClient notices={notices} faqs={faqs} />;
}