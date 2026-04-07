-- Allow authenticated users to read their own admin profile row.
-- This is required for client-side admin login checks.
alter table public.admin_users enable row level security;

drop policy if exists "admin_users_select_own" on public.admin_users;
create policy "admin_users_select_own"
on public.admin_users
for select
to authenticated
using (auth.uid() = id);
