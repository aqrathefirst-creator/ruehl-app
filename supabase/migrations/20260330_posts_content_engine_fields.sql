alter table if exists public.posts
  add column if not exists genre text,
  add column if not exists hashtags text[] default '{}'::text[],
  add column if not exists mentions text[] default '{}'::text[],
  add column if not exists thumbnail_url text,
  add column if not exists filter_name text,
  add column if not exists text_overlays jsonb default '[]'::jsonb,
  add column if not exists trim_start_sec numeric,
  add column if not exists trim_end_sec numeric,
  add column if not exists cover_time_sec numeric,
  add column if not exists original_audio_volume real default 1,
  add column if not exists sound_audio_volume real default 1,
  add column if not exists is_multi_clip boolean default false,
  add column if not exists clip_segments_ms integer[];

create index if not exists posts_genre_idx on public.posts (genre);
