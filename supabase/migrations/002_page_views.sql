-- 002: 방문 추적 (관리자 '유입 관리' 탭)
--
-- 이미 schema.sql 로 생성된 DB 에 적용하는 변경분입니다.
-- 새로 만드는 프로젝트는 schema.sql 만 실행하면 됩니다(이 내용이 포함돼 있음).
-- 여러 번 실행해도 안전합니다.

create table if not exists public.page_views (
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
create index if not exists page_views_created_at_idx on public.page_views (created_at);
create index if not exists page_views_session_idx    on public.page_views (session_id);

-- 다른 테이블과 동일하게 전면 차단.
-- 방문자는 브라우저에서 DB 를 직접 부르지 않는다. /api/track 서버 라우트만 접근한다.
alter table public.page_views enable row level security;
revoke all on public.page_views from anon, authenticated;
grant  all on public.page_views to service_role;

-- 확인용
select count(*) as page_views_rows from public.page_views;