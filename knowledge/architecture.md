# Architecture — ReThink Events

Purpose: the system map a new session reads before touching code. Filled
against builder-os/templates/architecture.md at RUNDOWN stages; kept honest
by /session-end. If this file disagrees with the code, the code is right —
then fix this file.

## System map

- `web/` — Next.js 16 App Router app. Reads are Server Components using the
  server Supabase client; writes are Server Actions (`"use server"`) that
  `revalidatePath`. No client-side data fetching library.
- Routes: `/` feed (Phase 4: schedule-first dashboard), `/e/[id]` public
  event page + OG image, `/ticket/[rsvpId]`, `/organise` host dashboard
  (+ `/new`, `/[id]/edit`, `/[id]/run`), `/admin`, `/auth`,
  `/events/[id]/feedback` (in PR #10 until the stabilize port lands).
- `web/lib/supabase/` — four clients: `server.ts` (RSC/actions, anon key +
  cookies), `client.ts` (browser), `middleware.ts` (session refresh via
  proxy.ts), `service.ts` (service role, server-only, flag changes and RPCs
  that bypass RLS deliberately).
- `web/lib/auth.ts` — `requireAuth` / `requireAdmin` / `requireOwner`
  (+ `requireTrusted` arriving in Phase 4), throwing typed `AuthError`.

## Data model (migrations, append-only once applied)

- `0001_schema.sql` — profiles (goal/level/city enums, is_trusted, is_admin),
  events (state machine enum: draft/pending_review/published/cancelled/
  taken_down; city enum; tags array; capacity; broadcast + reminder columns),
  rsvps (status, checked_in), feedback (thumbs boolean + note, unique per
  event+user).
- `0002_functions.sql` — `is_admin()`, `handle_new_user()` (auth.users ->
  profiles), `set_event_initial_state()` (trusted -> published, else
  pending_review; derives host_name from profile), `guard_event_transition()`
  (state machine + immutable fields), `protect_profile_flags()` (no
  self-elevation), `rsvp_to_event()` (atomic, capacity-checked, FOR UPDATE),
  `cohort_going_count()`, `event_attendees()`.
- `0003_rls.sql` — the role x state visibility matrix. Regression-gated by
  `web/tests/rls.test.ts`; every PR must keep it green.
- `0004` service-role trigger fix, `0005` public RSVP count.
- `0006_host_whitelist.sql` (Phase 4, planned) — host_whitelist table,
  grant/revoke triggers as the ONLY write path for is_trusted, trusted-only
  events INSERT, trust reset, retires flip_host_trusted_on_publish.

## Load-bearing invariants

1. The database is the bouncer; the UI is the sign on the door. Every access
   rule exists in RLS first, app code second.
2. `is_trusted` means "publishes instantly" via DB trigger. After Phase 4 the
   whitelist is its only write path; admins whitelist themselves to host.
3. Migrations are history: append-only once applied, never edited.
4. `events.host_name` is denormalized from profiles by trigger; never trust
   caller-supplied identity fields.
5. One broadcast per event, ever (broadcast_sent_at guards the second send).
