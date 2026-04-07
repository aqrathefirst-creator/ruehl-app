create table if not exists public.story_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_url text not null,
  content text not null default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  constraint story_entries_media_url_not_blank check (length(trim(media_url)) > 0)
);

create index if not exists story_entries_user_created_idx
  on public.story_entries(user_id, created_at desc);

create index if not exists story_entries_expires_idx
  on public.story_entries(expires_at desc);

create table if not exists public.story_views (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.story_entries(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique (story_id, viewer_id)
);

create index if not exists story_views_viewer_idx
  on public.story_views(viewer_id, viewed_at desc);

alter table public.story_entries enable row level security;
alter table public.story_views enable row level security;

drop policy if exists "story entries are readable by authenticated users" on public.story_entries;
create policy "story entries are readable by authenticated users"
  on public.story_entries
  for select
  to authenticated
  using (expires_at > now());

drop policy if exists "story entries can be inserted by owner" on public.story_entries;
create policy "story entries can be inserted by owner"
  on public.story_entries
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "story entries can be updated by owner" on public.story_entries;
create policy "story entries can be updated by owner"
  on public.story_entries
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "story entries can be deleted by owner" on public.story_entries;
create policy "story entries can be deleted by owner"
  on public.story_entries
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "story views readable by viewer" on public.story_views;
create policy "story views readable by viewer"
  on public.story_views
  for select
  to authenticated
  using (viewer_id = auth.uid());

drop policy if exists "story views insertable by viewer" on public.story_views;
create policy "story views insertable by viewer"
  on public.story_views
  for insert
  to authenticated
  with check (viewer_id = auth.uid());
