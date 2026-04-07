alter table if exists public.profiles
  add column if not exists is_creator boolean not null default false;

alter table if exists public.sessions
  add column if not exists session_role text not null default 'normal';

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'sessions_session_role_check'
      and conrelid = 'public.sessions'::regclass
  ) then
    alter table public.sessions drop constraint sessions_session_role_check;
  end if;

  alter table public.sessions
    add constraint sessions_session_role_check
    check (session_role in ('normal', 'creator'));
end $$;

update public.sessions
set session_role = 'normal'
where session_role is null or session_role not in ('normal', 'creator');

create index if not exists sessions_session_role_idx on public.sessions (session_role, created_at desc);
