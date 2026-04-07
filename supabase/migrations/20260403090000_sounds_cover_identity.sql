alter table if exists public.sounds
  add column if not exists cover_url text,
  add column if not exists spotify_id text;

create index if not exists sounds_spotify_id_idx
  on public.sounds (spotify_id)
  where spotify_id is not null;
