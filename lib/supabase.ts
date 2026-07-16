import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// 서버 전용 Supabase 클라이언트.
//
// SUPABASE_SECRET_KEY 는 RLS를 우회하는 비밀 키다 (Secret key `sb_secret_...`
// 또는 구버전 service_role JWT 둘 다 동작). 절대 NEXT_PUBLIC_ 접두사를 붙이지
// 말 것 — 붙이는 순간 브라우저 번들에 박혀 DB 전체가 공개된다.
// 이 모듈은 API 라우트와 서버 컴포넌트에서만 import 되어야 한다.
//
// 권한 통제는 DB(RLS)가 아니라 이 앱의 서버 라우트가 한다:
//   - 공개: 문의 접수(POST), 게시된 공지·FAQ 조회
//   - 관리자 전용: 그 외 전부 (lib/adminAuth.ts 의 httpOnly 쿠키로 검증)
export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase 환경변수(SUPABASE_URL / SUPABASE_SECRET_KEY)가 설정되지 않았습니다.",
    );
  }

  client = createClient(url, key, {
    // 서버에서는 세션을 들고 있을 이유가 없다 (요청마다 독립)
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}