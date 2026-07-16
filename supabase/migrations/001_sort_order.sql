-- 001: 공지·FAQ 수동 정렬(관리자 위/아래 화살표) 지원
--
-- 이미 schema.sql 로 생성된 DB 에 적용하는 변경분입니다.
-- 새로 만드는 프로젝트는 schema.sql 만 실행하면 됩니다(이 내용이 포함돼 있음).
-- 여러 번 실행해도 안전하며, 이미 조정해 둔 순서를 덮어쓰지 않습니다.

alter table public.notices add column if not exists sort_order int not null default 0;
alter table public.faqs    add column if not exists sort_order int not null default 0;

create index if not exists notices_order_idx on public.notices (pinned desc, sort_order asc);
create index if not exists faqs_order_idx    on public.faqs (sort_order asc);

-- 컬럼을 갓 추가해 전부 0 인 경우에만, 지금 화면에 보이는 순서를 번호로 굳힌다.
-- (이미 순서를 바꿔둔 DB 에서 재실행하면 아무 일도 하지 않는다)
do $$
begin
  if (select count(*) from public.notices) > 1
     and (select count(distinct sort_order) from public.notices) = 1 then
    update public.notices n set sort_order = o.rn
    from (select id, (row_number() over (order by pinned desc, created_at desc) - 1) as rn
          from public.notices) o
    where n.id = o.id;
    raise notice 'notices sort_order 백필 완료';
  end if;

  if (select count(*) from public.faqs) > 1
     and (select count(distinct sort_order) from public.faqs) = 1 then
    update public.faqs f set sort_order = o.rn
    from (select id, (row_number() over (order by created_at asc) - 1) as rn
          from public.faqs) o
    where f.id = o.id;
    raise notice 'faqs sort_order 백필 완료';
  end if;
end $$;

-- 확인용
select 'notices' as tbl, sort_order, title as label from public.notices
union all
select 'faqs', sort_order, question from public.faqs
order by tbl, sort_order;