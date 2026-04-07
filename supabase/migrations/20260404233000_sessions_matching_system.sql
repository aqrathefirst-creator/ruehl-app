-- Sessions matching system upgrade (backward compatible)

alter table if exists public.training_sessions
  add column if not exists host_id uuid references auth.users(id) on delete cascade,
  add column if not exists intent text,
  add column if not exists energy_level text,
  add column if not exists scheduled_time timestamptz,
  add column if not exists visibility text;

update public.training_sessions
set host_id = coalesce(host_id, host_user_id)
where host_id is null;

update public.training_sessions
set intent = coalesce(nullif(trim(intent), ''), nullif(trim(activity_type), ''), nullif(trim(title), ''), 'General')
where intent is null or trim(intent) = '';

update public.training_sessions
set energy_level = case
  when upper(coalesce(energy_level, '')) in ('CHILL', 'FOCUSED', 'INTENSE') then upper(energy_level)
  when coalesce(duration, 0) >= 60 then 'INTENSE'
  when coalesce(duration, 0) between 30 and 59 then 'FOCUSED'
  else 'CHILL'
end
where energy_level is null or upper(energy_level) not in ('CHILL', 'FOCUSED', 'INTENSE');

update public.training_sessions
set scheduled_time = coalesce(scheduled_time, date_time, created_at, now())
where scheduled_time is null;

update public.training_sessions
set status = case
  when upper(coalesce(status, '')) in ('OPEN', 'MATCHED', 'COMPLETED', 'CANCELLED') then upper(status)
  when lower(coalesce(status, '')) = 'pending' then 'OPEN'
  when lower(coalesce(status, '')) = 'accepted' then 'MATCHED'
  when lower(coalesce(status, '')) = 'declined' then 'CANCELLED'
  when lower(coalesce(status, '')) = 'done' then 'COMPLETED'
  else 'OPEN'
end;

update public.training_sessions
set visibility = case
  when upper(coalesce(visibility, '')) in ('PUBLIC', 'REQUEST', 'PRIVATE') then upper(visibility)
  when coalesce(is_private, false) = true then 'REQUEST'
  else 'PUBLIC'
end
where visibility is null or upper(visibility) not in ('PUBLIC', 'REQUEST', 'PRIVATE');

alter table if exists public.training_sessions
  alter column host_id set not null,
  alter column intent set not null,
  alter column energy_level set not null,
  alter column scheduled_time set not null,
  alter column status set not null,
  alter column visibility set not null,
  alter column created_at set default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'training_sessions_energy_level_check'
      and conrelid = 'public.training_sessions'::regclass
  ) then
    alter table public.training_sessions
      add constraint training_sessions_energy_level_check
      check (energy_level in ('CHILL', 'FOCUSED', 'INTENSE'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'training_sessions_status_check'
      and conrelid = 'public.training_sessions'::regclass
  ) then
    alter table public.training_sessions
      add constraint training_sessions_status_check
      check (status in ('OPEN', 'MATCHED', 'COMPLETED', 'CANCELLED'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'training_sessions_visibility_check'
      and conrelid = 'public.training_sessions'::regclass
  ) then
    alter table public.training_sessions
      add constraint training_sessions_visibility_check
      check (visibility in ('PUBLIC', 'REQUEST', 'PRIVATE'));
  end if;
end $$;

create index if not exists training_sessions_status_created_idx
  on public.training_sessions (status, created_at desc);

create index if not exists training_sessions_host_status_idx
  on public.training_sessions (host_id, status, created_at desc);

create index if not exists training_sessions_time_idx
  on public.training_sessions (scheduled_time asc);

alter table if exists public.training_requests
  add column if not exists session_id uuid references public.training_sessions(id) on delete cascade,
  add column if not exists requester_id uuid references auth.users(id) on delete cascade;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'training_requests'
      and column_name = 'sender_id'
  ) then
    execute $sql$
      update public.training_requests
      set requester_id = coalesce(requester_id, sender_id)
      where requester_id is null
    $sql$;
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'training_requests'
      and column_name = 'requester'
  ) then
    execute $sql$
      update public.training_requests
      set requester_id = coalesce(requester_id, requester)
      where requester_id is null
    $sql$;
  end if;
end $$;

update public.training_requests
set status = case
  when upper(coalesce(status, '')) in ('PENDING', 'ACCEPTED', 'DECLINED') then upper(status)
  when lower(coalesce(status, '')) in ('pending', 'accepted', 'declined') then upper(status)
  else 'PENDING'
end;

alter table if exists public.training_requests
  alter column requester_id set not null,
  alter column status set not null,
  alter column created_at set default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'training_requests_status_check'
      and conrelid = 'public.training_requests'::regclass
  ) then
    alter table public.training_requests
      add constraint training_requests_status_check
      check (status in ('PENDING', 'ACCEPTED', 'DECLINED'));
  end if;
end $$;

create index if not exists training_requests_session_status_idx
  on public.training_requests (session_id, status, created_at desc);

create index if not exists training_requests_requester_status_idx
  on public.training_requests (requester_id, status, created_at desc);

create unique index if not exists training_requests_session_requester_uniq
  on public.training_requests (session_id, requester_id)
  where session_id is not null;

alter table if exists public.training_matches
  add column if not exists session_id uuid references public.training_sessions(id) on delete set null;

create index if not exists training_matches_session_idx
  on public.training_matches (session_id, created_at desc);
