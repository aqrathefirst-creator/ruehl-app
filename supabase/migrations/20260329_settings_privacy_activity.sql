-- RUEHL settings, privacy, activity, security foundations
-- Safe to run multiple times.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'allow_messages_from_enum'
  ) then
    create type public.allow_messages_from_enum as enum ('everyone', 'followers', 'none');
  end if;
end $$;

alter table if exists public.profiles
  add column if not exists is_private_account boolean not null default false,
  add column if not exists allow_messages_from public.allow_messages_from_enum not null default 'everyone',
  add column if not exists show_activity_status boolean not null default true,
  add column if not exists allow_tagging boolean not null default true,
  add column if not exists two_factor_enabled boolean not null default false,
  add column if not exists is_verified boolean not null default false,
  add column if not exists is_admin boolean not null default false;

-- Keep backward compatibility for UI fields that already read `verified`.
update public.profiles
set verified = true
where verified is distinct from true
  and is_verified = true;

create table if not exists public.saved_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.blocked_users (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (blocker_id <> blocked_id)
);

create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  reason text not null,
  social_links jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table if exists public.likes
  add column if not exists created_at timestamptz not null default now();

alter table if exists public.comments
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_likes_user_id_created_at on public.likes(user_id, created_at desc);
create index if not exists idx_likes_post_id_created_at on public.likes(post_id, created_at desc);
create index if not exists idx_comments_user_id_created_at on public.comments(user_id, created_at desc);
create index if not exists idx_comments_post_id_created_at on public.comments(post_id, created_at desc);
create index if not exists idx_saved_posts_user_id_created_at on public.saved_posts(user_id, created_at desc);
create index if not exists idx_saved_posts_post_id_created_at on public.saved_posts(post_id, created_at desc);
create index if not exists idx_blocked_users_blocker_id on public.blocked_users(blocker_id);
create index if not exists idx_blocked_users_blocked_id on public.blocked_users(blocked_id);
create index if not exists idx_verification_requests_user_id_created_at on public.verification_requests(user_id, created_at desc);

-- Add uniqueness only if existing data is clean.
do $$
begin
  if not exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'likes_user_post_unique') then
    if not exists (
      select 1
      from public.likes
      group by user_id, post_id
      having count(*) > 1
    ) then
      create unique index likes_user_post_unique on public.likes(user_id, post_id);
    end if;
  end if;

  if not exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'saved_posts_user_post_unique') then
    if not exists (
      select 1
      from public.saved_posts
      group by user_id, post_id
      having count(*) > 1
    ) then
      create unique index saved_posts_user_post_unique on public.saved_posts(user_id, post_id);
    end if;
  end if;

  if not exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'blocked_users_unique_pair') then
    if not exists (
      select 1
      from public.blocked_users
      group by blocker_id, blocked_id
      having count(*) > 1
    ) then
      create unique index blocked_users_unique_pair on public.blocked_users(blocker_id, blocked_id);
    end if;
  end if;

  if not exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'profiles_username_unique_ci') then
    if not exists (
      select 1
      from public.profiles
      where username is not null
      group by lower(username)
      having count(*) > 1
    ) then
      create unique index profiles_username_unique_ci on public.profiles(lower(username)) where username is not null;
    end if;
  end if;
end $$;

create or replace function public.users_are_blocked(user_a uuid, user_b uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.blocked_users bu
    where (bu.blocker_id = user_a and bu.blocked_id = user_b)
       or (bu.blocker_id = user_b and bu.blocked_id = user_a)
  );
$$;

create or replace function public.can_view_user_profile(target_user_id uuid)
returns boolean
language plpgsql
stable
as $$
declare
  viewer_id uuid;
  private_account boolean;
begin
  viewer_id := auth.uid();

  if viewer_id is null then
    return false;
  end if;

  if viewer_id = target_user_id then
    return true;
  end if;

  if public.users_are_blocked(viewer_id, target_user_id) then
    return false;
  end if;

  select p.is_private_account
  into private_account
  from public.profiles p
  where p.id = target_user_id;

  if coalesce(private_account, false) = false then
    return true;
  end if;

  return exists (
    select 1
    from public.follows f
    where f.follower_id = viewer_id
      and f.following_id = target_user_id
  );
end;
$$;

alter table if exists public.profiles enable row level security;
alter table if exists public.posts enable row level security;
alter table if exists public.likes enable row level security;
alter table if exists public.comments enable row level security;
alter table if exists public.saved_posts enable row level security;
alter table if exists public.blocked_users enable row level security;
alter table if exists public.verification_requests enable row level security;

drop policy if exists profiles_select_visible on public.profiles;
create policy profiles_select_visible
on public.profiles
for select
using (public.can_view_user_profile(id));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists posts_select_visible on public.posts;
create policy posts_select_visible
on public.posts
for select
using (public.can_view_user_profile(user_id));

drop policy if exists posts_insert_own on public.posts;
create policy posts_insert_own
on public.posts
for insert
with check (auth.uid() = user_id);

drop policy if exists posts_update_own on public.posts;
create policy posts_update_own
on public.posts
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists posts_delete_own on public.posts;
create policy posts_delete_own
on public.posts
for delete
using (auth.uid() = user_id);

drop policy if exists likes_select_own on public.likes;
drop policy if exists likes_select_visible on public.likes;
create policy likes_select_visible
on public.likes
for select
using (
  exists (
    select 1
    from public.posts p
    where p.id = post_id
      and public.can_view_user_profile(p.user_id)
  )
);

drop policy if exists likes_insert_own_visible on public.likes;
create policy likes_insert_own_visible
on public.likes
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

drop policy if exists likes_delete_own on public.likes;
create policy likes_delete_own
on public.likes
for delete
using (auth.uid() = user_id);

drop policy if exists comments_select_own on public.comments;
drop policy if exists comments_select_visible on public.comments;
create policy comments_select_visible
on public.comments
for select
using (
  exists (
    select 1
    from public.posts p
    where p.id = post_id
      and public.can_view_user_profile(p.user_id)
  )
);

drop policy if exists comments_insert_own_visible on public.comments;
create policy comments_insert_own_visible
on public.comments
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

drop policy if exists comments_update_own on public.comments;
create policy comments_update_own
on public.comments
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists comments_delete_own on public.comments;
create policy comments_delete_own
on public.comments
for delete
using (auth.uid() = user_id);

drop policy if exists saved_posts_select_own on public.saved_posts;
create policy saved_posts_select_own
on public.saved_posts
for select
using (auth.uid() = user_id);

drop policy if exists saved_posts_insert_own on public.saved_posts;
create policy saved_posts_insert_own
on public.saved_posts
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

drop policy if exists saved_posts_delete_own on public.saved_posts;
create policy saved_posts_delete_own
on public.saved_posts
for delete
using (auth.uid() = user_id);

drop policy if exists blocked_users_select_own on public.blocked_users;
create policy blocked_users_select_own
on public.blocked_users
for select
using (auth.uid() = blocker_id);

drop policy if exists blocked_users_insert_own on public.blocked_users;
create policy blocked_users_insert_own
on public.blocked_users
for insert
with check (auth.uid() = blocker_id and auth.uid() <> blocked_id);

drop policy if exists blocked_users_delete_own on public.blocked_users;
create policy blocked_users_delete_own
on public.blocked_users
for delete
using (auth.uid() = blocker_id);

drop policy if exists verification_requests_select_own_or_admin on public.verification_requests;
create policy verification_requests_select_own_or_admin
on public.verification_requests
for select
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  )
);

drop policy if exists verification_requests_insert_own on public.verification_requests;
create policy verification_requests_insert_own
on public.verification_requests
for insert
with check (auth.uid() = user_id);

drop policy if exists verification_requests_update_admin on public.verification_requests;
create policy verification_requests_update_admin
on public.verification_requests
for update
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  )
);

create or replace function public.fetch_liked_posts(target_user_id uuid)
returns setof public.likes
language sql
stable
security invoker
as $$
  select l.*
  from public.likes l
  where l.user_id = target_user_id
    and auth.uid() = target_user_id
  order by l.created_at desc;
$$;

create or replace function public.fetch_saved_posts(target_user_id uuid)
returns setof public.saved_posts
language sql
stable
security invoker
as $$
  select s.*
  from public.saved_posts s
  where s.user_id = target_user_id
    and auth.uid() = target_user_id
  order by s.created_at desc;
$$;

create or replace function public.fetch_user_activity(target_user_id uuid)
returns jsonb
language sql
stable
security invoker
as $$
  select case
    when auth.uid() <> target_user_id then '{}'::jsonb
    else jsonb_build_object(
      'liked_posts', coalesce((select jsonb_agg(l order by l.created_at desc) from public.likes l where l.user_id = target_user_id), '[]'::jsonb),
      'saved_posts', coalesce((select jsonb_agg(s order by s.created_at desc) from public.saved_posts s where s.user_id = target_user_id), '[]'::jsonb),
      'comments', coalesce((select jsonb_agg(c order by c.created_at desc) from public.comments c where c.user_id = target_user_id), '[]'::jsonb)
    )
  end;
$$;
