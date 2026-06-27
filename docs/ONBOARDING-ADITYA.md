# Onboarding — ReThink Events (for Aditya + his Claude instance)

Welcome. This repo is the V1 build of ReThink Events. Read this top to bottom
before writing code; it tells your Claude instance how we work and what's yours
to build.

## 1. What this is

The participation layer for the ReThink community: a trusted member can create,
publish, fill, and run an event solo, and that event becomes a shareable public
link. Two source-of-truth docs, read both:

- `ReThink-Events-V1.md` — the approved V1 scope (13 features).
- `docs/superpowers/plans/2026-06-27-rethink-events-v1.md` — the build plan
  (phases, schema, the RLS matrix, task breakdown). The eng-review report is at
  the bottom (`## GSTACK REVIEW REPORT`).

## 2. Heads up — scope was revised (Approach A → Approach C)

Your earlier repo (`github.com/jidduaditya/rethink-events`) was built to the
original PRD (Approach A). After an office-hours session the team locked a
different, lighter V1 (Approach C). Your code was good — we **harvested** three
things from it into this repo (design system, Supabase SSR boilerplate, your
`create_rsvp` transaction pattern). Thanks for that. But the scope changed, so
please build against THIS plan, not the old PRD. Key differences:

- **Agency = trusted-host publishing**, not per-event approval. First event is
  admin-reviewed → host flips to `is_trusted` → all future events publish
  instantly. There is no `pending/approved/rejected` on every event.
- **Do NOT build** online/offline + meet-URL gating, or conflict/overlap
  warnings. Both are explicitly deferred to V2. (Your old repo had them — drop.)
- **Relevance is curation, not an algorithm**: event tags + member goal/level +
  admin `featured_for` pick + cohort count. No match-scoring.
- **Anon must be able to view public event pages** (the growth loop). This is
  why we use Server Components, see below.

## 3. Architecture decision (non-negotiable)

**Reads = React Server Components. Writes = Server Actions. No react-query.**

- Pages fetch data on the server (server supabase client) and render finished
  HTML. This is required for anon public pages and for the OG share image to
  work — both broke in the old client-rendered version.
- Mutations (RSVP, create event, approve, check-in, broadcast) are Server
  Actions (`<form action={...}>` → `revalidatePath`).
- Only reach for client `"use client"` + fetching for genuinely interactive
  bits (RSVP optimistic state, filters). Don't reintroduce react-query.

## 4. How we write code — plugins + conventions

Install and run these in your Claude Code instance:

- **ponytail** (`/ponytail full`) — keep it on for the whole session. It forces
  the laziest solution that works: stdlib/native before dependencies, one line
  before fifty, no speculative abstractions, delete over add. Mark deliberate
  shortcuts with a `// ponytail:` comment. We use it on this repo; match the
  style.
- **superpowers** — use `test-driven-development` (write the failing test first)
  and `executing-plans` / `subagent-driven-development` to work the plan
  task-by-task. The plan's Phase-3 slices expand into bite-sized TDD steps.

If you can't install the plugins, follow the behaviors manually: lazy/minimal
code, a test before the implementation, one slice at a time.

House rules:
- DRY, YAGNI, explicit over clever, smallest diff that cleanly does the job.
- Every non-trivial logic path leaves one runnable test behind.
- Match the existing design tokens in `web/app/globals.css` (Electric Zine
  system). Use the `BRAND` copy dictionary in `web/lib/brand.ts`.

## 5. What's already done

**Phase 0** — `web/` has: the Electric Zine design system + layout + theme
provider, Supabase SSR clients (`web/lib/supabase/*`), the Next 16 `proxy.ts`
session refresh, and pure-UI components (button, app-shell, nav, footer). Builds
clean (`npm run build`).

**Phase 2** — the full data spine is merged to `main`:
- `web/supabase/migrations/0001_schema.sql` — all tables + enums
- `web/supabase/migrations/0002_functions.sql` — triggers, `rsvp_to_event()`,
  `cohort_going_count()`, `event_attendees()`, state machine guard
- `web/supabase/migrations/0003_rls.sql` — full RLS role×state matrix
- `web/tests/rls.test.ts` — 37 passing regression tests (run `npm test`)

**Phase 1** — all screens exist on `main` with full UI but mock data. You don't
need to build any new pages — your slices wire real DB/actions into them.

**Slice 3.3** (public event page) — **done on main**:
- `web/app/(app)/e/[id]/page.tsx` — reads from real DB, auth-aware going count
- `web/app/(app)/e/[id]/opengraph-image.tsx` — edge OG image
- `web/supabase/migrations/0005_public_rsvp_count.sql` — apply this if setting
  up a fresh project (allows anon to count going RSVPs on published events)

**Slice 3.4** (RSVP + cancel + ticket) — **done on main**:
- `web/app/actions/rsvp.ts` — `rsvpToEvent` (calls DB function, redirects to
  ticket) + `cancelRsvp` (sets status → cancelled) Server Actions
- `web/app/(app)/e/[id]/page.tsx` — RSVP button and cancel button wired
- `web/app/(app)/ticket/[rsvpId]/page.tsx` — reads from real DB, shows
  attendee name, ICS download, Google Calendar link

**Slice 3.5** (curated feed) — **done on main**:
- `web/app/page.tsx` — real DB feed: published events, going counts batched,
  For You (featured_for matched against profile), city filter via `?city=`

**To connect to the Supabase project:** copy `web/.env.local.example` to
`web/.env.local` and fill in the three Supabase keys (ask Krishna for the
project URL + keys). Apply the migrations via the Supabase SQL editor in order
(0001 → 0002 → 0003 → 0004 → 0005) if setting up a fresh local project, or ask
Krishna to add you to the hosted project.

## 6. Your slices (Phase 3)

Five slices total. Each is an independent branch → PR. The plan
(`docs/superpowers/plans/2026-06-27-rethink-events-v1.md`, Phase 3 section)
has a "Test:" line per slice — expand it into real tests before marking done.

---

### 3.1 — Trusted-host publishing
**Branch:** `slice/3.1-host-publishing`
**Screens:** `app/(app)/organise/page.tsx` (host dashboard — my events + state
badges), `app/(app)/organise/new/page.tsx` (create form),
`app/(app)/organise/[id]/edit/page.tsx` (edit form).
**What it does:** Create/edit event forms write to `events` via a Server Action.
The `set_event_initial_state` trigger (already in the DB) sets state to
`published` for trusted hosts and `pending_review` for untrusted — no app code
needed for the trust logic. Host dashboard reads own events via RSC.
**Fields:** title, description, city (enum select — Bangalore/Pune/Delhi/
Hyderabad), venue, starts_at, ends_at, capacity (optional), tags (multiselect).
No online/offline toggle, no meet_url — that's V2.
**Cancel:** a host may cancel their own published event (sets state →
`cancelled`). The cancel Server Action also needs to email all going RSVPs —
wire the email stub (the Resend client will be in `lib/email/` by the time this
lands; if it isn't yet, throw a TODO comment and the owner will fill it).
**Tests:** untrusted host create → state is `pending_review`; trusted host
create → state is `published`; edit updates fields; cancel flips state.

---

### 3.2 — Admin queue + trust flip + takedown
**Branch:** `slice/3.2-admin`
**Screen:** `app/(admin)/admin/page.tsx`
**What it does:**
- Approval queue: list all `pending_review` events. Approve action → Server
  Action sets `state = 'published'`. The `flip_host_trusted_on_publish` trigger
  (already in DB) automatically sets the host's `is_trusted = true`. No extra
  app code needed for the trust flip.
- Trust toggle: list all profiles; admin can manually set `is_trusted` true/false
  via service role (use `SUPABASE_SERVICE_ROLE_KEY` server-side — never the anon
  key for flag changes).
- Takedown: set `state = 'taken_down'` on any event. Taken-down events disappear
  from the public feed (RLS already enforces this).
**Tests:** approve a pending event → host is_trusted becomes true, event state
is published; takedown → event not visible to anon; trust toggle persists.

---

### ~~3.4 — RSVP + capacity + ticket + calendar~~ ✅ DONE (on main)
**Branch:** `slice/3.4-rsvp-ticket`
**Screens:** RSVP button wired on `app/(app)/e/[id]/page.tsx`; ticket stub at
`app/(app)/ticket/[rsvpId]/page.tsx`.
**What it does:**
- RSVP: call `rsvp_to_event(p_event_id)` RPC (already in DB — atomic, cap-
  checked, FOR UPDATE). On success, redirect to `/ticket/[rsvpId]`.
- Cancel RSVP: Server Action sets `rsvps.status = 'cancelled'`.
- `FULL` badge: if `capacity` is set and going-RSVP count ≥ capacity, show FULL
  and disable the RSVP button. Read the count server-side.
- Ticket stub (`app/(app)/ticket/[rsvpId]/page.tsx`): screenshot-worthy
  confirmation — event title, host, date/venue, "you're in" stamp.
- Add-to-calendar: ICS download via `app/api/ics/[eventId]/route.ts`; Google
  Calendar link built in `lib/calendar.ts`.
- **No QR code** — V2.
**Tests:** RSVP succeeds on open event; at-cap event rejects; double-RSVP is
idempotent; ICS response has correct content-type; ticket page renders for a
valid rsvpId.

---

### 3.6 — Host run-view + one broadcast
**Branch:** `slice/3.6-run-view`
**Screen:** `app/(app)/organise/[id]/run/page.tsx`
**What it does:**
- Attendee list: call `event_attendees(p_event_id)` RPC (already in DB — returns
  user_id, full_name, checked_in for going RSVPs, host/admin only).
- Check-in toggle: Server Action updates `rsvps.checked_in = true/false` for a
  given rsvp row. Host or admin only (RLS already enforces).
- Broadcast: a single text area + send button. Server Action calls Resend to
  email all going RSVPs with `rsvps.status = 'going'`, then sets
  `events.broadcast_message` and `events.broadcast_sent_at`. **Block a second
  send** — if `broadcast_sent_at` is not null, the button is disabled and shows
  "Already sent [time]". One broadcast per event, ever.
**Tests:** check-in toggle persists; second broadcast attempt is rejected (server
action returns error if broadcast_sent_at is set); non-host cannot reach the
run-view (middleware/RLS).

---

### 3.9 — Post-session feedback
**Branch:** `slice/3.9-feedback`
**Screens:** feedback form surfaced on `app/(app)/e/[id]/page.tsx` after the
event ends (`ends_at < now()`); host read-view at
`app/(app)/organise/[id]/feedback/page.tsx`.
**What it does:**
- Feedback form (attendees only, after event ends): thumbs up / thumbs down
  toggle + one optional text field. Server Action inserts into `feedback` table.
  One row per (event, user) — the DB unique constraint enforces it.
- Host read-view: list all feedback rows for their event (thumbs up count,
  thumbs down count, notes). Visible to host + admin only (RLS already enforces).
- **No public ratings** — feedback is never shown to attendees or on the public
  event page.
**Tests:** attendee can submit feedback after event ends; second submission
returns the existing row (upsert or graceful conflict); non-attendee cannot
insert; non-host cannot read other event's feedback (covered by RLS test, but
assert via the route too).

## 7. Slice order recommendation

You can start all five in parallel branches, but this order minimises merge pain:
3.1 → 3.2 → 3.4 → 3.6 → 3.9. (3.6 needs events to exist; 3.9 needs RSVPs.)

## 8. Workflow (PRs + review)

1. Branch per slice: `git checkout -b slice/3.4-rsvp-ticket`.
2. Build TDD, ponytail-lazy. Keep the **RLS matrix test (plan Task 2.3) green** —
   it's the shared regression gate every PR must pass.
3. **Don't regenerate `web/lib/supabase/types.ts` on a feature branch.** It's a
   shared generated file, frozen after Phase 2. If your slice needs a schema
   change, change the migration + regenerate types in that PR and tell the other
   dev to rebase.
4. Open a PR. We review before merge to `main`.
5. Keep PRs to one slice — easier to review, smaller blast radius.

## 9. Questions to raise (don't guess)

The plan has three open questions that need a team call before they're built:
member `goal`/`level` enum values, online-vs-offline handling, and the
open-signup auth confirmation. If a slice depends on one, flag it, don't assume.

Welcome aboard.
