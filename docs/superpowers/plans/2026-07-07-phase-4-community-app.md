# ReThink Community App (Phase 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete V1 on `main` (port the three open PRs), then gate event hosting behind an admin-managed email whitelist and replace the discovery feed with a schedule-first member dashboard.

**Architecture:** Reads are React Server Components (server Supabase client), writes are Server Actions; no react-query. All access rules live in Postgres RLS — the app layer only mirrors them for UX. The whitelist is the ONLY write path for `profiles.is_trusted`; grant/revoke happen in DB triggers so the list and the flag can never drift.

**Tech Stack:** Next.js 16 App Router, Supabase (Auth OTP, Postgres + RLS), Resend, Tailwind v4, vitest, zod v4.

**Spec:** `docs/superpowers/specs/2026-07-07-community-app-phase4-design.md` — read it before starting.

## Global Constraints

- Working dir for all app commands: `web/`. Tests: `npm test` (vitest). Build check: `npm run build`.
- Integration tests (`rls.test.ts`, `feed.test.ts`, new whitelist/dashboard tests) hit a REAL Supabase instance. They need `web/.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Copy strings come from the `BRAND` dictionary in `web/lib/brand.ts` — never inline user-facing copy in components.
- Style: ponytail-lazy. Smallest diff that cleanly works. No new dependencies beyond `resend` (Task 1). No speculative abstractions. No TODOs, no console.log in committed code. No emojis, no em dashes anywhere.
- Match existing design tokens (`globals.css`, Electric Zine): `font-mono text-label-mono uppercase`, `border-2 border-on-background`, `px-grid-margin`, `mt-stack-*` etc. Copy neighboring JSX patterns.
- TDD: every task writes its failing test before the implementation. Commit at the end of every task at minimum.
- The RLS matrix test (`web/tests/rls.test.ts`) is the shared regression gate. It must be green at the end of every task from Task 4 onward.
- **STOP conditions (halt and ask Aditya, do not improvise):** `web/.env.local` missing or keys invalid; `npm run db:push` fails or the Supabase project is not linked; a port in Task 1-2 conflicts in a way not covered by its step; the baseline suite has failures not explained by Task 0's known-issues list.

---

### Task 0: Foundation verification

Nothing stacks on an unverified foundation. This task proves the hosted DB has migrations 0001-0005 applied and the suite is green on `main` before any new work.

**Files:**
- Possibly modify: `web/vitest.config.ts` (known issue fix only)

- [ ] **Step 1: Sync and branch**

```bash
cd "/Users/aasmac/Desktop/AI Projects/Rethink Events Final"
git fetch origin
git checkout main && git reset --hard origin/main
```

Expected: `main` is at or ahead of commit `c1faf6a` (admin slice).

- [ ] **Step 2: Verify env keys exist**

```bash
cd web
grep -c "NEXT_PUBLIC_SUPABASE_URL\|NEXT_PUBLIC_SUPABASE_ANON_KEY\|SUPABASE_SERVICE_ROLE_KEY" .env.local
```

Expected: `3`. If the file is missing or count is less than 3: **STOP** and ask Aditya for the Supabase keys.

- [ ] **Step 3: Baseline test run**

```bash
npm install && npm test
```

Expected: all test files pass. `rls.test.ts` passing proves migrations 0001-0005 are applied to the hosted project.

**Known issue you may hit:** `main`'s `vitest.config.ts` may lack the `@` path alias while unit tests import `@/lib/auth`. If tests fail with `Cannot resolve "@/..."`, apply this fix and re-run:

```ts
// web/vitest.config.ts — replace entire file
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
```

Note: preserve whatever `test:` options main's file already has — only ADD the `resolve.alias` block; the `test` block above is a fallback if you must recreate the file.

If `rls.test.ts` fails with connection/permission errors: **STOP** — migrations are not applied or keys are wrong; ask Aditya.

- [ ] **Step 4: Commit (only if vitest.config.ts changed)**

```bash
git add vitest.config.ts && git commit -m "fix(test): add @ path alias to vitest config"
```

---

### Task 1: Port run-view, broadcast, and feedback onto main (replaces merging PRs #9 and #10)

**Why a port, not a merge:** branches `slice/3.6-run-view` and `slice/3.9-feedback` were cut from a pre-Phase-1 `main`. They re-add files main already has (`app/(app)/layout.tsx`, `lib/supabase/service.ts` — byte-identical — and others). A GitHub merge would conflict on every one. Instead we take the branch tip's UNIQUE files onto a fresh branch and apply its three small shared-file diffs by hand. `origin/slice/3.9-feedback` contains all of 3.6's work plus 3.9's, so we port once from that tip.

**Files:**
- Create (ported): `web/app/(app)/organise/[id]/run/actions.ts`, `web/app/(app)/organise/[id]/run/page.tsx`, `web/app/(app)/events/[id]/feedback/actions.ts`, `web/app/(app)/events/[id]/feedback/page.tsx`, `web/lib/email.ts`, `web/tests/run-actions.test.ts`, `web/tests/feedback-actions.test.ts`
- Modify: `web/lib/brand.ts`, `web/package.json`, `web/tests/helpers.ts`, `web/app/(app)/e/[id]/page.tsx`

**Interfaces:**
- Produces: `sendBroadcastEmails()` in `web/lib/email.ts`; run page at `/organise/[id]/run`; feedback form at `/events/[id]/feedback`. Task 9's dashboard links to none of these directly; Task 3 depends on this task being merged.

- [ ] **Step 1: Branch**

```bash
cd "/Users/aasmac/Desktop/AI Projects/Rethink Events Final"
git checkout -b phase-4/stabilize-v1 main
```

- [ ] **Step 2: Port the unique files wholesale from the 3.9 branch tip**

```bash
git checkout origin/slice/3.9-feedback -- \
  "web/app/(app)/organise/[id]/run/actions.ts" \
  "web/app/(app)/organise/[id]/run/page.tsx" \
  "web/app/(app)/events/[id]/feedback/actions.ts" \
  "web/app/(app)/events/[id]/feedback/page.tsx" \
  "web/lib/email.ts" \
  "web/tests/run-actions.test.ts" \
  "web/tests/feedback-actions.test.ts"
```

- [ ] **Step 3: Apply the three shared-file diffs**

3a. `web/lib/brand.ts` — insert these two keys between the closing `}` of `errors:` and the `manifesto:` line (exact content from the branch):

```ts
  run: {
    checkIn: "CHECK IN",
    uncheckIn: "UNDO",
    broadcast: "SEND BROADCAST",
    alreadySent: "ALREADY SENT",
    noAttendees: "No attendees yet.",
    broadcastPlaceholder: "Message to all attendees...",
  },
  feedback: {
    heading: "How was it?",
    subheading: "Your feedback goes directly to the organiser.",
    thumbsUp: "Yes, great",
    thumbsDown: "Could be better",
    notePlaceholder: "Anything else you'd like to share? (optional)",
    submitLabel: "SUBMIT FEEDBACK",
    alreadySubmitted: "You've already left feedback for this event.",
    noFeedback: "No feedback yet.",
    hostHeading: "FEEDBACK",
  },
```

3b. `web/tests/helpers.ts` — add immediately after the first import line, ONLY if not already exported:

```ts
export type { SupabaseClient };
```

3c. Install resend:

```bash
cd web && npm install resend@^6.16.0
```

- [ ] **Step 4: Add a RESEND_API_KEY guard note**

Check `web/lib/email.ts` after porting: it reads `process.env.RESEND_API_KEY`. Confirm `.env.local.example` mentions it; if `.env.local` lacks the key the broadcast action will throw at send time — that is acceptable for this phase (email sending is exercised in production setup, which is deferred). Do not stub or fake it.

- [ ] **Step 5: Surface the feedback form from the public event page**

The feedback route exists but nothing links to it. In `web/app/(app)/e/[id]/page.tsx`, the component already computes `const isPast = new Date(event.ends_at) < new Date();` and renders a share block that starts with `<div className="mt-stack-xl border-t-4 border-on-background pt-stack-lg">`. Insert this block immediately BEFORE that share block:

```tsx
        {isPast && myRsvp && (
          <div className="mt-stack-xl border-t-4 border-on-background pt-stack-lg">
            <Link
              href={`/events/${event.id}/feedback`}
              className="font-mono text-label-mono uppercase underline underline-offset-4 hover:text-primary transition-colors"
            >
              {BRAND.feedback.heading} →
            </Link>
          </div>
        )}
```

- [ ] **Step 6: Run the suite**

```bash
cd web && npm test
```

Expected: PASS, including the two ported test files (`run-actions.test.ts`: 8+ tests, `feedback-actions.test.ts`: 4 tests). If a ported file imports something main lacks, the error will name it — check the file against `origin/slice/3.9-feedback` and port the missing dependency the same way. Any other conflict: **STOP**.

- [ ] **Step 7: Build check and commit**

```bash
npm run build
cd .. && git add -A && git commit -m "feat(phase-4): port run-view, broadcast, and feedback from slices 3.6/3.9"
```

Expected: build succeeds with no type errors.

---

### Task 2: Port the ICS calendar export (replaces merging PR #8)

Main already has the RSVP flow, FULL badge, ticket page, and Google Calendar link (merged PRs #3/#5), so most of PR #8 is superseded. Its one missing V1 piece is the ICS download. The branch's route handler uses non-Promise `params`, which Next 16 rejects — the version below is corrected.

**Files:**
- Create: `web/lib/calendar.ts`, `web/app/api/ics/[eventId]/route.ts`, `web/tests/ics-route.test.ts`
- Modify: `web/app/(app)/e/[id]/page.tsx`

**Interfaces:**
- Produces: `buildIcsContent(event)` in `web/lib/calendar.ts`; GET `/api/ics/[eventId]` returning `text/calendar`.

- [ ] **Step 1: Port calendar lib and the test wholesale**

```bash
cd "/Users/aasmac/Desktop/AI Projects/Rethink Events Final"
git checkout origin/slice/3.4-rsvp-ticket -- web/lib/calendar.ts web/tests/ics-route.test.ts
```

- [ ] **Step 2: Run the ported test to verify it fails**

```bash
cd web && npx vitest run tests/ics-route.test.ts
```

Expected: FAIL — the route module `@/app/api/ics/[eventId]/route` does not exist yet. If the test file mocks or imports with non-Promise params, adapt the test's call to pass `{ params: Promise.resolve({ eventId: "..." }) }`.

- [ ] **Step 3: Write the corrected route (do NOT port the branch version)**

Create `web/app/api/ics/[eventId]/route.ts`:

```ts
import { createClient } from "@/lib/supabase/server";
import { buildIcsContent } from "@/lib/calendar";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, title, city, venue, starts_at, ends_at, description")
    .eq("id", eventId)
    .eq("state", "published")
    .single();

  if (!event) {
    return new Response("Event not found", { status: 404 });
  }

  const ics = buildIcsContent(event);
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="event.ics"`,
    },
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run tests/ics-route.test.ts
```

Expected: PASS.

- [ ] **Step 5: Link the ICS download on the event page**

In `web/app/(app)/e/[id]/page.tsx`, find the share block's inner button row `<div className="mt-3 flex gap-4">` (it contains three `<ShareButton>`s). Add as the first child of that div:

```tsx
            <a
              href={`/api/ics/${event.id}`}
              className="border-2 border-on-background px-4 py-2 font-mono text-label-data font-semibold uppercase transition-colors hover:bg-secondary-container hard-shadow hard-shadow-hover"
            >
              ADD TO CALENDAR
            </a>
```

- [ ] **Step 6: Full suite, build, commit**

```bash
npm test && npm run build
cd .. && git add -A && git commit -m "feat(phase-4): port ICS calendar export from slice 3.4"
```

---

### Task 3: Land the stabilize branch, close the superseded PRs

- [ ] **Step 1: Push and open the PR**

```bash
cd "/Users/aasmac/Desktop/AI Projects/Rethink Events Final"
git push -u origin phase-4/stabilize-v1
gh pr create --base main --title "Phase 4 stabilize: port slices 3.4/3.6/3.9 onto current main" --body "Ports the unique content of PRs #8, #9, #10 onto current main (their branches were cut pre-Phase-1 and conflict with merged work). Adds: run-view + one-shot broadcast, post-session feedback, ICS export, feedback link on event page. Supersedes #8 #9 #10.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

- [ ] **Step 2: Merge it and close the superseded PRs**

```bash
gh pr merge phase-4/stabilize-v1 --squash --delete-branch
gh pr close 8  --comment "Superseded: unique content (ICS export, calendar lib, tests) ported to main by the phase-4 stabilize PR; RSVP/ticket/FULL flows were already on main via #3/#5."
gh pr close 9  --comment "Superseded: run-view + broadcast ported to main by the phase-4 stabilize PR."
gh pr close 10 --comment "Superseded: feedback form + host summary ported to main by the phase-4 stabilize PR."
git checkout main && git pull
```

Expected: `main` now contains all of V1. Run `cd web && npm test` once more on main — all green before Task 4.

---

### Task 4: Migration 0006 — host whitelist, single write path, trusted-only INSERT

The DB change at the heart of Phase 4. TDD at the integration level: write the failing whitelist tests first, then apply the migration that makes them pass.

**Files:**
- Create: `web/supabase/migrations/0006_host_whitelist.sql`, `web/tests/whitelist-rls.test.ts`
- Branch: all remaining tasks happen on `phase-4/community-app`

**Interfaces:**
- Produces: table `public.host_whitelist(email pk, added_by, created_at)`; function `public.is_trusted_host()`; RLS policy `events_insert_trusted`. Tasks 6 and 8 rely on these exact names.

- [ ] **Step 1: Branch**

```bash
cd "/Users/aasmac/Desktop/AI Projects/Rethink Events Final"
git checkout -b phase-4/community-app main
```

- [ ] **Step 2: Write the failing integration tests**

Create `web/tests/whitelist-rls.test.ts`:

```ts
/**
 * Phase 4 — host_whitelist: the ONLY write path for profiles.is_trusted.
 * Requires a real Supabase instance with migrations 0001-0006 applied.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { admin, anon, makeUser, userClient, setProfile, wipeUsers } from "./helpers";

let adminId: string;
let memberId: string;
let adminClient: Awaited<ReturnType<typeof userClient>>;
let memberClient: Awaited<ReturnType<typeof userClient>>;

const MEMBER_EMAIL = "wl-member@test.local";

beforeAll(async () => {
  await wipeUsers();
  await admin.from("host_whitelist").delete().neq("email", "");
  adminId = await makeUser("wl-admin@test.local");
  await setProfile(adminId, { is_admin: true });
  memberId = await makeUser(MEMBER_EMAIL);
  adminClient = await userClient("wl-admin@test.local");
  memberClient = await userClient(MEMBER_EMAIL);
}, 60_000);

afterAll(async () => {
  await admin.from("host_whitelist").delete().neq("email", "");
  await wipeUsers();
});

describe("host_whitelist — access control", () => {
  it("anon cannot read the whitelist", async () => {
    const { data } = await anon.from("host_whitelist").select("email");
    expect(data ?? []).toHaveLength(0);
  });

  it("member cannot read the whitelist", async () => {
    const { data } = await memberClient.from("host_whitelist").select("email");
    expect(data ?? []).toHaveLength(0);
  });

  it("member cannot add themselves", async () => {
    const { error } = await memberClient
      .from("host_whitelist")
      .insert({ email: MEMBER_EMAIL, added_by: memberId });
    expect(error).not.toBeNull();
  });
});

describe("host_whitelist — grant and revoke flip is_trusted", () => {
  it("admin whitelists an existing member -> member becomes trusted", async () => {
    const { error } = await adminClient
      .from("host_whitelist")
      .insert({ email: MEMBER_EMAIL, added_by: adminId });
    expect(error).toBeNull();

    const { data } = await admin
      .from("profiles").select("is_trusted").eq("id", memberId).single();
    expect(data?.is_trusted).toBe(true);
  });

  it("removing the email revokes trust", async () => {
    await adminClient.from("host_whitelist").delete().eq("email", MEMBER_EMAIL);
    const { data } = await admin
      .from("profiles").select("is_trusted").eq("id", memberId).single();
    expect(data?.is_trusted).toBe(false);
  });

  it("pre-approved email -> profile is trusted at signup", async () => {
    await adminClient
      .from("host_whitelist")
      .insert({ email: "wl-early@test.local", added_by: adminId });
    const earlyId = await makeUser("wl-early@test.local");
    const { data } = await admin
      .from("profiles").select("is_trusted").eq("id", earlyId).single();
    expect(data?.is_trusted).toBe(true);
    await adminClient.from("host_whitelist").delete().eq("email", "wl-early@test.local");
  });

  it("emails are matched case-insensitively (stored lowercase)", async () => {
    const { error } = await adminClient
      .from("host_whitelist")
      .insert({ email: "WL-CASED@test.local", added_by: adminId });
    // check constraint requires lowercase; the app lowercases before insert,
    // so an uppercase insert must be rejected at the DB boundary
    expect(error).not.toBeNull();
  });
});

describe("events INSERT — trusted only", () => {
  it("untrusted member cannot create an event at all", async () => {
    const { error } = await memberClient.from("events").insert({
      host_id: memberId, title: "Should fail", city: "pune",
      starts_at: new Date(Date.now() + 86400_000).toISOString(),
      ends_at:   new Date(Date.now() + 90000_000).toISOString(),
    });
    expect(error).not.toBeNull();
  });

  it("whitelisted member creates -> published instantly", async () => {
    await adminClient
      .from("host_whitelist")
      .insert({ email: MEMBER_EMAIL, added_by: adminId });

    const { data, error } = await memberClient.from("events").insert({
      host_id: memberId, title: "Whitelisted event", city: "pune",
      starts_at: new Date(Date.now() + 86400_000).toISOString(),
      ends_at:   new Date(Date.now() + 90000_000).toISOString(),
    }).select("state").single();

    expect(error).toBeNull();
    expect(data?.state).toBe("published");
  });
});
```

- [ ] **Step 3: Run to verify failure**

```bash
cd web && npx vitest run tests/whitelist-rls.test.ts
```

Expected: FAIL — `relation "public.host_whitelist" does not exist`.

- [ ] **Step 4: Write the migration**

Create `web/supabase/migrations/0006_host_whitelist.sql`:

```sql
-- 0006_host_whitelist.sql — whitelist-gated hosting (Phase 4).
-- The whitelist is the ONLY write path for profiles.is_trusted:
--   insert into host_whitelist -> matching profile (if any) becomes trusted
--   delete from host_whitelist -> matching profile (if any) loses trust
--   profile created at signup  -> trusted iff email is on the list
-- Competing write paths retired here: the first-event-review trust flip
-- (events_flip_trust). The app-side manual toggle is removed in the same PR.
-- To host, an admin must whitelist their own email too — the list is exactly
-- who can host, no exceptions.

-- ─── table ───────────────────────────────────────────────────────────────────
create table public.host_whitelist (
  email      text primary key check (email = lower(email)),
  added_by   uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.host_whitelist enable row level security;

create policy whitelist_admin_select on public.host_whitelist
  for select to authenticated using (public.is_admin());
create policy whitelist_admin_insert on public.host_whitelist
  for insert to authenticated with check (public.is_admin());
create policy whitelist_admin_delete on public.host_whitelist
  for delete to authenticated using (public.is_admin());
-- no update policy: rows are add/remove only

-- ─── trust check usable inside RLS policies (mirrors public.is_admin) ────────
create or replace function public.is_trusted_host()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select is_trusted from public.profiles where id = auth.uid()), false);
$$;

-- ─── grant / revoke triggers: one transaction, no drift ──────────────────────
create or replace function public.apply_whitelist_grant()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set is_trusted = true where lower(email) = new.email;
  return new;
end; $$;
create trigger whitelist_grant
  after insert on public.host_whitelist
  for each row execute function public.apply_whitelist_grant();

create or replace function public.apply_whitelist_revoke()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set is_trusted = false where lower(email) = old.email;
  return old;
end; $$;
create trigger whitelist_revoke
  after delete on public.host_whitelist
  for each row execute function public.apply_whitelist_revoke();

-- ─── pre-approval: profile created after its email was whitelisted ───────────
create or replace function public.apply_whitelist_on_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.host_whitelist w where w.email = lower(new.email)) then
    new.is_trusted := true;
  end if;
  return new;
end; $$;
create trigger profiles_whitelist_on_signup
  before insert on public.profiles
  for each row execute function public.apply_whitelist_on_signup();

-- ─── retire the competing write path ─────────────────────────────────────────
-- With INSERT gated to trusted hosts, pending_review is unreachable, and this
-- flip would grant trust outside the whitelist. The state machine and enum
-- stay (dormant, V2 fallback).
drop trigger if exists events_flip_trust on public.events;
drop function if exists public.flip_host_trusted_on_publish();

-- ─── reset: the list starts empty and is the complete truth ──────────────────
update public.profiles set is_trusted = false where is_trusted;

-- ─── tighten events INSERT: only trusted hosts create events ─────────────────
drop policy events_insert_own on public.events;
create policy events_insert_trusted on public.events
  for insert to authenticated
  with check (host_id = auth.uid() and public.is_trusted_host());
```

- [ ] **Step 5: Apply the migration**

```bash
cd web && npm run db:push
```

Expected: `0006_host_whitelist.sql` applied. If the project is not linked or push fails: **STOP** and ask Aditya (fallback is pasting the SQL into the Supabase SQL editor, but that is his call).

- [ ] **Step 6: Verify the trust reset happened**

The reset is a one-shot statement, so it is verified once at apply time rather than in the recurring suite. Run this quick script:

```bash
node -e '
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
c.from("profiles").select("id", { count: "exact", head: true }).eq("is_trusted", true)
  .then(({ count }) => { console.log("trusted profiles:", count); process.exit(count === 0 ? 0 : 1); });
'
```

Expected: `trusted profiles: 0` and exit code 0. Non-zero count means the reset did not run: **STOP**.

- [ ] **Step 7: Run the new tests**

```bash
npx vitest run tests/whitelist-rls.test.ts
```

Expected: PASS (all 8 tests).

- [ ] **Step 8: Commit**

```bash
cd .. && git add web/supabase/migrations/0006_host_whitelist.sql web/tests/whitelist-rls.test.ts
git commit -m "feat(phase-4): host whitelist migration — single write path for is_trusted, trusted-only event INSERT"
```

---

### Task 5: Update the existing RLS matrix tests for the new INSERT rule

Migration 0006 deliberately broke three cells of the old matrix. Update them; everything else must stay green untouched.

**Files:**
- Modify: `web/tests/rls.test.ts`

- [ ] **Step 1: Run the matrix to see exactly three failures**

```bash
cd web && npx vitest run tests/rls.test.ts
```

Expected failures (test names as they exist today):
1. `events INSERT — initial state trigger > untrusted host → pending_review`
2. `admin approve → trust flip > approving a pending event flips the host to is_trusted`
3. `security — fixed vulnerabilities > untrusted host cannot bypass review queue by sending state=published`

If MORE than these three fail: **STOP** — the migration broke something it should not have.

- [ ] **Step 2: Replace test 1** (`describe("events INSERT — initial state trigger")`, first `it`) with:

```ts
  it("untrusted host insert is rejected outright (phase 4: whitelist-gated)", async () => {
    const { error } = await hostClient
      .from("events")
      .insert({
        host_id: hostId, title: "New untrusted", city: "pune",
        starts_at: new Date(Date.now() + 86400_000).toISOString(),
        ends_at:   new Date(Date.now() + 90000_000).toISOString(),
      });
    expect(error).not.toBeNull();
  });
```

- [ ] **Step 3: Replace test 2** (the whole `describe("admin approve → trust flip")` block) with:

```ts
// ─── phase 4: trust flip on approval was retired; whitelist is the only path ─
describe("trust write paths", () => {
  it("approving a pending event no longer flips the host to trusted", async () => {
    const newHostId = await makeUser("newhost@test.local");
    await setProfile(newHostId, { is_trusted: false });

    const eid = await insertEvent(newHostId, { state: "pending_review" });
    await admin.from("events").update({ state: "published" }).eq("id", eid);

    const { data } = await admin
      .from("profiles").select("is_trusted").eq("id", newHostId).single();
    expect(data?.is_trusted).toBe(false);
  });
});
```

- [ ] **Step 4: Replace test 3** (in `describe("security — fixed vulnerabilities")`) with:

```ts
  it("untrusted host cannot bypass review queue by sending state=published", async () => {
    const { error } = await hostClient
      .from("events")
      .insert({
        host_id: hostId, title: "Bypass attempt", city: "pune",
        state: "published",
        starts_at: new Date(Date.now() + 86400_000).toISOString(),
        ends_at:   new Date(Date.now() + 90000_000).toISOString(),
      });
    expect(error).not.toBeNull(); // phase 4: insert itself is rejected
  });
```

- [ ] **Step 5: Full suite green, commit**

```bash
npm test
cd .. && git add web/tests/rls.test.ts
git commit -m "test(phase-4): update RLS matrix for trusted-only event INSERT"
```

---

### Task 6: `requireTrusted` guard on the create flow

RLS is the bouncer; this task is the polite sign on the door — clean redirects instead of raw DB errors.

**Files:**
- Modify: `web/lib/auth.ts`, `web/app/(app)/organise/actions.ts`, `web/app/(app)/organise/new/page.tsx`, `web/app/(app)/organise/page.tsx`
- Test: `web/tests/auth-guard.test.ts`, `web/tests/organise-actions.test.ts`

**Interfaces:**
- Produces: `requireTrusted(): Promise<{ userId, profile, supabase }>` in `web/lib/auth.ts`, throwing `AuthError("FORBIDDEN")` for untrusted profiles. Task 7 does not consume it; Task 8 does not either — only the organise create path uses it. `cancelEvent` and `updateEvent` keep `requireAuth` (a revoked host retains edit/cancel/run on their own events — spec decision).

- [ ] **Step 1: Write the failing tests**

In `web/tests/auth-guard.test.ts`, add `requireTrusted` to the existing import from `@/lib/auth`, then append:

```ts
describe("requireTrusted", () => {
  it("returns the profile for a trusted user", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockClient({ profile: { ...BASE_PROFILE, is_trusted: true } }) as never
    );
    const result = await requireTrusted();
    expect(result.profile.is_trusted).toBe(true);
  });

  it("throws FORBIDDEN for an untrusted user", async () => {
    vi.mocked(createClient).mockResolvedValue(makeMockClient() as never);
    await expect(requireTrusted()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws UNAUTHORIZED when signed out", async () => {
    vi.mocked(createClient).mockResolvedValue(makeMockClient({ user: null }) as never);
    await expect(requireTrusted()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
```

Note: reuse the file's existing `makeMockClient` and `BASE_PROFILE` helpers exactly as the other describes do.

- [ ] **Step 2: Verify failure**

```bash
cd web && npx vitest run tests/auth-guard.test.ts
```

Expected: FAIL — `requireTrusted` is not exported.

- [ ] **Step 3: Implement** — append to `web/lib/auth.ts` after `requireAdmin`:

```ts
export async function requireTrusted() {
  const result = await requireAuth();
  if (!result.profile.is_trusted) throw new AuthError("FORBIDDEN");
  return result;
}
```

- [ ] **Step 4: Verify pass**

```bash
npx vitest run tests/auth-guard.test.ts
```

Expected: PASS.

- [ ] **Step 5: Gate `createEvent`**

In `web/app/(app)/organise/actions.ts`: add `requireTrusted` to the import from `@/lib/auth`, and in `createEvent` ONLY, change

```ts
  const { userId, supabase } = await requireAuth();
```

to

```ts
  const { userId, supabase } = await requireTrusted();
```

`updateEvent` and `cancelEvent` stay on `requireAuth` (ownership RLS covers them; revoked hosts keep managing existing events).

In `web/tests/organise-actions.test.ts`: the `vi.mock("@/lib/auth", ...)` factory must also export `requireTrusted: vi.fn()`, and the `beforeEach` must give it the same resolved value as `requireAuth`. Add one test:

```ts
  it("createEvent rejects untrusted users", async () => {
    vi.mocked(requireTrusted).mockRejectedValue(Object.assign(new Error("FORBIDDEN"), { code: "FORBIDDEN" }));
    await expect(createEvent(null, makeFormData())).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
```

- [ ] **Step 6: Gate the create page and hide the button**

`web/app/(app)/organise/new/page.tsx` — after the existing `if (!user) redirect("/login");` add:

```tsx
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_trusted")
    .eq("id", user.id)
    .single();
  if (!profile?.is_trusted) redirect("/organise");
```

`web/app/(app)/organise/page.tsx` — after the `if (!user) redirect("/login");` line add the same profile fetch, then wrap the `+ NEW EVENT` Link so it renders only when trusted:

```tsx
        {profile?.is_trusted && (
          <Link href="/organise/new" className={buttonVariants({ size: "sm" })}>
            + NEW EVENT
          </Link>
        )}
```

(The page stays reachable for untrusted users: a revoked host still manages their existing events here.)

- [ ] **Step 7: Suite, build, commit**

```bash
npm test && npm run build
cd .. && git add -A && git commit -m "feat(phase-4): requireTrusted guard on event creation"
```

---

### Task 7: Navigation gating — ORGANISE only for trusted members

**Files:**
- Modify: `web/components/layout/app-shell.tsx`, `web/components/layout/top-nav.tsx`, `web/components/layout/mobile-nav.tsx`

**Interfaces:**
- Produces: `AppShell` becomes an async Server Component fetching the viewer's trust once; `TopNav`/`MobileNav` accept `canHost: boolean` (default false).

- [ ] **Step 1: Make AppShell fetch the viewer** — replace `web/components/layout/app-shell.tsx` with:

```tsx
import { TopNav } from "./top-nav";
import { MobileNav } from "./mobile-nav";
import { Footer } from "./footer";
import { createClient } from "@/lib/supabase/server";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let canHost = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_trusted")
      .eq("id", user.id)
      .single();
    canHost = !!profile?.is_trusted;
  }

  return (
    <>
      <TopNav canHost={canHost} />
      <main className="flex-1 pb-[72px] md:pb-0">{children}</main>
      <Footer />
      <MobileNav canHost={canHost} />
    </>
  );
}
```

- [ ] **Step 2: Filter the link in both navs**

`web/components/layout/top-nav.tsx` — change the signature and the links list:

```tsx
export function TopNav({ canHost = false }: { canHost?: boolean }) {
  const pathname = usePathname();
  const links = navLinks.filter((l) => l.href !== "/organise" || canHost);
```

and render `links.map(...)` instead of `navLinks.map(...)`. Apply the identical pattern to `web/components/layout/mobile-nav.tsx` (its array is `navItems`).

- [ ] **Step 3: Verify by build + suite**

```bash
cd web && npm run build && npm test
```

Expected: both green. (Client components receiving a serializable boolean prop from a server component is valid; if the build complains about `async` AppShell being imported somewhere client-side, that import is the bug — find and report it, do not mark AppShell `"use client"`.)

- [ ] **Step 4: Commit**

```bash
cd .. && git add -A && git commit -m "feat(phase-4): hide ORGANISE nav from non-hosts"
```

---

### Task 8: Admin whitelist section; remove the manual trust toggle

**Files:**
- Modify: `web/app/(admin)/admin/actions.ts`, `web/app/(admin)/admin/page.tsx`, `web/lib/brand.ts`
- Test: `web/tests/admin-actions.test.ts`

**Interfaces:**
- Consumes: `host_whitelist` table + triggers (Task 4), `requireAdmin` from `@/lib/auth`.
- Produces: `addToWhitelist(formData: FormData): Promise<void>` and `removeFromWhitelist(email: string, _formData: FormData): Promise<void>` server actions. `setTrust` is DELETED.

- [ ] **Step 1: Write the failing tests**

In `web/tests/admin-actions.test.ts`:
1. Change the import line to `import { approveEvent, takedownEvent, addToWhitelist, removeFromWhitelist } from "@/app/(admin)/admin/actions";` (drop `setTrust`).
2. DELETE the whole `describe("setTrust")` block.
3. Extend the anon-client mock chain to support insert/delete: add

```ts
const mockWlInsert = vi.fn();
const mockWlDeleteEq = vi.fn();
const mockWlDelete = vi.fn(() => ({ eq: mockWlDeleteEq }));
```

and change `mockAnonFrom` to return `{ update: mockUpdate, insert: mockWlInsert, delete: mockWlDelete }`, with `beforeEach` adding `mockWlInsert.mockResolvedValue({ error: null }); mockWlDeleteEq.mockResolvedValue({ error: null });`.
4. Append:

```ts
describe("addToWhitelist", () => {
  function fd(email: string) {
    const f = new FormData();
    f.set("email", email);
    return f;
  }

  it("lowercases and inserts the email via the admin's own client", async () => {
    await addToWhitelist(fd("  Aditya@Example.COM "));
    expect(mockAnonFrom).toHaveBeenCalledWith("host_whitelist");
    expect(mockWlInsert).toHaveBeenCalledWith({ email: "aditya@example.com", added_by: "admin-1" });
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
  });

  it("rejects an invalid email without inserting", async () => {
    await addToWhitelist(fd("not-an-email"));
    expect(mockWlInsert).not.toHaveBeenCalled();
  });

  it("requires admin", async () => {
    await addToWhitelist(fd("x@y.dev"));
    expect(requireAdmin).toHaveBeenCalled();
  });
});

describe("removeFromWhitelist", () => {
  it("deletes the email row", async () => {
    await removeFromWhitelist("gone@example.com", new FormData());
    expect(mockAnonFrom).toHaveBeenCalledWith("host_whitelist");
    expect(mockWlDeleteEq).toHaveBeenCalledWith("email", "gone@example.com");
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
    expect(requireAdmin).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Verify failure**

```bash
cd web && npx vitest run tests/admin-actions.test.ts
```

Expected: FAIL — `addToWhitelist` not exported (and `setTrust` import errors are gone because you removed them).

- [ ] **Step 3: Implement the actions**

In `web/app/(admin)/admin/actions.ts`: DELETE the `setTrust` function and the now-unused `createServiceClient` import, add `import { z } from "zod";`, and append:

```ts
const emailSchema = z.email();

export async function addToWhitelist(formData: FormData): Promise<void> {
  const { userId, supabase } = await requireAdmin();
  const raw = String(formData.get("email") ?? "").trim().toLowerCase();
  const parsed = emailSchema.safeParse(raw);
  if (!parsed.success) return;

  const { error } = await supabase
    .from("host_whitelist")
    .insert({ email: parsed.data, added_by: userId });
  // 23505 = duplicate email: already whitelisted, treat as success
  if (error && error.code !== "23505") throw new Error(error.message);
  revalidatePath("/admin");
}

export async function removeFromWhitelist(email: string, _formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("host_whitelist").delete().eq("email", email);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}
```

Note: the admin's own RLS client is used — the whitelist policies allow admins, and the grant/revoke triggers run as security definer. No service role needed here.

- [ ] **Step 4: Verify pass**

```bash
npx vitest run tests/admin-actions.test.ts
```

Expected: PASS.

- [ ] **Step 5: Brand copy** — in `web/lib/brand.ts`, add after the `feedback` key:

```ts
  admin: {
    whitelistHeading: "HOST WHITELIST",
    whitelistHint: "Whitelisted emails can create events. Everyone on this list, and only this list.",
    whitelistPlaceholder: "member@example.com",
    whitelistAdd: "ADD",
    whitelistRemove: "REMOVE",
    whitelistEmpty: "Nobody can host yet. Add the first email.",
  },
```

- [ ] **Step 6: Rework the admin page**

In `web/app/(admin)/admin/page.tsx`:

1. Update the actions import to `import { approveEvent, takedownEvent, addToWhitelist, removeFromWhitelist } from "./actions";` and add `import { BRAND } from "@/lib/brand";`.
2. Add the whitelist to the parallel fetch (it becomes a 4-tuple):

```tsx
  const [{ data: pendingEvents }, { data: publishedEvents }, { data: profiles }, { data: whitelist }] =
    await Promise.all([
      /* ...three existing queries unchanged... */,
      supabase
        .from("host_whitelist")
        .select("email, added_by, created_at")
        .order("created_at", { ascending: true }),
    ]);
```

3. Insert this section between the "Live Events" section and the "Members" section:

```tsx
      <section className="space-y-4">
        <h2 className="text-base font-mono font-semibold border-b-2 border-on-background pb-2">
          {BRAND.admin.whitelistHeading} ({whitelist?.length ?? 0})
        </h2>
        <p className="text-xs font-mono text-muted-foreground">{BRAND.admin.whitelistHint}</p>
        <form action={addToWhitelist} className="flex gap-2">
          <input
            type="email"
            name="email"
            required
            placeholder={BRAND.admin.whitelistPlaceholder}
            className="flex-1 border-2 border-on-background bg-background px-3 py-2 font-mono text-sm"
          />
          <Button type="submit" size="sm">{BRAND.admin.whitelistAdd}</Button>
        </form>
        {!whitelist?.length ? (
          <p className="text-sm font-mono text-muted-foreground">{BRAND.admin.whitelistEmpty}</p>
        ) : (
          <ul className="divide-y divide-on-background">
            {whitelist.map((entry) => {
              const removeAction = removeFromWhitelist.bind(null, entry.email);
              return (
                <li key={entry.email} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{entry.email}</p>
                    <p className="text-xs font-mono text-muted-foreground">
                      added {new Date(entry.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <form action={removeAction}>
                    <Button type="submit" size="sm" variant="destructive">
                      {BRAND.admin.whitelistRemove}
                    </Button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>
```

4. In the "Members" section: DELETE the two `setTrust.bind` lines and the `<form action={...}>...</form>` toggle block inside the members `map`, leaving the member info display (name, email, admin/trusted badges) as read-only.

- [ ] **Step 7: Suite, build, commit**

```bash
npm test && npm run build
cd .. && git add -A && git commit -m "feat(phase-4): admin whitelist section; retire manual trust toggle"
```

---

### Task 9: Schedule-first home dashboard

Replace the feed-as-landing with: HAPPENING NOW, HOSTING (your events), YOU'RE IN (your RSVPs), FOR YOU, UPCOMING. Anonymous visitors keep the current hero + upcoming + sign-in path. All existing pieces (EventCard, city tabs, section headers) are reused.

**Files:**
- Modify: `web/app/page.tsx`, `web/lib/brand.ts`
- Test: `web/tests/dashboard.test.ts` (create)

**Interfaces:**
- Consumes: `EventCard`/`FeedEvent` from `@/components/ui/event-card`, `AppShell`, `BRAND`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the failing data-layer test**

Create `web/tests/dashboard.test.ts` (integration, follows `feed.test.ts` style — it verifies the exact queries the page runs):

```ts
/**
 * Phase 4 — dashboard data layer: hosting, attending, upcoming queries.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { admin, makeUser, userClient, setProfile, wipeUsers } from "./helpers";

let meId: string;
let otherHostId: string;
let myEventId: string;
let attendingEventId: string;
let otherEventId: string;
let me: Awaited<ReturnType<typeof userClient>>;

const BASE = {
  title: "Dash Test",
  city: "bangalore" as const,
  starts_at: new Date(Date.now() + 86400_000).toISOString(),
  ends_at: new Date(Date.now() + 90000_000).toISOString(),
};

beforeAll(async () => {
  await wipeUsers();
  meId = await makeUser("dash-me@test.local");
  otherHostId = await makeUser("dash-host@test.local");
  await setProfile(meId, { is_trusted: true, full_name: "Dash Me" });
  await setProfile(otherHostId, { is_trusted: true, full_name: "Dash Host" });

  const [mine, attending, other] = await Promise.all([
    admin.from("events").insert({ ...BASE, host_id: meId, host_name: "Dash Me", state: "published", title: "Mine" }).select("id").single(),
    admin.from("events").insert({ ...BASE, host_id: otherHostId, host_name: "Dash Host", state: "published", title: "Attending" }).select("id").single(),
    admin.from("events").insert({ ...BASE, host_id: otherHostId, host_name: "Dash Host", state: "published", title: "Other" }).select("id").single(),
  ]);
  myEventId = mine.data!.id;
  attendingEventId = attending.data!.id;
  otherEventId = other.data!.id;

  me = await userClient("dash-me@test.local");
  await me.rpc("rsvp_to_event", { p_event_id: attendingEventId });
}, 60_000);

afterAll(wipeUsers);

describe("dashboard queries", () => {
  it("hosting: returns my own events", async () => {
    const { data } = await me
      .from("events")
      .select("id")
      .eq("host_id", meId)
      .not("state", "in", '("cancelled","taken_down")');
    expect(data?.map((e) => e.id)).toContain(myEventId);
    expect(data?.map((e) => e.id)).not.toContain(otherEventId);
  });

  it("attending: returns events joined through my going RSVPs", async () => {
    const { data } = await me
      .from("rsvps")
      .select("event_id, events(id, title, starts_at)")
      .eq("user_id", meId)
      .eq("status", "going");
    const ids = (data ?? []).map((r) => r.event_id);
    expect(ids).toContain(attendingEventId);
    expect(ids).not.toContain(otherEventId);
  });

  it("upcoming: published events exclude nothing at the query level", async () => {
    const { data } = await me
      .from("events")
      .select("id")
      .eq("state", "published")
      .in("id", [myEventId, attendingEventId, otherEventId]);
    expect(data?.length).toBe(3);
  });
});
```

- [ ] **Step 2: Run it**

```bash
cd web && npx vitest run tests/dashboard.test.ts
```

Expected: PASS already (these are RLS-visibility checks for the queries the page will use — they pin the data contract before the UI is built; if any fails, the page would be built on a broken assumption: **STOP**).

- [ ] **Step 3: Brand copy** — in `web/lib/brand.ts`, add after the `feed` key:

```ts
  dashboard: {
    hosting: "HOSTING",
    attending: "YOU'RE IN",
    emptyCommitments: "Nothing on your calendar yet. Pick something below.",
    manage: "MANAGE →",
  },
```

- [ ] **Step 4: Rewrite the landing page**

Replace the body of `web/app/page.tsx` (keep `CITY_ABBR`, `CITY_VALUES`, `SectionHeader`, `EmptyState` helpers as they are). The full new component:

```tsx
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const { city: cityParam } = await searchParams;
  const activeCity = CITY_VALUES.includes(cityParam as (typeof CITY_VALUES)[number])
    ? (cityParam as string)
    : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Published events, city-filtered if set
  let q = supabase
    .from("events")
    .select("id, title, city, venue, starts_at, ends_at, capacity, tags, host_name, featured_for")
    .eq("state", "published")
    .order("starts_at");
  if (activeCity) q = q.eq("city", activeCity);
  const { data: rawEvents } = await q;
  const published = rawEvents ?? [];

  // Member commitments: own events + going RSVPs (unfiltered by city tab)
  let hosting: typeof published = [];
  const myGoingIds = new Set<string>();
  let profile: { goal: string | null; city: string | null; is_trusted: boolean } | null = null;

  if (user) {
    const [{ data: prof }, { data: myEvents }, { data: myRsvps }] = await Promise.all([
      supabase.from("profiles").select("goal, city, is_trusted").eq("id", user.id).single(),
      supabase
        .from("events")
        .select("id, title, city, venue, starts_at, ends_at, capacity, tags, host_name, featured_for")
        .eq("host_id", user.id)
        .not("state", "in", '("cancelled","taken_down")')
        .gte("ends_at", new Date().toISOString())
        .order("starts_at"),
      supabase
        .from("rsvps")
        .select("event_id")
        .eq("user_id", user.id)
        .eq("status", "going"),
    ]);
    profile = prof;
    hosting = myEvents ?? [];
    for (const r of myRsvps ?? []) myGoingIds.add(r.event_id);
  }

  // Going counts for everything we might render
  const allIds = [...new Set([...published.map((e) => e.id), ...hosting.map((e) => e.id)])];
  const goingMap = new Map<string, number>();
  if (allIds.length > 0) {
    const { data: goingRows } = await supabase
      .from("rsvps")
      .select("event_id")
      .in("event_id", allIds)
      .eq("status", "going");
    for (const row of goingRows ?? []) {
      goingMap.set(row.event_id, (goingMap.get(row.event_id) ?? 0) + 1);
    }
  }

  const withCount = (e: (typeof published)[number]): FeedEvent => ({
    ...e,
    going_count: goingMap.get(e.id) ?? 0,
  });

  const now = new Date();
  const events = published.map(withCount);
  const hostingCards = hosting.map(withCount);
  const hostingIds = new Set(hosting.map((e) => e.id));

  const happeningNow = events.filter(
    (e) => new Date(e.starts_at) <= now && new Date(e.ends_at) > now
  );
  const attending = events.filter(
    (e) => myGoingIds.has(e.id) && new Date(e.ends_at) > now && !hostingIds.has(e.id)
  );
  const forYou =
    profile?.goal || profile?.city
      ? events.filter(
          (e) =>
            e.featured_for &&
            (e.featured_for.goal === profile!.goal ||
              e.featured_for.city === profile!.city) &&
            !hostingIds.has(e.id) &&
            !myGoingIds.has(e.id)
        )
      : [];
  const upcoming = events.filter(
    (e) =>
      new Date(e.starts_at) > now && !hostingIds.has(e.id) && !myGoingIds.has(e.id)
  );

  const hasCommitments = hostingCards.length > 0 || attending.length > 0;

  return (
    <AppShell>
      {/* Hero strip */}
      <section className="border-b-4 border-on-background bg-secondary-container px-grid-margin py-stack-xl">
        <h1 className="font-serif text-display-lg font-black uppercase leading-none tracking-tight">
          {BRAND.hero.heading}
        </h1>
        <p className="mt-stack-sm font-mono text-label-mono uppercase text-on-surface-variant">
          {BRAND.tagline}
        </p>
      </section>

      {/* City filter tabs — server-rendered via ?city= searchParam */}
      <nav className="sticky top-20 z-40 flex border-b-4 border-on-background bg-background">
        {[{ label: "ALL", value: null }, ...CITY_VALUES.map((c) => ({ label: CITY_ABBR[c], value: c }))].map(
          ({ label, value }) => {
            const isActive = value === activeCity;
            const href = value ? `/?city=${value}` : "/";
            return (
              <Link
                key={label}
                href={href}
                className={`border-r-4 border-on-background px-6 py-3 font-mono text-label-mono font-semibold uppercase transition-colors last:border-r-0 ${
                  isActive
                    ? "bg-primary text-on-primary"
                    : "hover:bg-secondary-container"
                }`}
              >
                {label}
              </Link>
            );
          }
        )}
      </nav>

      <div className="px-grid-margin">
        {/* Happening Now */}
        {happeningNow.length > 0 && (
          <section className="mt-stack-xl">
            <SectionHeader label={BRAND.feed.happeningNow} />
            <div className="mt-stack-lg grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {happeningNow.map((e) => (
                <EventCard key={e.id} event={e} going={myGoingIds.has(e.id)} />
              ))}
            </div>
          </section>
        )}

        {/* Hosting — the member's own events, with a manage link */}
        {hostingCards.length > 0 && (
          <section className="mt-stack-xl">
            <SectionHeader label={BRAND.dashboard.hosting} />
            <div className="mt-stack-lg grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {hostingCards.map((e) => (
                <div key={e.id}>
                  <EventCard event={e} going={false} />
                  <Link
                    href={`/organise/${e.id}/run`}
                    className="mt-2 inline-block font-mono text-label-data uppercase underline underline-offset-4 hover:text-primary"
                  >
                    {BRAND.dashboard.manage}
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* You're in — going RSVPs */}
        {attending.length > 0 && (
          <section className="mt-stack-xl">
            <SectionHeader label={BRAND.dashboard.attending} />
            <div className="mt-stack-lg grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {attending.map((e) => (
                <EventCard key={e.id} event={e} going />
              ))}
            </div>
          </section>
        )}

        {/* Signed-in, no commitments: nudge */}
        {user && !hasCommitments && (
          <p className="mt-stack-xl font-serif text-body-lg text-on-surface-variant">
            {BRAND.dashboard.emptyCommitments}
          </p>
        )}

        {/* For You */}
        {forYou.length > 0 && (
          <section className="mt-stack-xl">
            <SectionHeader label="FOR YOU" />
            {profile?.goal && (
              <p className="mt-1 font-mono text-label-data uppercase text-on-surface-variant">
                Based on your goal: {profile.goal.replace(/_/g, " ")}
              </p>
            )}
            <div className="mt-stack-lg grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {forYou.map((e) => (
                <EventCard key={e.id} event={e} going={myGoingIds.has(e.id)} />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming */}
        <section className="mt-stack-xl pb-stack-xl">
          <SectionHeader label={BRAND.feed.upcoming} />
          {upcoming.length === 0 ? (
            <EmptyState>
              {BRAND.empty.feed}
              {profile?.is_trusted && (
                <>
                  {" "}
                  <Link
                    href="/organise"
                    className="underline underline-offset-4 hover:text-primary"
                  >
                    Host one.
                  </Link>
                </>
              )}
            </EmptyState>
          ) : (
            <div className="mt-stack-lg grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((e) => (
                <EventCard key={e.id} event={e} going={myGoingIds.has(e.id)} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
```

Behavioral notes baked into that code:
- Hosting/attending/for-you/upcoming are DISJOINT: an event appears in the highest section it qualifies for, never twice.
- Anonymous visitors get hero + city tabs + happening now + upcoming — the pre-existing public feed, minus member sections. RSVP sign-in gating happens on the event page, unchanged.
- The "Host one." nudge renders only for trusted members now (non-hosts cannot reach the create flow).
- Commitment sections ignore the city tab (your commitments are yours regardless of the filter); the tab keeps filtering the public sections. This is intentional.

- [ ] **Step 5: Suite, build, commit**

```bash
cd web && npm test && npm run build
cd .. && git add -A && git commit -m "feat(phase-4): schedule-first home — hosting and attending lead, feed demoted"
```

---

### Task 10: Final verification and PR

- [ ] **Step 1: Full suite from clean state**

```bash
cd "/Users/aasmac/Desktop/AI Projects/Rethink Events Final/web"
npm test
```

Expected: ALL green — including `rls.test.ts` (updated matrix), `whitelist-rls.test.ts`, `dashboard.test.ts`, and every pre-existing file. Paste the summary line into the PR body.

- [ ] **Step 2: Manual smoke pass (real browser, `npm run dev`)**

Walk each of these; every one must hold:

1. Signed out: home shows hero + upcoming; no ORGANISE in nav; `/e/[id]` for a published event renders; `/organise/new` redirects to login.
2. Signed in, NOT whitelisted: no ORGANISE in nav; `/organise/new` typed directly redirects to `/organise`; RSVP on an event works and lands on the ticket.
3. Admin at `/admin`: add your own email to the whitelist; confirm the member row now shows "trusted".
4. Same user now: ORGANISE appears in nav; create an event; it is PUBLISHED immediately (state badge on `/organise`).
5. Admin removes the email: ORGANISE disappears; the already-published event stays live and still shows EDIT/CANCEL on `/organise`.
6. Home as a member with 1 hosting + 1 attending: HOSTING and YOU'RE IN sections lead, the same events do not repeat under UPCOMING.

If any step fails, fix before the PR; re-run the suite after any fix.

- [ ] **Step 3: PR**

```bash
cd "/Users/aasmac/Desktop/AI Projects/Rethink Events Final"
git push -u origin phase-4/community-app
gh pr create --base main --title "Phase 4: community app — whitelist-gated hosting + schedule-first home" --body "Implements docs/superpowers/specs/2026-07-07-community-app-phase4-design.md.

- Migration 0006: host_whitelist table (admin-only RLS), grant/revoke triggers, signup pre-approval, trusted-only events INSERT, trust reset, retired flip_host_trusted_on_publish
- Whitelist is now the ONLY write path for is_trusted; manual admin toggle removed
- requireTrusted guard on event creation; ORGANISE nav hidden for non-hosts
- Admin page: whitelist add/remove section
- Home: schedule-first dashboard (HOSTING / YOU'RE IN lead, feed demoted)

Test suite: [paste summary]. Manual smoke pass: [confirm 6/6].

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

Do NOT merge this PR — Aditya reviews it.

- [ ] **Step 4: Record (mandatory — the knowledge files exist)**

1. Append a dated entry to `knowledge/session-journal.md` (newest at top, format is at the file's header): Built / Broke / Decided / Overrides used / Next.
2. If anything failed or was reverted during execution, add it to `knowledge/past-mistakes.md` with root cause and class of mistake.
3. Update the "Status and foundation state" section of the project `CLAUDE.md`: migrations 0001-0006 verified applied (or not), e2e smoke walked (6/6 or which failed), Phase 4 PR open awaiting review.
4. State in the journal entry: the two retired write paths (setTrust action, events_flip_trust trigger) and that migration 0006 is applied to the hosted project.

---

## Execution order and gates

```
Task 0 (foundation)  — gate: baseline suite green, env verified
Task 1 -> 2 -> 3 (stabilize) — gate: main contains all of V1, suite green on main
Task 4 -> 5 (DB)     — gate: RLS matrix green with new INSERT rule
Task 6 -> 7 -> 8 (gating + admin) — each ends suite-green
Task 9 (dashboard)
Task 10 (verify + PR) — gate: 6/6 manual smoke, full suite, PR open
```

Tasks must run in this order; 4 depends on 3 (migration numbering and ported tests), 5-9 depend on 4.
