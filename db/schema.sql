-- ksmobility-v4 (특장맨) 스키마 — Neon(Postgres)
-- Neon 콘솔의 SQL Editor에 붙여넣고 실행하세요. 여러 번 실행해도 안전합니다.
--
-- 권한 통제는 DB가 아니라 앱의 서버 라우트가 한다.
-- 브라우저는 DB를 직접 호출하지 않는다 — DATABASE_URL 은 서버에만 있고,
-- 관리자 전용 라우트는 lib/adminAuth.ts 의 httpOnly 쿠키로 검증한다.
-- (Supabase 시절의 RLS/anon 정책은 Neon 에서 불필요하므로 두지 않는다)

-- ── 상담 문의 ──────────────────────────────────────────────
create table if not exists inquiries (
  id          uuid primary key default gen_random_uuid(),
  status      text not null default 'pending'
              check (status in ('pending', 'in_progress', 'done')),
  name        text not null,
  phone       text not null,
  note        text not null default '',   -- 문의 내용
  source      text not null default 'web',
  agree       boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists inquiries_created_at_idx on inquiries (created_at desc);

-- ── 공지사항 ───────────────────────────────────────────────
-- 노출 순서 = 고정(pinned) 먼저, 그 안에서 sort_order 오름차순.
-- sort_order 는 관리자의 위/아래 화살표로 조정한다.
create table if not exists notices (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  body        text not null default '',
  published   boolean not null default true,  -- false = 임시저장(사이트 비노출)
  pinned      boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists notices_order_idx on notices (pinned desc, sort_order asc);

-- ── 자주 묻는 질문 ─────────────────────────────────────────
-- 노출 순서 = sort_order 오름차순 (관리자에서 위/아래 화살표로 조정).
create table if not exists faqs (
  id          uuid primary key default gen_random_uuid(),
  question    text not null,
  answer      text not null default '',
  published   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists faqs_order_idx on faqs (sort_order asc);

-- ── 방문 추적 (관리자 '유입 관리') ─────────────────────────
create table if not exists page_views (
  id          uuid primary key default gen_random_uuid(),
  session_id  text not null,              -- 기기ID + KST 날짜 → 같은 날 같은 기기는 1명
  path        text not null,
  referrer    text not null default '',
  source      text not null default 'direct',  -- naver / google / kakao / instagram …
  medium      text not null default '',        -- utm_medium
  campaign    text not null default '',        -- utm_campaign
  device      text not null default 'desktop', -- mobile / tablet / desktop
  duration_ms int,                             -- 이탈 시 기록 (체류시간)
  max_scroll  int,                             -- 이탈 시 기록 (0~100, 최대 스크롤 도달률)
  created_at  timestamptz not null default now()
);

-- 집계는 기간 필터 + 세션 묶기가 전부라 이 두 개면 충분하다.
create index if not exists page_views_created_at_idx on page_views (created_at);
create index if not exists page_views_session_idx    on page_views (session_id);
