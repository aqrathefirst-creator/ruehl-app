-- Enforce mandatory usernames for all users.

update public.profiles
set username = lower(trim(username))
where username is not null;

update public.profiles
set username = regexp_replace(username, '[^a-z0-9_]', '', 'g')
where username is not null;

update public.profiles
set username = concat('user_', substr(replace(id::text, '-', ''), 1, 12))
where username is null
   or username = ''
   or length(username) < 3;

with duplicates as (
  select
    id,
    username,
    row_number() over (partition by username order by id) as rn
  from public.profiles
)
update public.profiles p
set username = left(concat(d.username, '_', substr(md5(p.id::text), 1, 4)), 20)
from duplicates d
where p.id = d.id
  and d.rn > 1;

drop index if exists public.profiles_username_unique_ci;

create unique index if not exists profiles_username_unique_ci
  on public.profiles (lower(username));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_username_format_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_username_format_check
      check (username ~ '^[a-z0-9_]{3,20}$');
  end if;
end $$;

alter table public.profiles
  alter column username set not null;
