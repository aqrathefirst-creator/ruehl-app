create table if not exists public.email_verification_otps (
  email text primary key,
  otp_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  cooldown_until timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_email_verification_otps_expires_at
  on public.email_verification_otps (expires_at);

alter table public.email_verification_otps enable row level security;

create or replace function public.mark_profile_verified_by_email(target_email text)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_user_id uuid;
begin
  select u.id
  into target_user_id
  from auth.users u
  where lower(u.email) = lower(target_email)
  order by u.created_at desc
  limit 1;

  if target_user_id is null then
    raise exception 'User not found for email';
  end if;

  update public.profiles
  set
    is_verified = true,
    verified = true
  where id = target_user_id;

  return target_user_id;
end;
$$;