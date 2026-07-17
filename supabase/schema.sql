-- ksmobility-v4 관리자 스키마
-- Supabase 프로젝트의 SQL Editor에 붙여넣고 실행하세요.

-- ── 상담 문의 ──────────────────────────────────────────────
create table if not exists public.inquiries (
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

create index if not exists inquiries_created_at_idx on public.inquiries (created_at desc);

-- ── 공지사항 ───────────────────────────────────────────────
-- 노출 순서 = 고정(pinned) 먼저, 그 안에서 sort_order 오름차순.
-- sort_order 는 관리자의 위/아래 화살표로 조정한다.
create table if not exists public.notices (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  body        text not null default '',
  published   boolean not null default true,  -- false = 임시저장(사이트 비노출)
  pinned      boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
-- 이미 만들어진 DB 를 위한 추가 (재실행 안전)
alter table public.notices add column if not exists sort_order int not null default 0;

create index if not exists notices_order_idx on public.notices (pinned desc, sort_order asc);

-- ── 자주 묻는 질문 ─────────────────────────────────────────
-- 노출 순서 = sort_order 오름차순 (관리자에서 위/아래 화살표로 조정).
create table if not exists public.faqs (
  id          uuid primary key default gen_random_uuid(),
  question    text not null,
  answer      text not null default '',
  published   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.faqs add column if not exists sort_order int not null default 0;

create index if not exists faqs_order_idx on public.faqs (sort_order asc);

-- ── 방문 추적 (관리자 '유입 관리') ─────────────────────────
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

create index if not exists page_views_created_at_idx on public.page_views (created_at);
create index if not exists page_views_session_idx    on public.page_views (session_id);

-- ── RLS: 전면 차단 ─────────────────────────────────────────
-- 이 앱은 브라우저에서 Supabase를 직접 호출하지 않는다. DB 접근은 전부
-- 서버(app/api/*, 서버 컴포넌트)에서 service_role 키로만 이뤄지고,
-- service_role 은 RLS를 우회한다.
--
-- 따라서 anon/authenticated 에게는 아무 정책도 주지 않는다.
-- RLS 를 켜고 정책이 없으면 = 전부 거부. 혹시 anon 키가 유출되어도
-- 고객 이름·전화번호가 담긴 inquiries 를 읽을 수 없다.
--
-- 권한 통제는 서버 라우트가 담당한다 (lib/adminAuth.ts 쿠키 검증).
alter table public.inquiries  enable row level security;
alter table public.notices    enable row level security;
alter table public.faqs       enable row level security;
alter table public.page_views enable row level security;

-- 과거 버전에서 열어둔 정책이 남아 있으면 제거 (재실행 안전)
drop policy if exists inquiries_insert on public.inquiries;
drop policy if exists inquiries_admin  on public.inquiries;
drop policy if exists notices_all      on public.notices;
drop policy if exists faqs_all         on public.faqs;

-- RLS 와 별개로 테이블 권한 자체를 회수한다 (이중 방어).
-- Data API 설정의 "Automatically expose new tables" 가 켜져 있어도
-- 이 revoke 로 anon 접근이 차단된다.
revoke all on public.inquiries  from anon, authenticated;
revoke all on public.notices    from anon, authenticated;
revoke all on public.faqs       from anon, authenticated;
revoke all on public.page_views from anon, authenticated;

-- service_role 권한은 명시적으로 부여한다.
-- service_role 은 RLS 를 우회하지만 테이블 GRANT 는 여전히 필요하다.
-- "Automatically expose new tables" 를 꺼도 앱이 동작하도록 대시보드 설정에
-- 의존하지 않고 여기서 못박는다. (없으면 permission denied for table ...)
grant all on public.inquiries  to service_role;
grant all on public.notices    to service_role;
grant all on public.faqs       to service_role;
grant all on public.page_views to service_role;

-- ── 시드 ───────────────────────────────────────────────────
-- ⚠ id 가 gen_random_uuid() 라 충돌이 나지 않는다. 즉 `on conflict do nothing`
--   으로는 중복을 막을 수 없어서(재실행 시 계속 쌓임) 빈 테이블일 때만 넣는다.
insert into public.notices (title, body, sort_order, created_at)
select * from (values
  ('특장 카니발 신규 라인업 상담 예약 안내',
   '신규 라인업 상담 예약을 받고 있습니다. 원하시는 사양은 카카오톡 또는 전화로 편하게 문의 주세요.',
   0, '2026-07-10'::timestamptz),
  ('여름 시즌 상담 운영 안내',
   '여름 시즌 상담 운영 일정 관련 안내입니다. 자세한 내용은 문의 바랍니다.',
   1, '2026-06-15'::timestamptz),
  ('5월 상담 예약 관련 공지',
   '5월 상담 예약 관련 공지사항입니다. 예약 문의는 연락처로 부탁드립니다.',
   2, '2026-05-20'::timestamptz)
) as v(title, body, sort_order, created_at)
where not exists (select 1 from public.notices);

insert into public.faqs (question, answer, sort_order, created_at)
select * from (values
  ('상담은 어떻게 진행되나요?',
   '카카오톡 오픈채팅 또는 전화로 편하게 문의 주시면 안내해 드립니다.',
   0, '2026-01-01 00:00:01+09'::timestamptz),
  ('원하는 사양으로 커스텀 되나요?',
   '네, 원하시는 사양·예산에 맞춰 상담 후 진행합니다.',
   1, '2026-01-01 00:00:02+09'::timestamptz),
  ('실물은 어디서 볼 수 있나요?',
   '인천 남동구 매장 방문, 또는 인스타·유튜브에서 확인하실 수 있습니다.',
   2, '2026-01-01 00:00:03+09'::timestamptz)
) as v(question, answer, sort_order, created_at)
where not exists (select 1 from public.faqs);

-- ── sort_order 백필 ────────────────────────────────────────
-- 컬럼을 갓 추가해 전부 0 인 경우에만 현재 표시 순서를 번호로 굳힌다.
-- (이미 관리자가 순서를 바꿔둔 DB 에서 재실행해도 그 순서를 덮어쓰지 않는다)
do $$
begin
  if (select count(*) from public.notices) > 1
     and (select count(distinct sort_order) from public.notices) = 1 then
    update public.notices n set sort_order = o.rn
    from (select id, (row_number() over (order by pinned desc, created_at desc) - 1) as rn
          from public.notices) o
    where n.id = o.id;
  end if;

  if (select count(*) from public.faqs) > 1
     and (select count(distinct sort_order) from public.faqs) = 1 then
    update public.faqs f set sort_order = o.rn
    from (select id, (row_number() over (order by created_at asc) - 1) as rn
          from public.faqs) o
    where f.id = o.id;
  end if;
end $$;