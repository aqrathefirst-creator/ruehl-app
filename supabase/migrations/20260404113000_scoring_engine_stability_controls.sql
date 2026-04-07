-- Stability controls for adaptive alignment + scoring engine
-- Control logic only: anti-spam, smoothing, thresholds, and normalization.

alter table if exists public.chart_scores
  add column if not exists unique_user_count int default 0;

create or replace function public.compute_ruehl_score(
  p_posts int,
  p_unique_users int,
  p_likes int,
  p_comments int,
  p_lifts int,
  p_alignment numeric,
  p_velocity numeric
)
returns numeric
language plpgsql
as $$
declare
  v_effective_posts numeric := greatest(coalesce(p_posts, 0), 0);
  v_unique_users numeric := greatest(coalesce(p_unique_users, 0), 0);
  v_likes numeric := greatest(coalesce(p_likes, 0), 0);
  v_comments numeric := greatest(coalesce(p_comments, 0), 0);
  v_lifts numeric := greatest(coalesce(p_lifts, 0), 0);
  v_alignment numeric := least(greatest(coalesce(p_alignment, 0), 0), 100);
  v_velocity numeric := greatest(coalesce(p_velocity, 0), 0);
  v_base_score numeric;
  v_alignment_contribution numeric;
begin
  -- Diminishing returns on posting volume + unique-user weighted boost.
  v_base_score :=
    (ln(v_effective_posts + 1) * 5)
    + (v_unique_users * 3)
    + (v_likes * 1)
    + (v_comments * 2)
    + (v_lifts * 10);

  -- Cap alignment influence at 1.5x of max alignment 100 -> 150.
  v_alignment_contribution := least(v_alignment * 1.5, 150);

  -- Normalized final score balance.
  return
    (v_base_score * 0.6)
    + (v_alignment_contribution * 0.2)
    + (v_velocity * 0.2);
end;
$$;

create or replace function public.update_chart_ranking()
returns void
language plpgsql
as $$
begin
  update public.chart_scores
  set previous_rank = rank;

  with eligible as (
    select sound_id, score, previous_rank
    from public.chart_scores
    where coalesce(post_count, 0) >= 3
      and coalesce(unique_user_count, 0) >= 2
  ),
  target as (
    select
      sound_id,
      previous_rank,
      score,
      row_number() over (order by score desc nulls last, sound_id) as target_rank
    from eligible
  ),
  bounded as (
    select
      sound_id,
      previous_rank,
      case
        when previous_rank is null then target_rank
        when target_rank < previous_rank - 5 then greatest(1, previous_rank - 5)
        when target_rank > previous_rank + 5 then previous_rank + 5
        else target_rank
      end as bounded_rank,
      score
    from target
  ),
  reranked as (
    select
      sound_id,
      previous_rank,
      row_number() over (order by bounded_rank asc, score desc nulls last, sound_id) as final_rank
    from bounded
  )
  update public.chart_scores cs
  set
    rank = rr.final_rank,
    movement =
      case
        when rr.previous_rank is null then 'new'
        when rr.final_rank < rr.previous_rank then 'up'
        when rr.final_rank > rr.previous_rank then 'down'
        else 'stable'
      end,
    lifecycle =
      case
        when rr.previous_rank is null then 'birth'
        when rr.final_rank < rr.previous_rank then 'rise'
        when rr.final_rank > rr.previous_rank then 'decay'
        else 'peak'
      end,
    updated_at = now()
  from reranked rr
  where cs.sound_id = rr.sound_id;

  -- Sounds below minimum data threshold are excluded from active ranking.
  update public.chart_scores
  set
    rank = null,
    movement = 'stable',
    updated_at = now()
  where coalesce(post_count, 0) < 3
     or coalesce(unique_user_count, 0) < 2;
end;
$$;

create or replace function public.update_chart_score(p_sound_id uuid)
returns void
language plpgsql
as $$
declare
  v_post_count int := 0;
  v_unique_user_count int := 0;
  v_like_count int := 0;
  v_comment_count int := 0;
  v_lift_count int := 0;
  v_avg_alignment numeric := 0;
  v_prev_velocity numeric := 0;
  v_prev_last_24h_score numeric := 0;
  v_current_spike numeric := 0;
  v_smoothed_velocity numeric := 0;
  v_score numeric := 0;
begin
  if p_sound_id is null then
    return;
  end if;

  perform public.ensure_chart_row(p_sound_id);

  -- Anti-spam effective post count: same user, same sound, only first post per 24h window counts.
  with ordered as (
    select
      p.user_id,
      p.created_at,
      lag(p.created_at) over (partition by p.user_id order by p.created_at) as prev_created_at
    from public.posts p
    where p.sound_id = p_sound_id
      and p.user_id is not null
  ),
  effective as (
    select count(*)::int as effective_posts
    from ordered
    where prev_created_at is null
       or created_at - prev_created_at >= interval '24 hours'
  ),
  null_users as (
    select count(*)::int as null_user_posts
    from public.posts p
    where p.sound_id = p_sound_id
      and p.user_id is null
  ),
  unique_users as (
    select count(distinct p.user_id)::int as unique_users
    from public.posts p
    where p.sound_id = p_sound_id
      and p.user_id is not null
  )
  select
    coalesce(e.effective_posts, 0) + coalesce(n.null_user_posts, 0),
    coalesce(u.unique_users, 0)
  into v_post_count, v_unique_user_count
  from effective e, null_users n, unique_users u;

  select count(*)::int into v_like_count
  from public.likes l
  join public.posts p on p.id = l.post_id
  where p.sound_id = p_sound_id;

  select count(*)::int into v_comment_count
  from public.comments c
  join public.posts p on p.id = c.post_id
  where p.sound_id = p_sound_id;

  select count(*)::int into v_lift_count
  from public.post_lifts li
  join public.posts p on p.id = li.post_id
  where p.sound_id = p_sound_id;

  -- Failsafe: if alignment data is missing or malformed, fallback to base scoring path.
  begin
    select coalesce(avg(least(greatest(coalesce(p.alignment_score, 0), 0), 100)), 0)
    into v_avg_alignment
    from public.posts p
    where p.sound_id = p_sound_id;
  exception when others then
    v_avg_alignment := 0;
  end;

  select coalesce(cs.velocity, 0), coalesce(cs.last_24h_score, 0)
  into v_prev_velocity, v_prev_last_24h_score
  from public.chart_scores cs
  where cs.sound_id = p_sound_id;

  -- Compute base without velocity first, then smooth velocity using prior state.
  v_score := public.compute_ruehl_score(
    coalesce(v_post_count, 0),
    coalesce(v_unique_user_count, 0),
    coalesce(v_like_count, 0),
    coalesce(v_comment_count, 0),
    coalesce(v_lift_count, 0),
    coalesce(v_avg_alignment, 0),
    0
  );

  v_current_spike := greatest(coalesce(v_score, 0) - coalesce(v_prev_last_24h_score, 0), 0);
  v_smoothed_velocity := (coalesce(v_prev_velocity, 0) * 0.7) + (coalesce(v_current_spike, 0) * 0.3);

  v_score := public.compute_ruehl_score(
    coalesce(v_post_count, 0),
    coalesce(v_unique_user_count, 0),
    coalesce(v_like_count, 0),
    coalesce(v_comment_count, 0),
    coalesce(v_lift_count, 0),
    coalesce(v_avg_alignment, 0),
    coalesce(v_smoothed_velocity, 0)
  );

  update public.chart_scores
  set
    post_count = coalesce(v_post_count, 0),
    unique_user_count = coalesce(v_unique_user_count, 0),
    like_count = coalesce(v_like_count, 0),
    comment_count = coalesce(v_comment_count, 0),
    lift_count = coalesce(v_lift_count, 0),
    velocity = coalesce(v_smoothed_velocity, 0),
    last_24h_score = coalesce(v_score, 0),
    score = coalesce(v_score, 0),
    updated_at = now()
  where sound_id = p_sound_id;

  perform public.update_chart_ranking();
end;
$$;

create or replace function public.trigger_post_chart_update()
returns trigger
language plpgsql
as $$
declare
  v_recent_duplicate boolean := false;
begin
  if new.sound_id is null then
    return new;
  end if;

  if new.user_id is not null then
    select exists(
      select 1
      from public.posts p
      where p.sound_id = new.sound_id
        and p.user_id = new.user_id
        and p.id <> new.id
        and p.created_at >= coalesce(new.created_at, now()) - interval '24 hours'
    )
    into v_recent_duplicate;
  end if;

  -- Cooldown guard: ignore extra boost from repeated same-user posts for same sound in 24h.
  if v_recent_duplicate then
    return new;
  end if;

  perform public.update_chart_score(new.sound_id);
  return new;
end;
$$;