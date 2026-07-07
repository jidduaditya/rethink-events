# Design: ReThink Community App — Phase 4

Date: 2026-07-07
Status: Approved by Aditya (brainstorming session)
Builds on: `ReThink-Events-V1.md`, `docs/superpowers/plans/2026-06-27-rethink-events-v1.md`
Repo state at writing: slices 3.1/3.2/3.3/3.5 + Phase 1 UI + guardrails merged to
`origin/main`; PRs #8 (3.4 RSVP+ticket), #9 (3.6 run-view), #10 (3.9 feedback) open.

## 1. Outcome

Reframe the V1 events app community-first: any whitelisted ReThink member can
schedule and run their own event with no founder in the loop, and every member
lands on a schedule-first dashboard of their own commitments. This is an
evolution of this repo — no rebuild, no new project.

Three workstreams, strictly in this order:

1. **Stabilize** — review and merge PRs #8, #9, #10 so `main` is complete V1.
2. **Whitelist-gated hosting** — admin-managed email list decides who can host.
   Whitelisted = trusted = instant publish.
3. **Schedule-first home** — signed-in members land on hosting/attending
   commitments, upcoming events below.

## 2. Decisions made (with why)

| Decision | Choice | Why |
|---|---|---|
| Evolve vs rebuild | Evolve this repo | Nothing in the existing schema/RLS/slices blocks the new direction; rebuild gate found no justification |
| Access model | Whitelist gates HOSTING only | Attendance stays open: anyone can view, share, and RSVP (signed in). Only the create flow is gated |
| RSVP identity | Account required (unchanged) | Keeps tickets, capacity, check-in, feedback intact; zero schema change |
| Trust flow | Whitelist = instant publish | Being whitelisted IS the trust decision. `pending_review` machinery stays in the DB, dormant — V2 fallback if whitelist-only vetting proves too loose |
| Home surface | My schedule + upcoming | Hosting section, attending section, then all upcoming events; feed pieces reused, demoted |
| Whitelist UX | Add-email form + list on admin page | Simplest thing that works at community scale; pre-approval before signup supported |
| Enforcement | DB-enforced (RLS), not app-layer only | The database is the bouncer, the UI is the sign on the door. One new access rule must live in the same RLS matrix as every other rule |

Deferred (unchanged from V1 deferral table, plus this phase's cuts): 24h
reminder email, production launch checklist (domain, SPF/DKIM, seed whitelist),
visual polish pass, match scoring, waitlist, QR check-in, payments.

## 3. Whitelist mechanics

New migration `0006_host_whitelist.sql`:

- Table `host_whitelist`: `email text primary key` (stored lowercased),
  `added_by uuid references profiles`, `created_at timestamptz default now()`.
- RLS: only admins may select/insert/delete. No anon or member access.
- **Grant path (member exists):** admin adds email → server action (service
  role) flips `profiles.is_trusted = true` for the matching profile.
- **Grant path (member not yet signed up):** trigger on `profiles` insert
  checks `host_whitelist` for the new profile's email (lowercased) and sets
  `is_trusted = true` at signup. Pre-approval works.
- **Revoke path:** admin removes email → server action flips
  `profiles.is_trusted = false`. The member keeps attending; they lose the
  create flow. Their existing published events are untouched.
- **Tighten events INSERT policy:** only profiles with `is_trusted = true`
  (or admins) may insert rows into `events`. Previously any member could
  create (into `pending_review`); that path closes.

No new "can host" concept: the existing `is_trusted` flag already means
"publishes instantly" via the live `set_event_initial_state` trigger.
Whitelist membership becomes the only way the flag turns on.

Email matching: normalize with `lower(email)` on write AND on comparison.
OTP login verifies email ownership, so matching on email is safe.

## 4. Schedule-first home

Replace the feed as the signed-in landing surface. The landing route is
`web/app/page.tsx`; if implementation finds the feed actually lives at a
different route on main, the dashboard replaces whatever the signed-in
landing is — the invariant is "first screen a member sees", not a file path.

- **Hosting** — the member's own events with state badges and going-counts.
  Reuses the organise-page query.
- **Attending** — the member's `going` RSVPs joined to events, soonest first,
  each linking to its ticket. Reuses the ticket-page query pattern.
- **Upcoming** — all published future events; reuse the merged feed's card
  grid, tag/city filters, and "For you" row, demoted below commitments.
- **Empty states are the launch-common case:** no commitments → lead with
  Upcoming; if trusted, show a create prompt.

Anon visitors: upcoming events list + sign-in CTA. `/e/[id]` public pages and
the OG image route are untouched — still shareable, still the dormant growth
surface.

Navigation: "Organise" / create affordances render only when the viewer's
profile `is_trusted`. Non-trusted members never see hosting UI. No
"request access" CTA in this phase.

## 5. Admin additions

One new section on the existing admin page (`app/(admin)/admin/page.tsx`):

- Add-email form (Server Action, service role, lowercases input).
- List of whitelist entries: email, added-by, added-at, remove button.
- Remove confirms before revoking (destructive action rule).

## 6. Testing

Same TDD pattern as slices 3.6/3.9 (mocked `createClient`, failing test
first). Required coverage:

- Whitelist add flips an existing member's `is_trusted` to true.
- Pre-approved email → profile created at signup is trusted (trigger test,
  lives with the RLS/integration suite).
- Removal revokes `is_trusted`.
- Non-trusted authenticated user INSERT on `events` is rejected by RLS —
  extends the existing RLS matrix test file.
- Admin-only access to `host_whitelist` (anon and member reads fail).
- Home page renders hosting / attending / upcoming for the right user;
  create prompt only for trusted.
- Existing 37 RLS tests stay green before and after migration 0006 — the
  shared merge gate, unchanged.

## 7. Pitfalls this design routes around

1. **Unmerged-branch stacking.** PR #10 targets #9's branch which targets
   main. All three merge before any Phase 4 code. Non-negotiable ordering.
2. **Email case sensitivity.** `lower()` everywhere or whitelisting silently
   fails for capitalized signups.
3. **`types.ts` freeze.** Migration 0006 is a schema change, so its PR — and
   only its PR — regenerates `web/lib/supabase/types.ts`. Flag loudly;
   everything else rebases after.
4. **RLS interaction.** Tightening events INSERT could break existing matrix
   expectations (e.g. a test asserting members CAN create pending events).
   Update the matrix and its tests deliberately, in the same PR as 0006.
5. **Foundation unknown.** It is not verified whether migrations 0001–0005
   are applied to the hosted Supabase project or where the app is deployed.
   Implementation step zero is verifying foundation state; 0006 stacks on top
   of an applied 0001–0005, nothing else.
6. **Dormant-path drift.** `pending_review` machinery stays but no UI reaches
   it after this phase. The admin approval queue section may render empty
   forever — acceptable; do not delete it.

## 8. Success criteria for this phase

- `main` contains all of V1 (three PRs merged, suite green).
- An admin can whitelist an email; that person (pre- or post-signup) sees the
  create flow and publishes instantly.
- A non-whitelisted member can browse, RSVP, get a ticket, and share — and
  cannot reach or invoke event creation (verified at RLS level, not just UI).
- A signed-in member's home leads with their hosting/attending commitments.
- Full test suite green, including the extended RLS matrix.
