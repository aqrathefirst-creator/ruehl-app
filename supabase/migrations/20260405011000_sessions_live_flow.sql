create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null,
  session_type text not null check (session_type in ('solo', 'open')),
  training_type text,
  nutrition_type text,
  status text not null default 'pending' check (status in ('pending', 'active', 'completed', 'cancelled')),
  scheduled_time timestamptz,
  created_at timestamptz not null default now(),
  lat double precision,
  lng double precision,
  note text
);

create table if not exists public.session_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null,
  status text not null default 'joined' check (status in ('joined', 'requested')),
  created_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create table if not exists public.session_room_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  sender_id uuid not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists sessions_status_created_idx on public.sessions (status, created_at desc);
create index if not exists sessions_host_created_idx on public.sessions (host_id, created_at desc);
create index if not exists sessions_scheduled_idx on public.sessions (scheduled_time asc);
create index if not exists sessions_lat_lng_idx on public.sessions (lat, lng);

create index if not exists session_participants_session_idx on public.session_participants (session_id, created_at desc);
create index if not exists session_participants_user_idx on public.session_participants (user_id, created_at desc);

create index if not exists session_room_messages_session_idx on public.session_room_messages (session_id, created_at asc);

alter table public.sessions enable row level security;
alter table public.session_participants enable row level security;
alter table public.session_room_messages enable row level security;

drop policy if exists sessions_select_all on public.sessions;
create policy sessions_select_all on public.sessions
for select to authenticated
using (true);

drop policy if exists sessions_insert_owner on public.sessions;
create policy sessions_insert_owner on public.sessions
for insert to authenticated
with check (auth.uid() = host_id);

drop policy if exists sessions_update_host on public.sessions;
create policy sessions_update_host on public.sessions
for update to authenticated
using (auth.uid() = host_id)
with check (auth.uid() = host_id);

drop policy if exists session_participants_select_all on public.session_participants;
create policy session_participants_select_all on public.session_participants
for select to authenticated
using (true);

drop policy if exists session_participants_insert_self on public.session_participants;
create policy session_participants_insert_self on public.session_participants
for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists session_participants_update_self on public.session_participants;
create policy session_participants_update_self on public.session_participants
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists session_room_messages_select_all on public.session_room_messages;
create policy session_room_messages_select_all on public.session_room_messages
for select to authenticated
using (true);

drop policy if exists session_room_messages_insert_self on public.session_room_messages;
create policy session_room_messages_insert_self on public.session_room_messages
for insert to authenticated
with check (auth.uid() = sender_id);

grant select, insert, update on public.sessions to authenticated;
grant select, insert, update on public.session_participants to authenticated;
grant select, insert on public.session_room_messages to authenticated;
