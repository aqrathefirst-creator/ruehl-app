alter table if exists public.admin_users
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists employee_id text,
  add column if not exists is_root_admin boolean not null default false;

update public.admin_users
set employee_id = concat('RUEHL-EMP-', lpad(rn::text, 4, '0'))
from (
  select id, row_number() over (order by created_at, id) as rn
  from public.admin_users
  where employee_id is null or employee_id = ''
) seeded
where public.admin_users.id = seeded.id;

alter table if exists public.admin_users
  alter column email set not null,
  alter column employee_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_users_role_check'
      and conrelid = 'public.admin_users'::regclass
  ) then
    alter table public.admin_users
      add constraint admin_users_role_check
      check (role in ('SUPER_ADMIN', 'ADMIN', 'ANALYST', 'MODERATOR'));
  end if;
end $$;

create unique index if not exists admin_users_email_unique_idx on public.admin_users (lower(email));
create unique index if not exists admin_users_employee_id_unique_idx on public.admin_users (employee_id);
create index if not exists admin_users_is_root_admin_idx on public.admin_users (is_root_admin);
