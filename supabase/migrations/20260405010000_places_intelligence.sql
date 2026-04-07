create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('gym', 'healthy_food')),
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz not null default now()
);

create index if not exists places_type_idx on public.places (type);
create index if not exists places_lat_lng_idx on public.places (lat, lng);

alter table public.places enable row level security;

drop policy if exists places_read_all on public.places;
create policy places_read_all
on public.places
for select
to anon, authenticated
using (true);

grant select on table public.places to anon, authenticated;
