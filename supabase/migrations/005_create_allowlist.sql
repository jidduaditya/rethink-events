-- 005_create_allowlist.sql
-- Whitelist of Rethink Premium emails permitted to enter the app.
-- Single source of truth read by the login gate. `source` records provenance
-- so a future Rethink membership sync can write rows without changing the gate.

create table public.allowlist (
  id         uuid        primary key default gen_random_uuid(),
  email      text        not null unique,
  source     text        not null default 'manual'
                         check (source in ('manual', 'rethink_sync')),
  added_by   uuid        references public.profiles(id),
  created_at timestamptz not null default now()
);

-- SECURITY DEFINER gate: lets the middleware ask "is this email allowed?"
-- without exposing the whole allowlist to ordinary users.
create or replace function public.is_allowlisted(p_email text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.allowlist
     where email = lower(trim(p_email))
  );
$$;

alter table public.allowlist enable row level security;

-- Only admins can read or manage the allowlist.
create policy "allowlist: admin select"
  on public.allowlist for select
  to authenticated
  using (exists (select 1 from public.profiles
                  where profiles.id = auth.uid() and profiles.role = 'admin'));

create policy "allowlist: admin insert"
  on public.allowlist for insert
  to authenticated
  with check (exists (select 1 from public.profiles
                       where profiles.id = auth.uid() and profiles.role = 'admin'));

create policy "allowlist: admin delete"
  on public.allowlist for delete
  to authenticated
  using (exists (select 1 from public.profiles
                  where profiles.id = auth.uid() and profiles.role = 'admin'));
