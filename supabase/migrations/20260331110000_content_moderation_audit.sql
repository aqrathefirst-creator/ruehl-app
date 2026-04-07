create table if not exists public.admin_content_actions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_content_actions_post_created_idx
  on public.admin_content_actions(post_id, created_at desc);

create index if not exists admin_content_actions_admin_created_idx
  on public.admin_content_actions(admin_user_id, created_at desc);
