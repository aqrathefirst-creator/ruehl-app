create or replace function public.admin_reset_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_user_id uuid;
  acting_is_admin boolean;
begin
  acting_user_id := auth.uid();

  select p.is_admin
  into acting_is_admin
  from public.profiles p
  where p.id = acting_user_id;

  if acting_user_id is null or coalesce(acting_is_admin, false) = false then
    raise exception 'Unauthorized';
  end if;

  if target_user_id = acting_user_id then
    raise exception 'You cannot reset yourself';
  end if;

  if to_regclass('public.user_activity') is not null then
    execute 'delete from public.user_activity where user_id = $1 or target_id = $1' using target_user_id;
  end if;

  delete from public.likes where user_id = target_user_id;
  delete from public.comments where user_id = target_user_id;
  delete from public.posts where user_id = target_user_id;
  delete from public.saved_posts where user_id = target_user_id;
  delete from public.follows where follower_id = target_user_id or following_id = target_user_id;
  delete from public.blocked_users where blocker_id = target_user_id or blocked_id = target_user_id;
  delete from public.verification_requests where user_id = target_user_id;

  if to_regclass('public.user_reports') is not null then
    execute 'delete from public.user_reports where reporter_id = $1 or target_user_id = $1' using target_user_id;
  end if;

  update public.profiles
  set
    bio = null,
    avatar_url = null,
    is_verified = false,
    verified = false,
    two_factor_enabled = false,
    is_private_account = false,
    allow_messages_from = 'everyone',
    show_activity_status = true,
    allow_tagging = true
  where id = target_user_id;
end;
$$;

create or replace function public.admin_delete_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_user_id uuid;
  acting_is_admin boolean;
begin
  acting_user_id := auth.uid();

  select p.is_admin
  into acting_is_admin
  from public.profiles p
  where p.id = acting_user_id;

  if acting_user_id is null or coalesce(acting_is_admin, false) = false then
    raise exception 'Unauthorized';
  end if;

  if target_user_id = acting_user_id then
    raise exception 'You cannot delete yourself';
  end if;

  perform public.admin_reset_user(target_user_id);
  delete from public.profiles where id = target_user_id;
end;
$$;