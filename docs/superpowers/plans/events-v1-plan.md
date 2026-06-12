# Rethink Events App — V1 Production Plan

**Status:** Authoritative build plan. Supersedes `plan.md` (MVP) and extends the V0 spec (`docs/superpowers/specs/2026-06-09-events-v0-design.md`).
**Date:** 2026-06-12
**Audience:** Claude Code (Sonnet) executing the build, and Aditya supervising.
**Precondition:** `feat/events-v0` has passed the browser e2e and is merged into `main`. Do not start V1 work on an unmerged V0.

---

## 0. HOW TO USE THIS DOCUMENT (read first, Claude Code)

You are building V1 of a working app, not greenfield. The order of operations is fixed:

1. Read `CLAUDE.md` at the project root.
2. Read this entire plan once before writing anything.
3. Execute **Phase 0 (documentation housekeeping)** first — it rewrites the stale project docs so every later session starts from truth, not aspiration.
4. Execute Phases 1–5 in order. One task per commit. Run the verification gates before every commit.
5. When this plan conflicts with what the code actually does, **the code is the truth about the present and this plan is the truth about the intent**. Stop, write a one-paragraph note in `knowledge/session-journal.md`, surface the conflict to the user, and wait. Do not improvise a third design.

### Hard guardrails (non-negotiable, apply to every task)

These exist because the executing model is Sonnet working across many fresh sessions. Follow them mechanically.

1. **Never touch the live database.** You write migration files under `supabase/migrations/`. The human applies them. Never run SQL against the Supabase project, never use the service role key, never "just check" production data. This is the agreed working split.
2. **Never modify migrations `001`–`009`.** They are applied and immutable. All schema change is new files, `010` onwards.
3. **Verify before you assume.** Before writing any migration or any code that touches a table, read the actual migration files `001`–`009` and the relevant hooks/components. Column names in this plan are intent; the migration files are fact. If they differ, follow the fact and note the difference.
4. **Cache invalidation map is mandatory.** Every mutation you write or modify must include a comment block listing every React Query key it invalidates, and the invalidations must match the map in §6. A mutation that updates data read by N views invalidates N keys. (This rule has already been violated twice — see `knowledge/past-mistakes.md`.)
5. **Route precondition cross-check.** Before mounting any feature on a route, verify the route's guards permit the state the feature needs (the `/organise/[id]/edit` lesson — pending-only route, approved-only data).
6. **All user-facing copy lives in `lib/brand.ts`.** No inline strings in components. No exclamation marks. No em dashes. No "Welcome", "Discover", "Get started", "Don't miss out". Labels and metadata uppercase mono. Voice rules in `stitch/brand.md` §Voice.
7. **No new dependencies** unless the task explicitly lists them. The approved additions for V1 are exactly: `qrcode.react`, `ics` (calendar file generation), `@vercel/og` (or Next's built-in `ImageResponse`). Nothing else without asking.
8. **Do not refactor working V0 code** outside the scope of the current task. Resist drive-by cleanups; log them as suggestions in the session journal instead.
9. **TypeScript strict, no `any`,** `bunx tsc --noEmit` clean, `bun run test` green, `bun run build` compiling, lint clean except the two known pre-existing files (`lib/providers.tsx`, `lib/supabase/middleware.ts` — leave them alone) before every commit.
10. **Honest UI states.** Every list has a designed empty state with copy that tells the truth (filters hiding items ≠ no items). Every async surface has a skeleton (solid `surface-container` blocks, never spinners). Every mutation has a visible error path.
11. **Branch discipline.** All V1 work on `feat/events-v1`, branched from `main` after the V0 merge. Same subagent rhythm as V0 if available: implement → spec review → code review → fix → commit.
12. **End every session** with a 5-line entry in `knowledge/session-journal.md` and any new decision in `knowledge/decisions.md`.

---

## 1. WHAT V1 IS (product intent)

V0 proved the skeleton: gated entry, a feed, native/external registration, host attendee management. V1 closes the three loops V0 left open and adds the production surfaces a real community needs. In one line:

> **V0 built the gate and the guest list. V1 builds the handshake, the follow-up, and the front door.**

The five product moves, each traceable to the vision doc and discovery:

1. **Trusted-host publishing (kill the per-event bottleneck).** The vision is "events happen without Unnati/Atharv/Shravan in the loop." Admin approving every event *is* the founder bottleneck with a UI. V1: a member's **first** event needs approval; the approval flips them to trusted; trusted hosts publish live instantly. Admin keeps take-down and can revoke trust. One gate, training wheels included.
2. **Registration becomes a moment, not a counter.** A real confirmation: a ticket page with QR, add-to-Google-Calendar and ICS download, and a WhatsApp re-share. Plus the 24-hour reminder email. Calendar insertion + reminder is what protects attendance; the re-share is the only growth loop a members app has.
3. **Hosts can talk to their attendees.** Event updates (broadcast): composed on the event page, shown to registered members, fanned out by email. Without this, every host opens a WhatsApp group on day one and re-fragments the exact thing this app exists to fix.
4. **The front door opens a crack.** Approved events become **publicly viewable** (read-only): a shared link renders a real event page with a real OG card in WhatsApp, instead of bouncing strangers to `/not-allowed`. Registration stays members-only. This is the smallest honest version of the TOFU role the vision doc assigns this product (discover → attend → join ecosystem).
5. **Events have a full lifecycle.** Waitlist with auto-promotion when a spot opens. Cancellation as a designed state with attendee notification. Past events with a visible archive. Day-of check-in (one tap per attendee) — which quietly creates the attendance data the future participation graph needs.

Also fixed: the time-conflict check changes from a hard block to a warning (people legitimately RSVP to two things and decide Thursday — warn, don't parent), and external registration becomes honest (a click is not a registration; confirm it).

**Still out of scope for V1 (do not build, do not scaffold):** badges, streaks, participation graph UI, ratings, push notifications, chat, payments/ticketing, budget tools, SSO federation, Zoom/Meet API integration, external event scraping, photo recaps (`event_media` — explicitly Phase-after-V1). The kill list in `knowledge/decisions.md` stands.

---

## 2. PHASE 0 — DOCUMENTATION HOUSEKEEPING (do this before any code)

The project docs drifted: `CLAUDE.md` and `knowledge/architecture.md` still describe an aspirational FastAPI/Railway/6-table system that was never built. Sonnet sessions that read them will hallucinate the wrong app. Rewrite them first.

### Task 0.1 — Rewrite `CLAUDE.md`

Prompt to execute:

> Rewrite the project root `CLAUDE.md`. Keep the same structure (what the product is / where to find what / working rules / stack / status) but correct it to reality:
> - **Stack section** must read: Next.js (App Router) + React + TanStack Query + Tailwind + shadcn/ui (rethemed per `stitch/brand.md`) + Supabase (Postgres, Auth, RLS, Storage) + Bun + Vitest. Hosting: Vercel. Email: Mailmodo (transactional + campaigns) and custom SMTP for Supabase auth emails. Remove FastAPI, Railway, PostHog, Sentry, Stripe (move the last three to a "later, not configured" line).
> - **File map**: point "build plan" at `docs/superpowers/plans/` and this file (`events-v1-plan.md`); mark root `plan.md` as superseded/archive. Brand row points at `stitch/brand.md`.
> - **Working rules**: keep the existing six, and append guardrails 1–5 and 9 from `events-v1-plan.md` §0 verbatim as rules 7–12.
> - **Status section**: "V0 merged to main (whitelist gate, hybrid registration, three-section feed, host attendee management). V1 in build per `events-v1-plan.md`: trusted-host publishing, ticket/confirmation, reminders, host broadcast, waitlist, cancellation, public event pages + OG, check-in."
> Do not invent content beyond this. Keep it under 120 lines.

### Task 0.2 — Rewrite `knowledge/architecture.md`

Prompt to execute:

> Rewrite `knowledge/architecture.md` from scratch. Delete the aspirational model (users/venues/badges/chats/event_list, FastAPI, Mailmodo-only stack diagram). The new document has three sections:
> 1. **As built (V0)** — derive this by reading migrations `001`–`009` and the actual code. Document the real tables (`profiles`, `events`, `registrations`, `allowlist`), their real columns, the real RPCs (`create_registration`, `is_allowlisted`), the real RLS policies, and the middleware gate flow. Every column documented here must exist in a migration file; cite the migration number next to each table.
> 2. **V1 delta** — copy the schema section (§5) of `events-v1-plan.md` as the planned change set, marked "planned, not applied".
> 3. **Key patterns** — keep: atomic registration in a Postgres function; optimistic mutation triple (onMutate/onError/onSettled); cache invalidation map (link to plan §6); cursor pagination; UTC storage with IST display; RLS as the only authorization authority (UI gates are defense-in-depth).
> Confidence tags: everything in section 1 is 🟢 (verified against code); section 2 is the plan.

### Task 0.3 — Append to `knowledge/decisions.md`

Append the following entries verbatim (dated 2026-06-12), then commit Phase 0 as one commit:

> **2026-06-12 · V1 trust model: first event approved, then publish freely**
> Per-event admin approval recreated the founder bottleneck the product exists to remove. V1: `profiles.trusted_host` flag; first approval flips it; trusted hosts' events go live on create. Admin keeps take-down (cancel) and can revoke trust. Rejected: keep per-event review (slow, contradicts vision); fully open publishing (no spam protection on day one).
>
> **2026-06-12 · Approved events are publicly readable; participation stays gated**
> Shared links must render for non-members (event page + OG card) or sharing is dead and the TOFU role is impossible. Anon users see a read-only event page with a members-only register CTA. Registration, feed, creation all remain behind the allowlist. Rejected: keep everything gated (kills sharing); open registration (contradicts premium-members decision).
>
> **2026-06-12 · Time-conflict becomes a warning, not a block**
> Hard-blocking parallel RSVPs is paternalistic and costs registrations. Server returns a conflict flag; client shows a confirm dialog; user proceeds if they choose. Rejected: keep hard block.
>
> **2026-06-12 · Waitlist with atomic auto-promotion**
> Full events take waitlist registrations. Any vacancy (cancel or host-remove) promotes the oldest waitlisted registration inside the same Postgres function and triggers a promotion email. Rejected: manual host promotion (busywork); no waitlist (lost demand signal).
>
> **2026-06-12 · External registration requires confirmation**
> A click on an external link is not a registration. Flow: open link in new tab → on return, inline prompt "Did you register?" → row is created only on confirm. Headcounts become honest. Rejected: log intent on click (V0 behavior, unverifiable data).
>
> **2026-06-12 · Reminders and broadcasts ship in V1; Mailmodo is the sender**
> 24h reminder via scheduled function; host broadcast with email fan-out. Both were "later" in V0; both are the difference between a calendar and a participation engine. Custom SMTP gets configured for Supabase auth so OTP codes actually appear in emails (known V0 gap).

Also: move root `plan.md` to `_archive/plan-mvp-2026-06-04.md` with a one-line superseded header.

---

## 3. OPS PREREQUISITES (human tasks — Aditya, not Claude Code)

Claude Code: if any of these are missing when a task needs them, stop and ask; do not mock around them silently (a stubbed email sender behind a single `lib/email.ts` interface is the one allowed fallback, clearly logged).

- [ ] Run V0 e2e, merge `feat/events-v0` → `main`.
- [ ] Make yourself admin: `update public.profiles set role = 'admin' where email = 'jiddu.aditya@gmail.com';`
- [ ] **Configure custom SMTP** in Supabase (Authentication → Emails → SMTP) so the OTP template actually sends the 6-digit code. Any provider works.
- [ ] Create a **Mailmodo** account, get the API key, create the five templates listed in §8, put `MAILMODO_API_KEY` in `.env.local` and Vercel env.
- [ ] Apply each V1 migration when Claude Code hands it over (in order, `010` onwards).
- [ ] Enable `pg_cron` + `pg_net` extensions in Supabase when Phase 3 asks (Dashboard → Database → Extensions), and schedule the reminder cron (SQL provided in migration `014`).
- [ ] When Phase 4 lands: deploy to Vercel (the OG/share work is only fully testable on a public URL), set `NEXT_PUBLIC_SITE_URL`.

---

## 4. PRODUCT SPEC BY SURFACE

Terminology note: the codebase uses `status: pending | approved | rejected`. V1 adds `cancelled`. "Published" in conversation = `approved` in code. Do not rename existing values.

### 4.1 Event lifecycle and states

An event is in exactly one of these UI states, derived from `status` + time:

| State | Derivation | Detail page treatment | Feed treatment |
|---|---|---|---|
| Pending | `status='pending'` | Visible to creator + admin only, "IN REVIEW" mono badge | Hidden |
| Live now | `approved` AND `starts_at <= now() < ends_at` | "LIVE" badge (tertiary pink, pulse dot, max one per screen rule) | "Happening now" section |
| Upcoming | `approved` AND `starts_at > now()` | Normal | Feed |
| Full | Upcoming AND confirmed count ≥ capacity | Register CTA becomes "JOIN WAITLIST" (yellow), waitlist count shown | Card shows "FULL · WAITLIST OPEN" mono tag |
| Cancelled | `status='cancelled'` | Full-width error-container banner "THIS EVENT WAS CANCELLED" + reason; registration disabled; page remains readable | Hidden from feed; visible in /me with cancelled tag |
| Past | `approved` AND `ends_at <= now()` | "THIS EVENT HAS ENDED" banner; register hidden; attendee count frozen; host sees check-in summary | Out of feed; in `/past` archive |
| Rejected | `status='rejected'` | Creator + admin only, rejected badge | Hidden |

Cancellation: the host (own event) or an admin can cancel an upcoming approved event from the detail page. Requires a confirm dialog and a free-text reason (stored, shown in banner, included in the cancellation email to all confirmed + waitlisted attendees). There is no un-cancel in V1.

### 4.2 Trusted-host publishing

- `profiles.trusted_host boolean default false`.
- Create flow: if creator is trusted (or admin) → event inserts as `approved` and is live immediately; else `pending` as today.
- Admin approving a `pending` event sets the event approved AND sets the creator's `trusted_host = true` (same RPC, atomic).
- Admin users screen gains a trust column with revoke/grant toggle. Revoked hosts fall back to per-event review; their already-approved events are untouched.
- Copy for first-time creators on submit (in `lib/brand.ts`): "FIRST EVENT GOES THROUGH REVIEW. AFTER THAT YOU PUBLISH INSTANTLY."

### 4.3 Registration depth (native events)

- **Capacity full → waitlist.** `registrations.status: confirmed | waitlisted | cancelled` (default confirmed). `create_registration` inserts `waitlisted` when full and returns the state so the UI can say which happened.
- **Self-cancel.** A registrant can cancel from the ticket page or `/me` (sets status `cancelled`, frees a spot, triggers promotion). Allowed until event start.
- **Auto-promotion.** One Postgres function `promote_from_waitlist(event_id)` promotes the oldest `waitlisted` row to `confirmed` whenever a confirmed spot frees (self-cancel or host removal call it inside the same transaction). It returns the promoted registration so the caller can trigger the promotion email.
- **Conflict warning.** `create_registration` no longer rejects on time overlap; it returns `{warning: 'conflict', conflicting_event_title}` alongside accepting, OR (cleaner) the client pre-checks via the existing overlap logic and shows a confirm dialog before calling. Pick the client-pre-check approach: move overlap detection to a `check_conflict` read, show dialog "THIS OVERLAPS WITH {title}. REGISTER ANYWAY?", proceed on confirm. Server stops enforcing the conflict (keep capacity + past-event + approved checks server-side — those are integrity, conflict is preference).
- **Registration code.** Every registration gets `registration_code text unique` — 8-char unambiguous uppercase (no 0/O/1/I), generated in the insert function. Powers the ticket page and QR.

### 4.4 The ticket (confirmation) page — `/t/[code]`

The single most important new surface. Treat the reference: a zine ticket stub.

- Route is a **bearer link** (anyone with the code sees it) — acceptable for free community events; contains no contact info beyond first name.
- Layout (Electric Zine, mobile-first): heavy 4px border container on dot-grid; top block in `secondary-container` yellow with "YOU'RE IN" in `headline-lg` serif; event title serif; a `border-t-2` separated mono metadata strip (DATE · TIME IST · CITY/VENUE or ONLINE); a square QR code (the registration code) framed `border-2`; the code itself in `label-mono` below it; a dashed `border-4` horizontal rule as the "perforation".
- Actions (stacked, full-width buttons, hard-shadow): **ADD TO GOOGLE CALENDAR** (templated gcal URL), **DOWNLOAD .ICS** (via `ics` package, route handler), **SHARE ON WHATSAPP** (`https://wa.me/?text=` with title + short URL of the event), and a quiet link back to the event.
- Waitlisted variant: top block is `surface-container`, headline "YOU'RE ON THE WAITLIST", shows position number, no QR, no calendar buttons, explains the promotion email.
- After a successful native RSVP, the register action redirects here. The email (§8) links here too.

### 4.5 Host tools on the event detail page (host-gated panel, extends V0's attendees panel)

- **Updates (broadcast).** Composer (textarea + "SEND UPDATE" button) above the attendee list. On send: insert into `event_messages`, fan out email to all confirmed + waitlisted registrants, render the update in an "UPDATES" section on the detail page visible to registered members (newest first, mono timestamp). Rate limit client-side: disable for 60s after send. Max 1000 chars.
- **Check-in.** From event start until `ends_at + 24h`, each confirmed attendee row gets a check-in toggle (sets/clears `checked_in_at`). Optimistic with rollback. Summary line "CHECKED IN: 14/32". No QR scanning in V1 — the host taps; the attendee's QR is for visual verification.
- **Cancel event** button (error styling) per 4.1.
- External events: keep headcount-only, plus the broadcast composer (registrants confirmed their registration, so messaging them is legitimate).

### 4.6 External registration honesty

Replace click-equals-registered: clicking **OPEN REGISTRATION LINK** opens the host URL in a new tab and flips the in-page action to a confirm prompt: "DID YOU REGISTER?" with **YES, I'M IN** / "NOT YET". Only YES creates the registrations row (kind external, status confirmed, gets a code and a ticket page without QR-check-in semantics). Persist the "pending confirm" state in component state only — if they navigate away without confirming, no row.

### 4.7 Public event page + sharing (the front door)

- **Middleware change:** `/e/[id]`, `/t/[code]`, `/login`, `/not-allowed`, and the OG image route become accessible without allowlist. Everything else stays gated. Fail-closed behavior preserved for gated routes.
- **RLS change:** anon SELECT on approved events only, exposed through a `get_public_event(event_id)` security-definer function returning the event plus host display name and confirmed count — do NOT open the `profiles` table to anon.
- **Anon view of `/e/[id]`:** same page, no app nav; a slim top bar with the wordmark; register CTA replaced by a yellow block: "REGISTRATION IS FOR RETHINK MEMBERS" + "MEMBER? LOG IN" button (returnTo back to the event). No attendee names, count only. Pending/rejected events 404 for anon.
- **OG card:** `generateMetadata` on `/e/[id]` (title, dates in IST, city, description excerpt) + a dynamic OG image route using Next `ImageResponse`: 1200×630, Electric Zine — `surface` background, 8px `on-background` border inset, event title in heavy serif, mono metadata strip, yellow corner block with "RETHINK EVENTS". Test by pasting a deployed URL into WhatsApp.
- **Share button** (tertiary pink, per brand) on the detail page for members: WhatsApp share + copy link.
- **`/not-allowed` upgrade:** explain what this is ("THE EVENTS LAYER OF THE RETHINK ECOSYSTEM. MEMBERS ONLY, FOR NOW.") with a link to the Rethink site. No dead end shame page.

### 4.8 Feed + archive

- Feed keeps V0's three sections and filters. Changes: cancelled events drop out; full events get the FULL · WAITLIST OPEN tag; "You're registered" section includes waitlisted items with a WAITLIST tag.
- **`/past`**: reverse-chronological archive of ended approved events, same card grid grayscale-by-default (brand already does this), each linking to the detail page in its Past state. Nav link "PAST" in the app nav. Cursor pagination, 20/page. This is the seed of institutional memory; recaps/photos attach here in a later version.
- `/me`: gains a TICKETS view (ticket-page links per upcoming registration), shows waitlist position, and a cancel control per registration.

### 4.9 Reminder emails

Scheduled function runs hourly: select approved, non-cancelled events with `starts_at` between now+23h and now+25h and `reminder_sent_at is null`; for each, email all confirmed registrants (template §8.3), then set `reminder_sent_at`. Implementation: Supabase Edge Function `send-reminders` invoked by pg_cron + pg_net (schedule SQL ships in migration `014`, human applies). Idempotency via `reminder_sent_at` — set it in the same statement that selects, before sending, to avoid double-send on retry.

---

## 5. DATABASE — V1 MIGRATIONS

Intent-level spec. Verify real column names against migrations `001`–`009` before writing each file. One concern per migration. All functions `security definer` with explicit `search_path = public`. Every new table gets RLS enabled in the same file that creates it.

### `010_trust_and_lifecycle.sql`
- `alter table profiles add column trusted_host boolean not null default false;`
- Events `status` check constraint: add `'cancelled'` to the allowed set (drop + recreate the constraint).
- `alter table events add column cancelled_at timestamptz, add column cancellation_reason text, add column reminder_sent_at timestamptz;`
- RPC `approve_event(event_id)` (admin-only, replaces/wraps the current approval path): sets event `approved` and creator `trusted_host = true` atomically.
- RPC `cancel_event(event_id, reason)`: allowed if caller is admin OR event creator; only on `approved` future events; sets status/cancelled_at/reason. (Email fan-out happens app-side after the RPC returns the registrant emails — return them from the function.)
- Update event-creation path: trusted or admin creators insert with `status = 'approved'` (enforce in the create RPC if one exists, else in a new `create_event` RPC so the rule lives in the database; check how V0 inserts events first).
- RLS: update events policies so creators can cancel via the RPC only (no direct status updates by non-admins).

### `011_registration_depth.sql`
- `alter table registrations add column status text not null default 'confirmed' check (status in ('confirmed','waitlisted','cancelled')), add column registration_code text unique, add column checked_in_at timestamptz;`
- Backfill `registration_code` for existing rows (generator function `generate_registration_code()` — 8 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, loop on collision).
- Rework `create_registration`: keep approved/future checks and capacity counting (count only `confirmed`); on full → insert `waitlisted` and return `{state:'waitlisted', position:n}`; on space → `{state:'confirmed', code}`. **Remove the conflict rejection.** Add a read function `find_conflict(user_id, event_id)` returning the first overlapping confirmed registration's event title, for the client warning.
- `cancel_my_registration(registration_id)`: owner-only, future events only, sets `cancelled`, then calls promotion.
- `promote_from_waitlist(event_id)`: inside the same transaction, oldest `waitlisted` → `confirmed`, returns the promoted row (or null). Called by `cancel_my_registration` and by the host-removal path (update the existing RLS-delete approach: host removal becomes an RPC `host_remove_registration(registration_id)` so promotion can run atomically — keep policy 009 as defense-in-depth).
- `set_check_in(registration_id, checked_in)`: caller must be the event's creator; window `starts_at <= now() <= ends_at + interval '24 hours'`.
- RLS: registrants update nothing directly (all via RPCs); SELECT policies extended so a registrant reads their own row by code for the ticket page — ticket page itself uses a security-definer `get_ticket(code)` returning safe fields only (event title/time/venue, first name, status, code).

### `012_event_messages.sql`
- Table: `id uuid pk, event_id uuid fk, sender_id uuid fk, body text not null check (char_length(body) <= 1000), created_at timestamptz default now()`.
- RLS: INSERT only by the event's creator; SELECT by the creator, admins, and users holding a non-cancelled registration on that event.
- Index on `(event_id, created_at desc)`.

### `013_public_read.sql`
- `get_public_event(event_id)` security definer: returns approved-event fields + host `full_name` + confirmed count; null for non-approved.
- Anon-safe SELECT policy on events for `status = 'approved'` (or route all anon reads through the function only — prefer the function-only approach; do not add an anon policy on `profiles` or `registrations` under any circumstances).

### `014_reminder_cron.sql`
- The pg_cron schedule statement (commented header: "human applies after enabling pg_cron + pg_net"), calling the `send-reminders` edge function hourly with the service key from Vault. Include the exact `cron.schedule` SQL.

---

## 6. STATE MANAGEMENT — QUERY KEY REGISTRY AND INVALIDATION MAP

TanStack Query owns all server state. URL params own filter state (feed filters already work this way — keep it). Component state is for ephemeral UI only (dialogs, the external-confirm prompt). No new state libraries.

**Query key registry (canonical — extend, never freelance new shapes):**

| Key | Reads |
|---|---|
| `["events","feed",{filters}]` | Feed sections |
| `["events","past",{cursor}]` | Past archive |
| `["event", id]` | Detail page (incl. confirmed count, state) |
| `["event", id, "public"]` | Anon detail via `get_public_event` |
| `["attendees", id]` | Host panel list incl. waitlist + check-in |
| `["messages", id]` | Updates section |
| `["registrations","me"]` | /me, tickets, feed "registered" section |
| `["ticket", code]` | Ticket page |
| `["admin","queue"]`, `["admin","users"]`, `["allowlist"]` | Admin |

**Invalidation map (mandatory; copy as a comment into each mutation):**

| Mutation | Invalidates |
|---|---|
| register (native or external confirm) | `["event",id]`, `["attendees",id]`, `["registrations","me"]`, `["events","feed"]` |
| cancel my registration | same four + `["ticket",code]` |
| host remove attendee | `["attendees",id]`, `["event",id]`, `["events","feed"]` (promotion may change another user's state — counts live in these keys) |
| check-in toggle | `["attendees",id]` (optimistic triple: onMutate snapshot, onError rollback, onSettled refetch) |
| send update | `["messages",id]` |
| create event (trusted) | `["events","feed"]`, `["event",newId]` |
| create event (untrusted) | `["admin","queue"]` |
| approve event | `["admin","queue"]`, `["events","feed"]`, `["event",id]`, `["admin","users"]` (trust flag changed) |
| cancel event | `["event",id]`, `["events","feed"]`, `["attendees",id]`, `["registrations","me"]` |
| trust grant/revoke | `["admin","users"]` |

Server components fetch first paint where pages are static-ish (public event page, ticket page, past archive); interactive member surfaces stay client components with Query, as in V0. Follow V0's existing pattern per page rather than converting anything.

---

## 7. DESIGN LANGUAGE — V1 EXTENSIONS TO ELECTRIC ZINE

`stitch/brand.md` remains the source of truth for tokens, type, color, borders, shadows, motion, and voice. Do not restate or fork it. V1 adds these component specs, all within its rules (zero radius, `on-background` borders, hard shadows, mono uppercase metadata, no exclamation marks, color budget: max one tertiary element per screen):

- **State badges** (mono, `label-mono`, bordered 2px): LIVE = tertiary pink with pulse dot (the screen's one pink element); FULL · WAITLIST OPEN = yellow `secondary-container`; CANCELLED = `error` on `error-container`; ENDED and IN REVIEW = `surface-container` with `on-surface-variant` text. Badges sit top-left over the (grayscale) cover, not inside the title block.
- **Ticket stub** per §4.4: the dashed 4px rule is the signature perforation move; QR always square and framed; the stub must look screenshot-worthy — it is the app's only viral artifact.
- **Banners** (cancelled/ended): full-width, `border-4`, no icons doing emotional work — type does it. Serif headline, mono sub-line with the reason/date.
- **Updates section**: each update a `border-2` row, sender + mono timestamp header line, body in `body-md`. Composer is a bordered textarea + yellow SEND UPDATE button with hard-shadow press behavior.
- **OG image**: per §4.7 — it is a poster, not a screenshot. Title dominates at heavy serif weight; if the title exceeds two lines at 72px, step down to 56px, never truncate mid-word.
- **Public top bar** (anon view): inverse-surface dark bar, wordmark in serif, one yellow LOG IN button. Distinct from the member nav so members instantly recognize "I'm seeing the public view".
- **Empty states** get real copy (in `lib/brand.ts`): past archive empty → "NOTHING IN THE ARCHIVE YET. THE FIRST EVENT BECOMES HISTORY HERE."; waitlist empty on host panel → "NO WAITLIST. THERE'S STILL ROOM."; updates empty (host view) → "NO UPDATES SENT. ATTENDEES GET THESE BY EMAIL TOO."
- **Email design**: emails are HTML-simple (Mailmodo templates), but carry the brand: surface background, 4px border container, serif headline, mono metadata strip, yellow CTA button, no images required to parse. Plain-text fallback for every template.

Accessibility floor (production requirement): all interactive elements ≥44px touch targets, focus states use the 2px `primary` border (brand's input focus pattern), QR has an `aria-label` with the code, color is never the only state signal (badges always carry text), `prefers-reduced-motion` disables the pulse and press transforms.

---

## 8. EMAIL TEMPLATES (Mailmodo)

All sends go through one module `lib/email.ts` exposing typed functions; if `MAILMODO_API_KEY` is absent, it logs to console and resolves (so dev/test never blocks) — with a startup warning. Templates (subjects in caps per voice; bodies merge-tagged):

1. **Registration confirmed** — subject "YOU'RE IN: {title}". Event details, ticket link `/t/{code}`, Google Calendar link, what-to-expect line from the host description excerpt.
2. **Waitlisted** — "YOU'RE ON THE WAITLIST: {title}". Position, how promotion works.
3. **24h reminder** — "TOMORROW: {title}". Time IST, venue/link, ticket link. (Online events: the meet URL appears here and on the ticket page from 1h before start — not on the public page.)
4. **Waitlist promoted** — "A SPOT OPENED: YOU'RE IN — {title}". Ticket link.
5. **Host update** — "UPDATE: {title}". Body verbatim, link to event.
6. **Event cancelled** — "CANCELLED: {title}". Reason verbatim, apology-free factual tone.

Plus the **Supabase OTP template** (via custom SMTP): subject "YOUR CODE: {token}", code in mono at headline size. This unblocks the V0 login pain.

---

## 9. BUILD PHASES AND TASKS

Each task = one commit, gates green. Suggested splits; merge adjacent ones only if both stay reviewable.

**Phase 0 — Docs (Tasks 0.1–0.3)** — per §2. No app code.

**Phase 1 — Trust + lifecycle (migration 010)**
1.1 Migration `010` + regenerate types (`supabase gen types` against local schema definition if available; otherwise hand-extend the `Database` type to match and flag for regen after apply).
1.2 Create-flow: trusted publish-on-create, first-timer review copy; admin approve RPC wiring; admin users screen trust column.
1.3 Cancel-event flow (dialog, reason, RPC, banner) + all seven detail-page states from §4.1 + feed adjustments (cancelled out, FULL tag).

**Phase 2 — Registration depth (migration 011)**
2.1 Migration `011` + types.
2.2 Waitlist register/cancel/promote paths + conflict-warning dialog (replacing the hard block) + `/me` cancel + waitlist tags everywhere.
2.3 Ticket page `/t/[code]` + QR + gcal/ICS routes + post-RSVP redirect + external-confirm flow (§4.6).

**Phase 3 — Communication (migrations 012, 014)**
3.1 `lib/email.ts` + Mailmodo client + confirmation/waitlist/promotion/cancellation sends wired into the Phase 1–2 paths.
3.2 Migration `012`, broadcast composer + updates section + fan-out.
3.3 `send-reminders` edge function + migration `014` cron SQL + reminder template wiring.

**Phase 4 — Public surface (migration 013)**
4.1 Migration `013` + middleware public routes + anon event page + upgraded `/not-allowed`.
4.2 `generateMetadata` + OG image route + share buttons (WhatsApp, copy link).
4.3 `/past` archive + nav + `/me` tickets view.

**Phase 5 — Check-in + hardening**
5.1 Check-in toggle (optimistic triple) + host summary.
5.2 Production pass: error boundaries on new routes, skeletons, 404s (bad ticket code, bad event id), rate-limit cooldowns, accessibility floor (§7), copy audit against brand voice, full lint/test/build.
5.3 E2E checklist (§10), fixes, whole-branch review, update journal/decisions/past-mistakes, hand to human for merge.

---

## 10. E2E CHECKLIST (definition of done — human-run in browser)

- [ ] Untrusted member creates event → pending, invisible in feed; admin approves → live AND member shows trusted; their second event is live instantly.
- [ ] Admin revokes trust → that member's next event is pending again.
- [ ] Native RSVP on open event → ticket page with QR; gcal link prefilled correctly (IST); ICS downloads and imports.
- [ ] RSVP on overlapping event → warning dialog names the conflicting event → proceeding registers anyway.
- [ ] Fill an event to capacity → next member gets waitlisted with position; a confirmed attendee cancels → oldest waitlisted is promoted, promotion email arrives, counts correct everywhere (feed, detail, /me) without refresh.
- [ ] Host removes an attendee → promotion fires, counts update.
- [ ] External event: click opens link, no row until "YES, I'M IN"; host sees honest headcount.
- [ ] Host sends an update → appears on page for a registered member, email arrives; non-registered member doesn't see updates.
- [ ] Cancel an event with registrants → banner + reason, gone from feed, cancellation emails arrive, /me shows cancelled tag.
- [ ] Reminder: event seeded ~24h out → hourly job sends once, `reminder_sent_at` set, second run sends nothing.
- [ ] Logged-out browser opens an event link → public page renders, register CTA is the members block, login returnTo lands back on the event; pending event 404s anon.
- [ ] Paste a deployed event URL into WhatsApp → OG card shows title/date/city on the branded poster.
- [ ] During a live event, host checks in attendees; toggles survive refresh; summary count correct.
- [ ] Past event appears in `/past`, detail shows ENDED state, no register path.
- [ ] OTP email contains the actual 6-digit code (SMTP configured).
- [ ] `tsc`, tests, build, lint all green; no console errors on any page.

---

## 11. WHAT COMES AFTER V1 (recorded so nobody builds it early)

Photo recaps (`event_media`) on past events → badges and streaks → participation graph → city-lead chapter budgets (the long-term ownership layer: proposals, interest-before-budget, open ledger, trust tiers) → external-audience registration → paid ticketing. Each gets its own plan. V1 ships first.
