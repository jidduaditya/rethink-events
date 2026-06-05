-- 004_rls_policies.sql
-- Row Level Security policies for the Rethink Events MVP.

-- ============================================================
-- PROFILES
-- ============================================================
alter table public.profiles enable row level security;

-- Any authenticated user can read any profile.
create policy "profiles: select for authenticated"
  on public.profiles for select
  to authenticated
  using (true);

-- Users can only update their own profile.
create policy "profiles: update own row"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ============================================================
-- EVENTS
-- ============================================================
alter table public.events enable row level security;

-- Any authenticated user can read any event.
create policy "events: select for authenticated"
  on public.events for select
  to authenticated
  using (true);

-- Authenticated users can insert events they own.
create policy "events: insert own"
  on public.events for insert
  to authenticated
  with check (created_by = auth.uid());

-- Admins can update the status of any event.
create policy "events: admin update status"
  on public.events for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
       where profiles.id = auth.uid()
         and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
       where profiles.id = auth.uid()
         and profiles.role = 'admin'
    )
  );

-- Creators can update their own event while it is still pending.
create policy "events: creator update pending"
  on public.events for update
  to authenticated
  using (
    created_by = auth.uid()
    and status = 'pending'
  )
  with check (
    created_by = auth.uid()
    and status = 'pending'
  );

-- ============================================================
-- RSVPS
-- ============================================================
alter table public.rsvps enable row level security;

-- Any authenticated user can read any RSVP.
create policy "rsvps: select for authenticated"
  on public.rsvps for select
  to authenticated
  using (true);

-- Users can cancel (delete) their own RSVPs.
create policy "rsvps: delete own"
  on public.rsvps for delete
  to authenticated
  using (user_id = auth.uid());

-- Direct INSERT is blocked. Use the create_rsvp() function instead.
-- No INSERT policy is created, so RLS will deny all direct inserts.
