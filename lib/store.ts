import { getSupabase } from "./supabase";

export type Status = "pending" | "in_progress" | "done";

export interface Inquiry {
  id: string;
  status: Status;
  name: string;
  phone: string;
  note: string;
  source: string;
  agree: boolean;
  createdAt: string;
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  published: boolean;
  pinned: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  published: boolean;
  sortOrder: number;
  createdAt: string;
}

function toInquiry(row: Record<string, unknown>): Inquiry {
  return {
    id: row.id as string,
    status: row.status as Status,
    name: row.name as string,
    phone: row.phone as string,
    note: (row.note as string) || "",
    source: (row.source as string) || "web",
    agree: (row.agree as boolean) || false,
    createdAt: row.created_at as string,
  };
}

function toNotice(row: Record<string, unknown>): Notice {
  return {
    id: row.id as string,
    title: row.title as string,
    body: (row.body as string) || "",
    published: (row.published as boolean) ?? true,
    pinned: (row.pinned as boolean) || false,
    sortOrder: (row.sort_order as number) ?? 0,
    createdAt: row.created_at as string,
  };
}

function toFaq(row: Record<string, unknown>): Faq {
  return {
    id: row.id as string,
    question: row.question as string,
    answer: (row.answer as string) || "",
    published: (row.published as boolean) ?? true,
    sortOrder: (row.sort_order as number) ?? 0,
    createdAt: row.created_at as string,
  };
}

export const inquiryStore = {
  getAll: async (): Promise<Inquiry[]> => {
    const { data, error } = await getSupabase()
      .from("inquiries")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toInquiry);
  },

  create: async (
    input: Omit<Inquiry, "id" | "status" | "createdAt">,
  ): Promise<Inquiry> => {
    const { data, error } = await getSupabase()
      .from("inquiries")
      .insert({ ...input, status: "pending" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toInquiry(data);
  },

  update: async (id: string, patch: Partial<Inquiry>): Promise<Inquiry | null> => {
    const { createdAt: _drop, ...rest } = patch as Partial<Inquiry> & {
      createdAt?: string;
    };
    const { data, error } = await getSupabase()
      .from("inquiries")
      .update(rest)
      .eq("id", id)
      .select()
      .single();
    if (error) return null;
    return toInquiry(data);
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await getSupabase().from("inquiries").delete().eq("id", id);
    return !error;
  },
};

export const noticeStore = {
  // 관리자용 — 임시저장 포함 전체
  getAll: async (): Promise<Notice[]> => {
    const { data, error } = await getSupabase()
      .from("notices")
      .select("*")
      .order("pinned", { ascending: false })
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toNotice);
  },

  // 사이트 노출용 — 게시된 것만
  getPublished: async (): Promise<Notice[]> => {
    const { data, error } = await getSupabase()
      .from("notices")
      .select("*")
      .eq("published", true)
      .order("pinned", { ascending: false })
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toNotice);
  },

  // 새 공지는 목록 맨 위로 (sort_order 를 현재 최솟값보다 작게)
  create: async (
    input: Omit<Notice, "id" | "createdAt" | "sortOrder">,
  ): Promise<Notice> => {
    const { data: top } = await getSupabase()
      .from("notices")
      .select("sort_order")
      .order("sort_order", { ascending: true })
      .limit(1);
    const sort_order = ((top?.[0]?.sort_order as number) ?? 0) - 1;
    const { data, error } = await getSupabase()
      .from("notices")
      .insert({ ...input, sort_order })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toNotice(data);
  },

  // 화면에 보이는 순서(ids)를 그대로 0,1,2… 로 굳힌다.
  // 두 행을 교환하는 방식보다 안전하다 (동시 수정 시 순번이 꼬이지 않음).
  reorder: async (ids: string[]): Promise<boolean> => {
    const results = await Promise.all(
      ids.map((id, i) =>
        getSupabase().from("notices").update({ sort_order: i }).eq("id", id),
      ),
    );
    return results.every((r) => !r.error);
  },

  update: async (id: string, patch: Partial<Notice>): Promise<Notice | null> => {
    const { createdAt: _drop, ...rest } = patch as Partial<Notice> & {
      createdAt?: string;
    };
    const { data, error } = await getSupabase()
      .from("notices")
      .update(rest)
      .eq("id", id)
      .select()
      .single();
    if (error) return null;
    return toNotice(data);
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await getSupabase().from("notices").delete().eq("id", id);
    return !error;
  },
};

export const faqStore = {
  // 관리자용 — 비공개 포함 전체. 노출 순서와 동일하게 등록 순.
  getAll: async (): Promise<Faq[]> => {
    const { data, error } = await getSupabase()
      .from("faqs")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toFaq);
  },

  // 사이트 노출용 — 공개된 것만
  getPublished: async (): Promise<Faq[]> => {
    const { data, error } = await getSupabase()
      .from("faqs")
      .select("*")
      .eq("published", true)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toFaq);
  },

  // 새 질문은 목록 맨 아래로 (sort_order 를 현재 최댓값보다 크게)
  create: async (
    input: Omit<Faq, "id" | "createdAt" | "sortOrder">,
  ): Promise<Faq> => {
    const { data: last } = await getSupabase()
      .from("faqs")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1);
    const sort_order = ((last?.[0]?.sort_order as number) ?? -1) + 1;
    const { data, error } = await getSupabase()
      .from("faqs")
      .insert({ ...input, sort_order })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toFaq(data);
  },

  reorder: async (ids: string[]): Promise<boolean> => {
    const results = await Promise.all(
      ids.map((id, i) =>
        getSupabase().from("faqs").update({ sort_order: i }).eq("id", id),
      ),
    );
    return results.every((r) => !r.error);
  },

  update: async (id: string, patch: Partial<Faq>): Promise<Faq | null> => {
    const { createdAt: _drop, ...rest } = patch as Partial<Faq> & {
      createdAt?: string;
    };
    const { data, error } = await getSupabase()
      .from("faqs")
      .update(rest)
      .eq("id", id)
      .select()
      .single();
    if (error) return null;
    return toFaq(data);
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await getSupabase().from("faqs").delete().eq("id", id);
    return !error;
  },
};

export interface PageView {
  id: string;
  sessionId: string;
  path: string;
  referrer: string;
  source: string;
  medium: string;
  campaign: string;
  device: string;
  durationMs: number | null;
  maxScroll: number | null;
  createdAt: string;
}

function toPageView(row: Record<string, unknown>): PageView {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    path: row.path as string,
    referrer: (row.referrer as string) || "",
    source: (row.source as string) || "direct",
    medium: (row.medium as string) || "",
    campaign: (row.campaign as string) || "",
    device: (row.device as string) || "desktop",
    durationMs: (row.duration_ms as number) ?? null,
    maxScroll: (row.max_scroll as number) ?? null,
    createdAt: row.created_at as string,
  };
}

export const pageViewStore = {
  // 최근 N일 방문 기록 (관리자 통계 집계용). days=null 이면 기간 제한 없이 전체.
  // Supabase는 한 응답에 최대 1000행만 주므로 1000행씩 끝까지 이어서 가져온다.
  // (한 번에 받으면 오래된 1000행에서 잘려 최근 방문이 통계에서 사라진다)
  getRecent: async (days: number | null = 30): Promise<PageView[]> => {
    const since =
      days == null
        ? null
        : new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const PAGE = 1000;
    const rows: PageView[] = [];
    for (let from = 0; ; from += PAGE) {
      let q = getSupabase().from("page_views").select("*");
      if (since) q = q.gte("created_at", since);
      const { data, error } = await q
        .order("created_at", { ascending: true })
        .order("id", { ascending: true }) // 동일 시각 행의 페이지 경계 흔들림 방지
        .range(from, from + PAGE - 1);
      if (error) throw new Error(error.message);
      rows.push(...(data ?? []).map(toPageView));
      if (!data || data.length < PAGE) break;
    }
    return rows;
  },

  create: async (input: {
    sessionId: string;
    path: string;
    referrer: string;
    source: string;
    medium: string;
    campaign: string;
    device: string;
  }): Promise<{ id: string }> => {
    const { data, error } = await getSupabase()
      .from("page_views")
      .insert({
        session_id: input.sessionId,
        path: input.path,
        referrer: input.referrer,
        source: input.source,
        medium: input.medium,
        campaign: input.campaign,
        device: input.device,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: data.id as string };
  },

  // 페이지 이탈 시 체류시간 + 스크롤 최대 도달률 기록
  setDuration: async (
    id: string,
    durationMs: number,
    maxScroll?: number,
  ): Promise<void> => {
    const patch: Record<string, number> = { duration_ms: durationMs };
    if (typeof maxScroll === "number") patch.max_scroll = maxScroll;
    await getSupabase().from("page_views").update(patch).eq("id", id);
  },
};
