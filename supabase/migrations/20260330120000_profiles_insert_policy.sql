-- Allow authenticated users to insert their own profile row.
-- Previously only select and update policies existed, causing client-side
-- upserts during signup to fail silently when the row did not yet exist.

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
with check (auth.uid() = id);
