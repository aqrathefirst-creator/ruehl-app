alter table if exists public.posts
  add column if not exists genre text,
  add column if not exists mood text,
  add column if not exists activity text,
  add column if not exists alignment_score numeric default 0,
  add column if not exists likes_count int default 0,
  add column if not exists comments_count int default 0,
  add column if not exists lifts_count int default 0;

alter table if exists public.sounds
  add column if not exists genre text,
  add column if not exists mood text,
  add column if not exists energy_level int,
  add column if not exists avg_alignment_score numeric default 0,
  add column if not exists avg_engagement_score numeric default 0,
  add column if not exists adaptive_weight numeric default 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'sounds'
      and c.conname = 'sounds_energy_level_range_check'
  ) then
    alter table public.sounds
      add constraint sounds_energy_level_range_check
      check (energy_level is null or (energy_level >= 1 and energy_level <= 10));
  end if;
end $$;
