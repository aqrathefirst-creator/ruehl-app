create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null check (role in ('SUPER_ADMIN', 'ADMIN', 'ANALYST', 'MODERATOR')),
  created_at timestamptz not null default now()
);

create index if not exists admin_users_role_idx on public.admin_users(role);

create table if not exists public.admin_requests (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references auth.users(id) on delete cascade,
  subject text not null check (
    subject in (
      'VERIFY_USER',
      'SHADOW_BAN_USER',
      'RESTRICT_USER',
      'DELETE_USER',
      'CHANGE_USERNAME',
      'CHANGE_EMAIL',
      'CHANGE_SECURITY_SETTINGS',
      'ADD_GENRE',
      'REMOVE_GENRE',
      'MODIFY_GENRE',
      'OTHER'
    )
  ),
  target text not null default '',
  notes text,
  attachment_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists admin_requests_status_idx on public.admin_requests(status, created_at desc);
create index if not exists admin_requests_submitted_by_idx on public.admin_requests(submitted_by, created_at desc);
