# Rethink Events V0 — Design Spec

Date: 2026-06-09
Status: Approved (design). Implementation plan pending approval.
Author: brainstormed with Aditya (PM) acting on the June 8 catch-up direction.

---

## 1. Context

The June 8 catch-up reframed the product as a "participation layer," with a long-term
"proof-of-participation graph" vision. That full vision is the end-to-end target, not V0.

V0 is the smallest honest slice: stand up the events surface for Rethink Premium members,
gate it behind a member whitelist, and watch whether people come here instead of WhatsApp.
The participation graph, host credibility/ratings, public access, push notifications, real
federated SSO, and Zoom/Meet API integrations are all explicitly out of V0.

This spec builds on the existing MVP build (Next.js App Router + Supabase, email OTP auth,
3-table schema: profiles / events / rsvps, native RSVP engine with capacity + time-conflict
detection, admin approval flow).

---

## 2. What V0 is

A gated, members-only events app with:

- Whitelist-gated login (email OTP proves ownership, allowlist decides entry).
- A three-section feed: happening now/next, events you registered for, everything else.
- Filters: city, online/offline, date.
- Event detail with photo, speaker info, event details, and a register action.
- Hybrid registration per event: native RSVP (our guest list) OR external link (Zoom/Form).
- Admin: approve/reject events, manage the whitelist, see/remove native attendees.

---

## 3. Auth + whitelist (the gate)

**Mechanism.** Login is unchanged: Supabase email OTP / magic link proves the person owns
the email. After verification, a check against an `allowlist` table decides entry. Not on
the list → a polite "you're not on the Rethink Premium list yet" screen, session is signed out.

**Forward-compatible design.** The `allowlist` table is the single source of truth that the
login gate reads. Each row records its `source` (`manual` now; `rethink_sync` later). Today
only the manual door is open via an admin UI. Later, a Rethink membership sync writes into the
same table with `source = 'rethink_sync'`. The login gate never changes because it only reads
the table and does not care who wrote the row.

**Data model.**

```
allowlist (
  id          uuid pk default gen_random_uuid(),
  email       text not null unique,          -- stored lowercased/trimmed
  source      text not null default 'manual' check (source in ('manual','rethink_sync')),
  added_by    uuid references profiles(id),  -- null for synced rows
  created_at  timestamptz not null default now()
)
```

**Enforcement.** Gate runs server-side in middleware (or a server check on protected routes),
not just client-side, so it cannot be bypassed. Email match is case-insensitive.

**Admin UI.** Add single email, bulk-paste (newline/comma separated), remove, and list. Lives
in the existing admin section. Only `role = 'admin'` can access.

---

## 4. Events data model changes

Add to `events`:

- `image_url text` — event photo (nullable; feed/detail show a branded placeholder if null).
- `city text` — the event's city, used by the city filter (offline events; null/“Online” handling for online).
- `speaker_name text`, `speaker_bio text`, `speaker_photo_url text` — informational speaker
  block, all nullable. One speaker per event in V0. NOT a credibility/ratings system.
- `register_mode text not null default 'native' check (register_mode in ('native','external'))`.
- `register_url text` — required when `register_mode = 'external'`, else null.

`meet_url` stays as the join link for native online events. `register_url` is distinct: it is
the external registration destination (Zoom signup, Google Form, Luma) for external-mode events.

A check constraint enforces: `register_mode = 'external'` ⇒ `register_url is not null`.

---

## 5. Registration (hybrid)

We generalize the native-only `rsvps` table into a single `registrations` table so the
"registered for these" feed section reads one place for both kinds.

```
registrations (
  id          uuid pk default gen_random_uuid(),
  user_id     uuid not null references profiles(id),
  event_id    uuid not null references events(id),
  kind        text not null check (kind in ('native','external')),
  created_at  timestamptz not null default now(),
  unique (user_id, event_id)
)
```

**Native path.** Clicking Register calls the existing transactional function (renamed to
`create_registration`, kind `'native'`) which keeps capacity + time-conflict + past-event +
approved-event checks, locking the event row to prevent races. Behavior identical to today.

**External path.** Clicking Register inserts a `kind = 'external'` row (intent log), then
redirects the user to `register_url`. No capacity or conflict checks apply to external events.
The host manages those attendees on their own platform; our app only knows intent.

**Migration safety (Create → Verify → Swap → Delete).** Build `registrations` +
`create_registration`, backfill existing `rsvps` rows as `kind='native'`, repoint the app and
RLS, verify, then drop the old `rsvps` table and `create_rsvp`. No user-visible behavior change
on the native path.

---

## 6. Feed (post-login home)

Three sections, in order:

1. **Now / Next** — events currently live or starting soonest (approved, upcoming).
2. **You're registered for these** — events the user has a `registrations` row for (native or
   external). Empty state when none.
3. **Everything else** — approved upcoming events the user has NOT registered for, date-sorted.

**Filters** (apply across sections 2–3): `city`, `online/offline`, and a date control. Time-of-day
and weekday/weekend filters are intentionally cut for V0 (add later when event volume warrants).

Implementation note: today's feed is a single infinite query (`useEvents`). V0 restructures it
into sectioned queries that share the filter state. The existing `EventCard`, `EmptyState`,
and skeleton components are reused.

---

## 7. Event detail page

Extends the existing detail layout:

- **Photo** — `image_url` hero (branded placeholder if null).
- **Title + description** — existing.
- **Speaker block** — name, bio, photo when present; hidden entirely if no speaker. Informational.
- **Event details** — existing time + venue/online sidebar.
- **Register action** — branches on `register_mode`:
  - native → existing `RsvpButton` + capacity/conflict warnings + attendee count.
  - external → a "Register on [Zoom/Form]" button that logs intent then opens `register_url`.

---

## 8. Admin

Reuses the existing admin section. V0 additions:

- **Whitelist management** — add/bulk-add/remove/list allowlisted emails (see §3).
- **Attendees** — for native events, view and remove attendees (existing capability, repointed
  to `registrations` where `kind='native'`). For external events, show only a headcount of
  logged intents; no attendee management (host owns that data elsewhere).
- **Event approval** — unchanged.

---

## 9. Explicitly out of V0

Participation graph, host credibility / attendee ratings, push notifications,
public/non-member access and any public data model, real federated SSO, a custom form builder
(the native RSVP path IS "our own form"), and Zoom/Google Meet API integrations (external is a
pasted link only).

---

## 10. Risks / watch-items

- **Behavior change has no engine in V0.** The KPI (WhatsApp → app) has no notification hook
  yet; V0 is deliberately the observation experiment. If adoption is weak, the V1 lever is a
  reason-to-open (digest/notification), not more filters.
- **External events give a thin host dashboard.** Accepted: headcount only, no attendee mgmt.
- **City data hygiene.** City is free-text on events today; for a clean filter we normalize on
  input (and can offer a small known-city set in the create form). Decide in the plan.
