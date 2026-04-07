create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  check (reporter_id <> target_user_id)
);

create index if not exists user_reports_reporter_created_idx
  on public.user_reports (reporter_id, created_at desc);

create index if not exists user_reports_target_created_idx
  on public.user_reports (target_user_id, created_at desc);

do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'follows_unique_pair'
  ) then
    if not exists (
      select 1
      from public.follows
      group by follower_id, following_id
      having count(*) > 1
    ) then
      create unique index follows_unique_pair on public.follows(follower_id, following_id);
    end if;
  end if;
end $$;

alter table if exists public.user_reports enable row level security;

drop policy if exists user_reports_insert_own on public.user_reports;
create policy user_reports_insert_own
on public.user_reports
for insert
with check (auth.uid() = reporter_id);

drop policy if exists user_reports_select_own on public.user_reports;
create policy user_reports_select_own
on public.user_reports
for select
using (auth.uid() = reporter_id);