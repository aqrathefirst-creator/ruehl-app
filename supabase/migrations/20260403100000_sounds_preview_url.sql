alter table if exists public.sounds
  add column if not exists preview_url text;
