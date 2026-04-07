alter table public.admin_requests
  add column if not exists admin_id uuid references auth.users(id) on delete cascade,
  add column if not exists target_id text not null default '';

update public.admin_requests
set admin_id = coalesce(admin_id, submitted_by),
    target_id = case when coalesce(target_id, '') = '' then coalesce(target, '') else target_id end
where admin_id is null or coalesce(target_id, '') = '';

alter table public.admin_requests
  alter column admin_id set not null;

do $$
begin
  alter table public.admin_requests drop constraint if exists admin_requests_subject_check;
  alter table public.admin_requests add constraint admin_requests_subject_check check (
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
      'OVERRIDE_CHART',
      'REMOVE_DISCOVERY',
      'BOOST_PROMOTE_CONTENT',
      'DELETE_CONTENT',
      'MODIFY_MUSIC_METADATA',
      'SECURITY_CHANGE',
      'OTHER'
    )
  );
exception when undefined_object then
  null;
end $$;

create index if not exists admin_requests_admin_id_idx on public.admin_requests(admin_id, created_at desc);
create index if not exists admin_requests_target_id_idx on public.admin_requests(target_id);

create table if not exists public.admin_action_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null references public.admin_requests(id) on delete cascade,
  action_type text not null,
  target_id text not null default '',
  executed_at timestamptz not null default now()
);

create index if not exists admin_action_logs_request_idx on public.admin_action_logs(request_id, executed_at desc);
create index if not exists admin_action_logs_admin_idx on public.admin_action_logs(admin_id, executed_at desc);
