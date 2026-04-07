-- Admin platform control system foundation.
-- Safe additive migration.

alter table if exists public.profiles
  add column if not exists shadow_banned boolean not null default false,
  add column if not exists suspended_until timestamptz;

alter table if exists public.posts
  add column if not exists hidden_by_admin boolean not null default false,
  add column if not exists discovery_disabled boolean not null default false,
  add column if not exists trending_override boolean not null default false,
  add column if not exists boosted_until timestamptz,
  add column if not exists moderation_state text not null default 'pending',
  add column if not exists visibility_state text not null default 'normal';

alter table if exists public.user_reports
  alter column target_user_id drop not null,
  add column if not exists target_post_id uuid references public.posts(id) on delete cascade,
  add column if not exists admin_status text not null default 'pending',
  add column if not exists admin_action text,
  add column if not exists admin_note text,
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by uuid references auth.users(id) on delete set null;

alter table if exists public.user_reports
  drop constraint if exists user_reports_target_required;

alter table if exists public.user_reports
  add constraint user_reports_target_required
  check (target_user_id is not null or target_post_id is not null);

create table if not exists public.admin_user_notes (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references auth.users(id) on delete cascade,
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists admin_user_notes_target_created_idx
  on public.admin_user_notes(target_user_id, created_at desc);

create table if not exists public.admin_genres (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  priority_weight integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.admin_genres (name, priority_weight)
values
  ('Fitness', 100),
  ('Core', 95),
  ('Strength Training', 90),
  ('Dance', 85),
  ('Lifestyle', 80),
  ('Health', 75),
  ('Nutrition', 70)
on conflict (name) do nothing;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  subject text not null,
  message text not null,
  status text not null default 'open',
  priority text not null default 'normal',
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.sounds
  add column if not exists is_enabled boolean not null default true,
  add column if not exists is_trending boolean not null default false,
  add column if not exists category text;
