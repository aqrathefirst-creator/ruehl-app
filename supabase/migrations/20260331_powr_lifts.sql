create table if not exists public.post_lifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists post_lifts_user_created_idx
  on public.post_lifts(user_id, created_at desc);

create index if not exists post_lifts_post_created_idx
  on public.post_lifts(post_id, created_at desc);

do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'post_lifts_user_post_unique'
  ) then
    if not exists (
      select 1
      from public.post_lifts
      group by user_id, post_id
      having count(*) > 1
    ) then
      create unique index post_lifts_user_post_unique on public.post_lifts(user_id, post_id);
    end if;
  end if;
end $$;

alter table if exists public.post_lifts enable row level security;

drop policy if exists post_lifts_select_visible on public.post_lifts;
create policy post_lifts_select_visible
on public.post_lifts
for select
using (
  exists (
    select 1
    from public.posts p
    where p.id = post_id
      and public.can_view_user_profile(p.user_id)
  )
);

drop policy if exists post_lifts_insert_own_visible on public.post_lifts;
create policy post_lifts_insert_own_visible
on public.post_lifts
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.posts p
    where p.id = post_id
      and public.can_view_user_profile(p.user_id)
  )
);

drop policy if exists post_lifts_delete_own on public.post_lifts;
create policy post_lifts_delete_own
on public.post_lifts
for delete
using (auth.uid() = user_id);
