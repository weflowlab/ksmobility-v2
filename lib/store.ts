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
