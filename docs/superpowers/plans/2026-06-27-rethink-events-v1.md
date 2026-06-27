# ReThink Events V1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Granularity note (deliberate):** Phase 2 (data spine) carries full SQL because it is the stable, load-bearing risk surface the spec demands be nailed before coding. Phase 1 (UI skeleton) and Phase 3 (vertical slices) are concrete task lists, not full code dumps — the Phase-1 skeleton is semi-throwaway and the Phase-3 slices depend on shapes that Phase 1/2 finalize. Each Phase-3 slice is expanded into bite-sized TDD tasks at the moment it is executed, against the real schema, not guessed now.

**Goal:** Ship the ReThink Events V1 participation layer — a trusted member can create, publish, fill, and run an event solo, and that event becomes a beautiful shareable link.

**Architecture:** Next.js App Router (already scaffolded in `web/`) + Supabase (Auth, Postgres + RLS, Storage) + Resend for transactional email + a dynamic OG image route. Build in three phases: (1) clickable UI skeleton on mock data to validate flow and nail the growth surface, (2) the data spine — schema + the RLS role×state matrix + email-OTP auth, pulled forward because it is the riskiest correctness surface, (3) vertical feature slices that replace mock data one feature at a time, each demoable.

**Tech Stack:** Next.js 16 (App Router, RSC), React 19, Tailwind v4 (design tokens already in `web/app/globals.css`), Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Resend + React Email, `ImageResponse` for OG, Vitest + Playwright for tests.

**Data architecture (decided in eng review, 2026-06-27):** Reads via **React Server Components** (server supabase client → render finished HTML); writes via **Server Actions** (`<form action={...}>` → `revalidatePath`). **No react-query as default** — adopt client fetching only for genuinely interactive spots (RSVP optimistic state, filters). This is the native Next.js path and it fixes the two correctness bugs in the harvested code at the root: anon can't read events (the public page must be a Server Component) and no SSR means no OG meta. Harvest Aditya's JSX/styles; rewrite their data wiring (his `useEvent`/`useRsvp` hooks are not harvested).

## Global Constraints

- **Stack is fixed:** Next.js App Router + Supabase (Auth/Postgres+RLS/Storage) + transactional email + OG route. Greenfield — no migrations exist yet.
- **Participation is sign-in-gated; registration is open.** Anyone can view a public event page; you must be signed in to RSVP or host. **No allowlist/whitelist gate.** Never use the phrase "members-only" in copy.
- **Auth is email OTP via Supabase Auth.** OTP edge cases (resend, expiry, rate-limit) are handled by Supabase, not custom code.
- **Cities are a fixed enum:** `bangalore`, `pune`, `delhi`, `hyderabad`. Not free text. No city-admin system in V1.
- **Event tags are a fixed enum:** `beginner`, `interview_prep`, `ai_pm`, `build`, `resume`.
- **Only `published` events appear in the feed and on public pages.** `taken_down` is never public.
- **No QR, no waitlist, no match-score algorithm, no chat/threaded broadcast, no payments** — all V2. Broadcast is one-way, one message per event.
- **Do NOT build (Approach-A leftovers present in the prior repo):** online/offline + meet-URL gating, and conflict/overlapping-event warnings. Both are explicitly deferred to V2. If harvested code contains them, strip them.
- **Feedback is binary** (thumbs up/down) + one optional text line, attached to the **event** (not the host), visible **only to that event's host and admins**. No public ratings.
- **Email deliverability is critical-path:** sending domain + SPF/DKIM must be set up before reminders/broadcasts are relied on.
- Work happens inside `web/`. Initialize git at the start of Phase 0 (repo is currently not under version control).
- Commit frequently — one commit per completed step where a step changes code.

---

## File Structure

```
web/
  app/
    layout.tsx                      # root layout (exists)
    globals.css                     # design tokens (exists)
    page.tsx                        # feed / home (replace smoke page)
    login/page.tsx                  # email OTP entry + verify
    onboarding/page.tsx             # goal + level + city (first login)
    e/[id]/page.tsx                 # public event page (anon-viewable)
    e/[id]/opengraph-image.tsx      # dynamic OG card (growth surface)
    ticket/[rsvpId]/page.tsx        # ticket stub (screenshot-worthy)
    host/page.tsx                   # host dashboard (my events)
    host/new/page.tsx               # create event form
    host/[id]/edit/page.tsx         # edit event
    host/[id]/run/page.tsx          # run-view: attendees, check-in, broadcast
    host/[id]/feedback/page.tsx     # feedback for host's event
    admin/page.tsx                  # approval queue + trust toggle + takedown
    api/
      rsvp/route.ts                 # RSVP create/cancel (cap-checked)
      broadcast/route.ts            # send one broadcast (host)
      ics/[eventId]/route.ts        # ICS calendar download
  lib/
    supabase/client.ts              # browser client (@supabase/ssr)
    supabase/server.ts              # server client (cookies)
    supabase/types.ts               # generated DB types
    mock.ts                         # Phase-1 mock data (deleted end of Phase 3)
    cohort.ts                       # cohort count helper (calls RPC)
    calendar.ts                     # ICS + Google Calendar link builders
    email/                          # Resend client + React Email templates
  components/
    EventCard.tsx, FeedSection.tsx, ForYouRow.tsx, RsvpButton.tsx,
    Ticket.tsx, ShareBar.tsx, Filters.tsx, CheckinRow.tsx, Feedback.tsx
  supabase/
    migrations/                     # SQL migrations (Phase 2)
    seed.sql                        # seed: cities, admin, sample events
  tests/                            # Vitest unit + Playwright e2e
```

---

## Harvest from prior repo (`github.com/jidduaditya/rethink-events`)

That repo was built to Approach A (rejected) — schema, agency mechanic, RLS, and growth surface all diverge from approved scope. **We start fresh**, but lift three things into the new repo during Phase 0/2:

1. **`create_rsvp` SECURITY DEFINER pattern** (FOR UPDATE row lock + capacity check) — adopt in Task 2.2's `rsvp_to_event`. **Strip the conflict-detection block** (V2). His version is good prior art for the atomic capacity check.
2. **Supabase SSR boilerplate** — `lib/supabase/{client,server,middleware}.ts` + root `middleware.ts`. Copy, then adapt to our schema/types. **Do not** harvest his react-query provider or `use*` data hooks (see Data architecture decision). Saves setup in Task 0/2.4.
3. **Design-system components** — his neo-brutalist component set (event-card, event-form, status-badge, app-shell, nav) is the same design family as our scaffold and further along. Reconcile into Phase 1; keep the JSX/styles, **rewrite data wiring to RSC/Server Actions**, drop online/offline + conflict UI.

**Phase 1 is smaller than written because of this harvest:** treat Phase 1 as *reconcile harvested components + stub only the missing screens* (ticket, OG card, "For you" row, run-view, feedback) — not a from-scratch build of all 13 screens.

Everything else (schema, RLS, lifecycle, tags/city/goal/level, curation, OG, ticket, email, run-view, feedback) is built per this plan, not harvested.

## Collaboration & work split (two builders + PR review)

Foundation is sequential and single-owner; Phase 3 slices parallelize cleanly.

- **Owner (this repo's creator):** Phase 0 (harvest + cleanup + commit), Phase 1 (UI skeleton), Phase 2 (data spine — schema/RLS/auth/email). These are shared foundations; one person lays them, then we branch.
- **After Phase 2 is committed,** split Phase 3 slices and develop on branches → PRs → review before merge. Proposed split (confirm before handoff):
  - **Aditya** (demonstrated strength: SQL + RSVP transaction + forms): 3.1 trusted-host publishing, 3.2 admin queue + trust flip, 3.4 RSVP + capacity + ticket + calendar.
  - **Owner:** 3.3 public page + OG (growth surface), 3.5 curated feed + cohort, 3.6 run-view + broadcast, 3.7 edit/cancel notifications, 3.8 reminder, 3.9 feedback.
- Each slice is an independent branch; the RLS test (Task 2.3) is the shared regression gate every PR must keep green.
- **Merge hazard — `lib/supabase/types.ts` is shared and generated.** Regenerate it ONCE when the schema is frozen (end of Phase 2), commit it, and do not regenerate on feature branches. If a slice needs a schema change, it changes the migration + regenerates types in its own PR and the other dev rebases.
- Aditya's instance gets a handover file (`docs/ONBOARDING-ADITYA.md`) covering scope, the Approach-A→C correction, plugins (ponytail for clean code; superpowers TDD/plan-execution), and PR conventions.

---

## PHASE 0 — Project hygiene

### Task 0: Git + tooling baseline

**Files:**
- Create: `.gitignore` (root), `web/.env.local.example`
- Modify: `web/package.json` (add test scripts + deps)

- [ ] **Step 1:** `git init` at project root; confirm `web/.gitignore` covers `.next`, `node_modules`, `.env*`. Add a root `.gitignore` for OS files and `.env`.
- [ ] **Step 2:** Add deps: `@supabase/supabase-js @supabase/ssr resend react-email @react-email/components`; dev deps: `vitest @vitejs/plugin-react @playwright/test`.
- [ ] **Step 3:** Add scripts to `web/package.json`: `"test": "vitest run"`, `"test:e2e": "playwright test"`.
- [ ] **Step 4:** Create `web/.env.local.example` with `NEXT_PUBLIC_SUPABASE_URL=`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=`, `SUPABASE_SERVICE_ROLE_KEY=`, `RESEND_API_KEY=`, `EMAIL_FROM=`, `NEXT_PUBLIC_SITE_URL=`.
- [ ] **Step 5 (parallel, no code):** Kick off email domain auth NOW — create the Resend account, add the sending domain, set SPF/DKIM DNS records. DNS has propagation lead time and is independent of code; starting it here means it's verified by the time Task 2.5 needs it. (Owner action, not a code commit.)
- [ ] **Step 6:** Commit: `chore: git init + test tooling + env template`.

---

## PHASE 1 — Clickable UI skeleton (mock data)

**Goal:** Every main screen exists and is reachable by `<Link>`, rendered against `lib/mock.ts`. No Supabase, no real auth, no form persistence. Purpose: validate the flow end-to-end and get the growth surfaces (public event page + ticket stub + OG card) genuinely sexy. **Keep it thin** — placeholder buttons that navigate, not working logic.

**Deliverable of the phase:** a clickthrough demo: feed → event page → "RSVP" → ticket → and host create → run-view → admin, all static.

### Task 1.1: Mock data module

**Files:** Create `web/lib/mock.ts`
- [ ] Define TypeScript types `MockProfile`, `MockEvent`, `MockRsvp` mirroring the intended schema (host, title, description, city enum, starts_at, ends_at, venue, capacity, state, tags[], featured_for). Export ~6 sample events across the 4 cities and all states, 1 trusted host, 1 untrusted host, 1 admin, plus a few RSVPs. **These types become the contract the Phase-2 schema must satisfy.**
- [ ] Commit.

### Task 1.2: Feed / home (`app/page.tsx`)

**Files:** Modify `app/page.tsx`; create `components/{EventCard,FeedSection,ForYouRow,Filters}.tsx`
- [ ] Replace smoke page with the 3-section feed: **happening now / you're registered / everything else**, plus the **"For you" row** at top. Tag + city filter controls (visual only). **Low-volume rule:** if <5 events, collapse empty sections and lead with "For you". Render from mock.
- [ ] Acceptance: with 6 mock events the 3 sections show; temporarily trimming mock to 3 collapses to the For-you-led layout.
- [ ] Commit.

### Task 1.3: Public event page + OG card (the growth surface — first-class)

**Files:** Create `app/e/[id]/page.tsx`, `app/e/[id]/opengraph-image.tsx`, `components/ShareBar.tsx`
- [ ] Build the public event page (anon-viewable look): hero, host, time/venue, tags, capacity/`FULL` state, RSVP CTA (navigates to `/login` in skeleton), WhatsApp share. Reads mock by id.
- [ ] Build the dynamic OG image with `ImageResponse` — branded, event title + host + city + date, using the design tokens/fonts. This is the designated growth surface; treat it as its own workstream, not a footnote. Verify it renders at `/e/<id>/opengraph-image`.
- [ ] Acceptance: page renders for a published mock event; OG image renders as a real PNG; `FULL`/`cancelled` states visibly differ.
- [ ] Commit.

### Task 1.4: Ticket stub (`app/ticket/[rsvpId]/page.tsx`)

**Files:** Create `app/ticket/[rsvpId]/page.tsx`, `components/Ticket.tsx`
- [ ] Screenshot-worthy confirmation: event summary, "you're in" stamp, add-to-calendar buttons (visual), share. **No QR.** Reads mock.
- [ ] Acceptance: looks good as a phone screenshot.
- [ ] Commit.

### Task 1.5: Host screens (dashboard, create, edit, run-view, feedback)

**Files:** Create `app/host/page.tsx`, `app/host/new/page.tsx`, `app/host/[id]/edit/page.tsx`, `app/host/[id]/run/page.tsx`, `app/host/[id]/feedback/page.tsx`; `components/{CheckinRow,Feedback}.tsx`
- [ ] Host dashboard: list of my events with state badges. Create form: all event fields incl. city enum select, tags multiselect, optional capacity. Edit mirrors create. Run-view: attendee list + check-in toggles + a single broadcast composer (disabled "already sent" state). Feedback view: thumbs up/down counts + notes list.
- [ ] Acceptance: all reachable from dashboard; forms navigate but don't persist (mock).
- [ ] Commit.

### Task 1.6: Auth + onboarding + admin screens (static)

**Files:** Create `app/login/page.tsx`, `app/onboarding/page.tsx`, `app/admin/page.tsx`
- [ ] Login: email entry → OTP entry (two visual steps). Onboarding: goal + level + city dropdowns. Admin: approval queue (pending events with approve → "flips host to trusted" note), trust toggle list, takedown action. All static.
- [ ] Acceptance: full clickthrough demo works end to end on mock.
- [ ] **CHECKPOINT — design/flow review here.** This is the cheapest point to change the flow. Run `/design-review` on the skeleton before any backend goes in.
- [ ] Commit.

---

## PHASE 2 — Data spine (schema + RLS + auth)

**Goal:** Stand up Supabase and lock the correctness surface. This is pulled forward (not done last) because the **RLS role×state matrix** and **email deliverability** are the two things the spec calls critical-path. Full SQL below — it is stable and load-bearing.

### The RLS role × state visibility matrix (enumerate before coding — spec requirement)

Roles: **anon** (not signed in) · **member** (signed in, not the event's host, not admin) · **host** (signed in AND `events.host_id = auth.uid()`) · **admin** (`profiles.is_admin`).

**`events` SELECT:**

| state | anon | member | host (owner) | admin |
|---|---|---|---|---|
| draft | ✗ | ✗ | ✓ | ✓ |
| pending_review | ✗ | ✗ | ✓ | ✓ |
| published | ✓ | ✓ | ✓ | ✓ |
| cancelled | ✓ | ✓ | ✓ | ✓ |
| taken_down | ✗ | ✗ | ✓ (read-only) | ✓ |

Reduces to one policy: `state IN ('published','cancelled') OR host_id = auth.uid() OR is_admin()`. (`cancelled` stays visible so shared links don't 404 and show the CANCELLED banner.)

**`events` INSERT:** authenticated only, `host_id = auth.uid()`. Initial state set by trigger: trusted host → `published`; untrusted → `pending_review`.

**`events` UPDATE:** owner (any field) or admin. State transitions guarded by trigger: a non-trusted, non-admin user can never set `published`; nobody but admin can set/clear `taken_down`; `cancelled` is terminal-ish (only admin can revive). Approving a pending event (admin) also flips the host's `is_trusted = true`.

**`rsvps` SELECT:** `user_id = auth.uid()` OR caller is host of the event OR admin.
**`rsvps` INSERT:** authenticated, `user_id = auth.uid()`, only when the event is `published` and not at capacity — enforced by a `SECURITY DEFINER` function (RLS can't count rows), so the cap check is atomic.
**`rsvps` UPDATE:** owner (cancel own) OR host of event (check-in toggle) OR admin.

**`feedback` SELECT:** host of the event OR admin only (the author may read their own row). **No public path.**
**`feedback` INSERT:** authenticated attendee of that event (`user_id = auth.uid()` AND an RSVP exists), one per (event,user).

**`profiles` SELECT:** own row; cohort counts exposed only via a `SECURITY DEFINER` RPC (never expose other members' rows directly).
**`profiles` UPDATE:** own row, but `is_trusted`/`is_admin` are not self-settable — guarded by trigger (only admin/service-role changes them).

### Task 2.1: Schema migration

**Files:** Create `web/supabase/migrations/0001_init.sql`

- [ ] **Step 1: Write the migration.**

```sql
-- enums
create type city as enum ('bangalore','pune','delhi','hyderabad');
create type event_tag as enum ('beginner','interview_prep','ai_pm','build','resume');
create type event_state as enum ('draft','pending_review','published','cancelled','taken_down');
-- goal/level: enum values to be confirmed with the team (Open Question). Sensible defaults:
create type member_goal as enum ('break_into_pm','interview_prep','level_up','build_with_ai','switch_domain');
create type member_level as enum ('aspiring','junior','mid','senior');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  goal member_goal,
  level member_level,
  city city,
  is_trusted boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references profiles(id),
  title text not null,
  description text,
  city city not null,
  venue text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity int check (capacity is null or capacity > 0),
  tags event_tag[] not null default '{}',
  state event_state not null default 'draft',
  featured_for jsonb,                 -- admin hand-pick {goal,level,city}; null = not featured
  broadcast_message text,
  broadcast_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on events (state, starts_at);
create index on events (city, state);

create table rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'going' check (status in ('going','cancelled')),
  checked_in boolean not null default false,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table feedback (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  thumbs_up boolean not null,
  note text,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);
```

- [ ] **Step 2:** Apply via `supabase db push` (or migration runner) against a local/dev project. Expected: tables + enums created, no errors.
- [ ] **Step 3:** Commit: `feat(db): initial schema`.

### Task 2.2: Helper functions + triggers

**Files:** Create `web/supabase/migrations/0002_functions.sql`

- [ ] **Step 1: Write helpers.**

```sql
-- admin check usable inside policies
create or replace function is_admin() returns boolean language sql stable security definer as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

-- auto-create profile on signup
create or replace function handle_new_user() returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email) values (new.id, new.email);
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- set initial event state from host trust
create or replace function set_event_initial_state() returns trigger language plpgsql security definer as $$
begin
  if new.state = 'draft' then
    new.state := case when (select is_trusted from profiles where id = new.host_id)
                      then 'published' else 'pending_review' end;
  end if;
  return new;
end; $$;
create trigger events_initial_state before insert on events
  for each row execute function set_event_initial_state();

-- guard illegal state transitions + protect trust/admin columns handled app-side via service role
-- atomic, cap-checked RSVP
create or replace function rsvp_to_event(p_event_id uuid) returns rsvps language plpgsql security definer as $$
declare e events; cnt int; r rsvps;
begin
  select * into e from events where id = p_event_id for update;
  if e.state <> 'published' then raise exception 'event not open'; end if;
  if e.capacity is not null then
    select count(*) into cnt from rsvps where event_id = p_event_id and status = 'going';
    if cnt >= e.capacity then raise exception 'event full'; end if;
  end if;
  insert into rsvps (event_id, user_id) values (p_event_id, auth.uid())
    on conflict (event_id, user_id) do update set status = 'going'
    returning * into r;
  return r;
end; $$;

-- cohort count: members matching your goal+level+city who are going
create or replace function cohort_going_count(p_event_id uuid) returns int language sql stable security definer as $$
  select count(*)::int from rsvps r
  join profiles p on p.id = r.user_id
  join profiles me on me.id = auth.uid()
  where r.event_id = p_event_id and r.status = 'going'
    and p.goal = me.goal and p.level = me.level and p.city = me.city
    and p.id <> me.id;
$$;
```

- [ ] **Step 2:** Apply. **Step 3:** Commit `feat(db): functions + triggers`.

### Task 2.3: RLS policies

**Files:** Create `web/supabase/migrations/0003_rls.sql`

- [ ] **Step 1: Enable RLS + policies** implementing the matrix above (events/rsvps/feedback/profiles SELECT/INSERT/UPDATE exactly as tabulated; INSERT into rsvps disallowed directly — force callers through `rsvp_to_event`). Write the policy SQL per the matrix.
- [ ] **Step 2: Write the RLS test** (`tests/rls.test.ts`, Vitest): using anon, member, host, and admin clients, assert each cell of the matrix — e.g. anon cannot select a `draft`; member cannot select another host's `pending_review`; non-owner cannot read an event's feedback; over-capacity RSVP throws `event full`; member cannot self-set `is_trusted`.
- [ ] **Step 3: Run** `npm test -- rls` → expect FAIL first (policies not yet right), iterate until PASS. **This test is the acceptance gate for the whole phase.**
- [ ] **Step 4:** Commit `feat(db): RLS policies + matrix tests`.

### Task 2.4: Supabase clients + email-OTP auth

**Files:** Create `web/lib/supabase/{client,server,types}.ts`; wire `app/login` + `app/onboarding` + middleware for session.
- [ ] Generate DB types (`supabase gen types typescript`). Create browser + server `@supabase/ssr` clients. Implement real email-OTP sign-in in `app/login` (`signInWithOtp` → verify). On first login with empty profile, route to `app/onboarding` to set goal/level/city. Add session middleware.
- [ ] Acceptance (manual + one Playwright happy-path): request OTP → enter code → land on onboarding → save → reach feed as a signed-in user. OTP resend/expiry left entirely to Supabase.
- [ ] Commit.

### Task 2.5: Email provider + domain auth (critical-path)

**Files:** Create `web/lib/email/` (Resend client + a base React Email template)
- [ ] Set up Resend, verify sending domain, configure **SPF + DKIM**. Add `RESEND_API_KEY` + `EMAIL_FROM`. Send one test email end-to-end and confirm it lands in inbox (not spam).
- [ ] Acceptance: a test email delivered to a real inbox with passing SPF/DKIM. (No app email flows yet — those are Phase 3 slices.)
- [ ] Commit.

### Task 2.6: Seed

**Files:** Create `web/supabase/seed.sql`
- [ ] Seed one admin profile, 1 trusted + 1 untrusted host, and ~6 events across cities/states matching the Phase-1 mock so screens have real data to bind to next.
- [ ] Commit.

---

## PHASE 3 — Vertical slices (replace mock with real, one feature at a time)

**Goal:** Turn the skeleton live, slice by slice. Each slice: bind a screen to Supabase, delete its mock usage, add the test, demo it. **Each slice below is expanded into bite-sized TDD steps (write failing test → run → implement → pass → commit) at execution time, against the real schema from Phase 2.** Order is dependency-driven.

- [ ] **Slice 3.1 — Trusted-host publishing.** Wire create/edit forms to `events` insert/update; rely on the initial-state trigger (trusted → published, else pending_review). Host dashboard reads real `events`. Test: untrusted host's first create lands in `pending_review`; trusted host's lands in `published`.
- [ ] **Slice 3.2 — Admin queue + trust flip + takedown.** Wire `app/admin` to the pending queue; approve = publish + set host `is_trusted`; takedown sets `taken_down`. Test: approving flips trust and the host's next event auto-publishes.
- [ ] **Slice 3.3 — Public event page + OG live.** Bind `app/e/[id]` (Server Component) + `opengraph-image` to real data; enforce only published/cancelled visible to anon; WhatsApp share URL uses `NEXT_PUBLIC_SITE_URL`. Tests: anon GET of a draft 404s; published renders; **OG-route smoke test asserts 200 + `content-type: image/png`** (the growth surface fails silently otherwise).
- [ ] **Slice 3.4 — RSVP + capacity + ticket + calendar.** `api/rsvp` calls `rsvp_to_event`; show `FULL` and block at cap; on success route to `/ticket/[rsvpId]`; `api/ics/[eventId]` returns a valid ICS, plus a Google Calendar link in `lib/calendar.ts`. Test: RSVP at cap throws `event full`; ICS validates; double-RSVP is idempotent.
- [ ] **Slice 3.5 — Curated feed + "For you" + cohort proof.** Real 3-section feed with tag/city filters; "For you" = filter(goal/level vs tags) ∪ admin `featured_for` picks; show "N from your cohort are going" via `cohort_going_count` **only when N>0** (at launch cohorts are tiny — a row of zeros reads worse than nothing). Low-volume collapse rule applies. Test: featured event surfaces in For-you for the matching goal/level/city; cohort count matches a seeded scenario; cohort line hidden when count is 0.
- [ ] **Slice 3.6 — Host run-view + one broadcast.** Attendee list + check-in toggle (rsvps update); `api/broadcast` sends one email fan-out to going RSVPs, sets `broadcast_sent_at`, and is blocked if already sent. Test: second broadcast attempt is rejected; check-in persists.
- [ ] **Slice 3.7 — Edit/cancel notifications.** Editing time/venue re-notifies going RSVPs; cancel emails all RSVPs and sets state `cancelled` (+ ICS cancellation). Test: cancel triggers exactly one email per going RSVP and flips state.
- [ ] **Slice 3.8 — 24h reminder email.** A scheduled job (Supabase cron / Vercel cron) emails going+not-checked-in attendees ~24h before `starts_at`, once. Test: reminder selects only events ~24h out and not already reminded (idempotent flag).
- [ ] **Slice 3.9 — Post-session feedback.** Thumbs up/down + optional note after the event; visible only to host + admin (`app/host/[id]/feedback`). Test: non-host/non-admin cannot read feedback (already covered by RLS test — assert via the UI route too).
- [ ] **Slice 3.10 — Cleanup.** Delete `lib/mock.ts` and any remaining mock imports; full Playwright e2e of the core loop (anon visits `/e/[id]` → signs up → RSVPs → gets ticket → host checks in → leaves feedback).

---

## Success metrics (instrument, don't gold-plate)

Per spec §6 — track once live: % of published events by non-admin members; create→live time for trusted hosts; RSVP→attendance; reminder open rate; anon `/e/[id]` visits → login conversions. A lightweight events table or analytics provider covers this; **not part of the build gate** — wire after the core loop works.

## Open questions to resolve with the team (don't block Phase 1)

1. **Auth model:** confirm open signup (no allowlist) — plan assumes it.
2. **`member_goal` / `member_level` enum values** — placeholders above; confirm the real dropdown options before Phase 2.2 is finalized.
3. **Online vs offline events** — plan is offline-first; online lives in the description for V1 unless the team says otherwise.

---

## Self-review notes

- **Spec coverage:** all 13 V1 features map to tasks — auth (2.4), trusted-host publishing + lifecycle + edit/cancel + capacity (3.1/3.7/2.x), curated feed (3.5), RSVP + calendar (3.4), run-view + broadcast (3.6), reminder (3.8), admin (3.2), goal+level (2.4 onboarding), tags+city enums (2.1), For-you + featured + cohort (3.5), public page + OG (3.3), ticket stub (3.4), feedback (3.9). RLS matrix (2.3) and email/domain auth (2.5) — the two named critical-path risks — are explicit, gated tasks.
- **Deferred-to-V2 items confirmed absent:** match algorithm, badges, host grading, Room taxonomy, waitlist, QR, conflict warnings, meet-URL gating, payments, two-way broadcast.
- **Deliberate granularity:** Phase 2 fully specified (load-bearing, stable). Phase 1 and Phase 3 are task lists by design — see the granularity note at top.

---

## Data flow + test coverage (eng review)

```
                          ANON                         SIGNED-IN
                           │                               │
                  ┌────────▼─────────┐          ┌──────────▼───────────┐
   READS (RSC) ─► │ /  feed (RSC)    │          │ /host, /admin (RSC)  │
                  │ /e/[id] (RSC)    │          │   server supabase    │
                  │ opengraph-image  │          │   client + RLS       │
                  └────────┬─────────┘          └──────────┬───────────┘
                           │  RLS: state IN(published,cancelled)         │ RLS: owner/admin
                           ▼                                             ▼
                  ┌─────────────────────────── Postgres + RLS ──────────────────────┐
   WRITES ──────► │  rsvp_to_event()  set_event_initial_state()  is_admin()          │
   (Server        │  [SECURITY DEFINER, FOR UPDATE cap check]   [trust→publish]      │
    Actions)      └──────────────────────────────────────────────────────────────────┘
                           ▲                                             ▲
                           │ Server Action: rsvp/create/approve/checkin/broadcast
                           │ then revalidatePath()
                  EMAIL ───┴──► Resend (reminder cron, broadcast, cancel notify)  [SPF/DKIM]

  TEST CONCENTRATION (where bugs hide):
   ● Task 2.3  RLS matrix        every role×state cell        ← phase gate
   ● Task 2.2  rsvp_to_event     concurrent cap, idempotent   ← money path
   ● 3.3       OG route          200 + image/png              ← growth surface
   ● 3.10      e2e core loop     anon→signup→rsvp→ticket→checkin→feedback
```

## GSTACK REVIEW REPORT

**Plan:** `docs/superpowers/plans/2026-06-27-rethink-events-v1.md` · **Reviewed:** 2026-06-27 · **Mode:** plan-eng-review (eng-manager)

| Run | Status | Findings |
|---|---|---|
| Step 0 scope challenge | ✅ | Greenfield — mechanical 8-file STOP not triggered (miscalibrated for new apps). 4 real scope items surfaced. |
| Architecture | ✅ | 1 fork (data layer) → **resolved: RSC + Server Actions** (D1). Fixes anon-read + SSR-OG bugs at root. Harvest = JSX/styles only, not hooks. |
| Code quality / harvest | ✅ | Prior repo is Approach-A; harvest 3 items (rsvp txn pattern, SSR boilerplate, components). Strip online/offline + conflict (V2). |
| Tests | ✅ | Concentration correct: RLS matrix (gate) + rsvp concurrency + e2e loop. Added OG smoke test (growth surface), cohort-zero assertion. |
| Performance | ✅ | RSC reads are SSR-cached; indexes on `events(state,starts_at)` + `(city,state)` present. Cohort/featured queries are low-volume; no concern at V1 scale. |

**Folded into plan:** RSC+Server-Actions architecture · Phase-1 harvest reframe (smaller) · domain auth kicked off Day 1 (DNS lead time) · OG smoke test · `types.ts` freeze after schema (two-dev merge hazard) · cohort line hidden at N=0.

**VERDICT:** APPROVED. Plan is sound, scoped to approved V1, and de-risked at the two named critical surfaces (RLS, email). Ready to execute Phase 0.

NO UNRESOLVED DECISIONS
