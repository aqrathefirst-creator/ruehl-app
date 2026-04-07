-- RUEHL scoring engine
-- Uses existing tables: posts, sounds, likes, comments, post_lifts, chart_scores

-- STEP 1 — UPDATE chart_scores TABLE
alter table if exists public.chart_scores
  add column if not exists score numeric default 0,
  add column if not exists post_count int default 0,
  add column if not exists like_count int default 0,
  add column if not exists comment_count int default 0,
  add column if not exists lift_count int default 0,
  add column if not exists velocity numeric default 0,
  add column if not exists last_24h_score numeric default 0,
  add column if not exists previous_rank int,
  add column if not exists rank int,
  add column if not exists movement int,
  add column if not exists lifecycle text,
  add column if not exists updated_at timestamp default now();

-- Ensure conflict target exists for ensure_chart_row upsert
create unique index if not exists chart_scores_sound_id_uidx
  on public.chart_scores (sound_id);

-- STEP 2 — CREATE SCORE FUNCTION
create or replace function public.compute_ruehl_score(
  p_posts int,
  p_likes int,
  p_comments int,
  p_lifts int
)
returns numeric
language plpgsql
as $$
begin
  return
    (p_posts * 5)
    + (p_likes * 1)
    + (p_comments * 2)
    + (p_lifts * 10);
end;
$$;

-- STEP 3 — ENSURE ROW EXISTS
create or replace function public.ensure_chart_row(p_sound_id uuid)
returns void
language plpgsql
as $$
declare
  v_seed_rank int;
begin
  if p_sound_id is null then
    return;
  end if;

  select coalesce(max(rank), 0) + 1 into v_seed_rank
  from public.chart_scores;

  insert into public.chart_scores (
    sound_id,
    rank,
    movement,
    lifecycle,
    updated_at,
    score,
    post_count,
    like_count,
    comment_count,
    lift_count,
    velocity,
    last_24h_score
  )
  values (
    p_sound_id,
    v_seed_rank,
    'new',
    'birth',
    now(),
    0,
    0,
    0,
    0,
    0,
    0,
    0
  )
  on conflict (sound_id) do nothing;
end;
$$;

-- STEP 6 — RANKING FUNCTION
create or replace function public.update_chart_ranking()
returns void
language plpgsql
as $$
begin
  update public.chart_scores
  set previous_rank = rank;

  with ranked as (
    select sound_id,
           row_number() over (order by score desc nulls last) as new_rank
    from public.chart_scores
  )
  update public.chart_scores cs
  set
    rank = r.new_rank,
    movement =
      case
        when cs.previous_rank is null then 'new'
        when r.new_rank < cs.previous_rank then 'up'
        when r.new_rank > cs.previous_rank then 'down'
        else 'stable'
      end,
    lifecycle =
      case
        when cs.previous_rank is null then 'birth'
        when r.new_rank < cs.previous_rank then 'rise'
        when r.new_rank > cs.previous_rank then 'decay'
        else 'peak'
      end,
    updated_at = now()
  from ranked r
  where cs.sound_id = r.sound_id;
end;
$$;

-- STEP 4 — UPDATE SCORE FUNCTION
create or replace function public.update_chart_score(p_sound_id uuid)
returns void
language plpgsql
as $$
declare
  v_post_count int;
  v_like_count int;
  v_comment_count int;
  v_lift_count int;
  v_score numeric;
begin
  if p_sound_id is null then
    return;
  end if;

  perform public.ensure_chart_row(p_sound_id);

  select count(*) into v_post_count
  from public.posts
  where sound_id = p_sound_id;

  select count(*) into v_like_count
  from public.likes l
  join public.posts p on p.id = l.post_id
  where p.sound_id = p_sound_id;

  select count(*) into v_comment_count
  from public.comments c
  join public.posts p on p.id = c.post_id
  where p.sound_id = p_sound_id;

  select count(*) into v_lift_count
  from public.post_lifts li
  join public.posts p on p.id = li.post_id
  where p.sound_id = p_sound_id;

  v_score := public.compute_ruehl_score(
    coalesce(v_post_count, 0),
    coalesce(v_like_count, 0),
    coalesce(v_comment_count, 0),
    coalesce(v_lift_count, 0)
  );

  update public.chart_scores
  set
    post_count = coalesce(v_post_count, 0),
    like_count = coalesce(v_like_count, 0),
    comment_count = coalesce(v_comment_count, 0),
    lift_count = coalesce(v_lift_count, 0),
    score = coalesce(v_score, 0),
    updated_at = now()
  where sound_id = p_sound_id;

  perform public.update_chart_ranking();
end;
$$;

-- STEP 5 — TRIGGERS

-- POST TRIGGER
create or replace function public.trigger_post_chart_update()
returns trigger
language plpgsql
as $$
begin
  perform public.update_chart_score(new.sound_id);
  return new;
end;
$$;

drop trigger if exists post_chart_update on public.posts;

create trigger post_chart_update
after insert on public.posts
for each row
execute function public.trigger_post_chart_update();

-- LIKE TRIGGER
create or replace function public.trigger_like_chart_update()
returns trigger
language plpgsql
as $$
declare
  v_sound_id uuid;
begin
  select sound_id into v_sound_id from public.posts where id = new.post_id;
  perform public.update_chart_score(v_sound_id);
  return new;
end;
$$;

drop trigger if exists like_chart_update on public.likes;

create trigger like_chart_update
after insert on public.likes
for each row
execute function public.trigger_like_chart_update();

-- COMMENT TRIGGER
create or replace function public.trigger_comment_chart_update()
returns trigger
language plpgsql
as $$
declare
  v_sound_id uuid;
begin
  select sound_id into v_sound_id from public.posts where id = new.post_id;
  perform public.update_chart_score(v_sound_id);
  return new;
end;
$$;

drop trigger if exists comment_chart_update on public.comments;

create trigger comment_chart_update
after insert on public.comments
for each row
execute function public.trigger_comment_chart_update();

-- LIFT TRIGGER (HIGH IMPACT)
create or replace function public.trigger_lift_chart_update()
returns trigger
language plpgsql
as $$
declare
  v_sound_id uuid;
begin
  select sound_id into v_sound_id from public.posts where id = new.post_id;
  perform public.update_chart_score(v_sound_id);
  return new;
end;
$$;

drop trigger if exists lift_chart_update on public.post_lifts;

create trigger lift_chart_update
after insert on public.post_lifts
for each row
execute function public.trigger_lift_chart_update();
