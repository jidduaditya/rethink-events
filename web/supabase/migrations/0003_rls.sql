-- 0003_rls.sql — Row Level Security. Implements the role×state matrix from the
-- plan (docs/superpowers/plans/2026-06-27-rethink-events-v1.md).
--
--   events SELECT:  draft  pending  published  cancelled  taken_down
--     anon            ✗       ✗         ✓          ✓           ✗
--     member          ✗       ✗         ✓          ✓           ✗
--     host(owner)     ✓       ✓         ✓          ✓           ✓
--     admin           ✓       ✓         ✓          ✓           ✓
--   reduces to: state in (published,cancelled) OR host_id=auth.uid() OR is_admin()

-- ─── profiles ────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

-- Only your own row, or admins. Other members' names reach the UI via
-- events.host_name (denormalized) and the event_attendees() RPC, never here.
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- Update your own row. The protect_profile_flags trigger blocks self-elevation
-- of is_trusted/is_admin. (Insert is handled by handle_new_user, SECURITY DEFINER.)
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ─── events ──────────────────────────────────────────────────────────────────
alter table public.events enable row level security;

-- anon + authenticated share the same read rule.
create policy events_select_visible on public.events
  for select to anon, authenticated
  using (
    state in ('published','cancelled')
    or host_id = auth.uid()
    or public.is_admin()
  );

-- Hosts create their own events (initial state set by trigger).
create policy events_insert_own on public.events
  for insert to authenticated
  with check (host_id = auth.uid());

-- Owner or admin may update; the guard_event_transition trigger enforces the
-- legal state machine (non-admin host can only published→cancelled).
create policy events_update_owner_or_admin on public.events
  for update to authenticated
  using (host_id = auth.uid() or public.is_admin())
  with check (host_id = auth.uid() or public.is_admin());

-- No delete policy: removal is the taken_down state, not a hard delete.

-- ─── rsvps ───────────────────────────────────────────────────────────────────
alter table public.rsvps enable row level security;

-- See your own RSVPs; the event's host and admins see all RSVPs for that event.
create policy rsvps_select_own_or_host on public.rsvps
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.events e
                where e.id = rsvps.event_id and e.host_id = auth.uid())
  );

-- No direct INSERT — callers use rsvp_to_event() (SECURITY DEFINER, cap-checked).

-- Update: you (cancel your own), the host (toggle check-in), or admin.
create policy rsvps_update_own_or_host on public.rsvps
  for update to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.events e
                where e.id = rsvps.event_id and e.host_id = auth.uid())
  )
  with check (
    user_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.events e
                where e.id = rsvps.event_id and e.host_id = auth.uid())
  );

-- ─── feedback (host/admin/author read; attendee writes) ──────────────────────
alter table public.feedback enable row level security;

create policy feedback_select_host_or_admin on public.feedback
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.events e
                where e.id = feedback.event_id and e.host_id = auth.uid())
  );

-- Only an attendee (has a going/cancelled RSVP) may leave feedback, once.
create policy feedback_insert_attendee on public.feedback
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.rsvps r
                 where r.event_id = feedback.event_id and r.user_id = auth.uid())
  );
