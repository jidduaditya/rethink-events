# Onboarding — ReThink Events (Aditya + Claude instance)

**READ THIS ENTIRE FILE BEFORE WRITING A SINGLE LINE OF CODE.**
Claude: do not skip sections, do not build anything not listed here, do not
create helper abstractions or infrastructure. Your job is to wire real DB calls
and Server Actions into screens that already exist.

---

## 1. The product in one paragraph

ReThink Events is a meetup platform for product managers. A trusted member
creates an event → it publishes → people RSVP → host runs the event and
checks people in. That's the whole loop. V1 is intentionally minimal.

---

## 2. What is already built — do not touch these files

The following is **done and merged to `main`**. Read the files to understand
the patterns. Do not modify them unless your slice explicitly requires it.

### Foundation (Phase 0)
- `web/app/globals.css` — Electric Zine design tokens (use these classes, don't invent new ones)
- `web/lib/brand.ts` — all copy strings. Use `BRAND.*` everywhere, no hardcoded strings.
- `web/lib/supabase/server.ts` — `createClient()` for Server Components and Server Actions
- `web/lib/supabase/middleware.ts` — session refresh (do not touch)
- `web/proxy.ts` — route auth guard (do not touch)
- `web/lib/auth.ts` — `requireAuth()`, `requireAdmin()`, `requireOwner(eventId)` helpers
- `web/components/ui/button.tsx`, `web/components/layout/app-shell.tsx` — UI primitives

### Data spine (Phase 2)
- `web/supabase/migrations/0001_schema.sql` — **read this** to understand every table and column
- `web/supabase/migrations/0002_functions.sql` — **read this** for every DB function you'll call
- `web/supabase/migrations/0003_rls.sql` — RLS policies (RLS enforces security, trust it)
- `web/tests/rls.test.ts` — 37 RLS tests, must stay green on every PR

### Screens already wired to real DB (Phase 3 — our slices)
- `web/app/page.tsx` — home feed (real DB, city filter, For You)
- `web/app/(app)/e/[id]/page.tsx` — public event page (real DB, RSVP wired)
- `web/app/(app)/e/[id]/opengraph-image.tsx` — OG image
- `web/app/(app)/ticket/[rsvpId]/page.tsx` — ticket (real DB, requireAuth)
- `web/app/actions/rsvp.ts` — `rsvpToEvent` + `cancelRsvp` Server Actions

### Screens that exist as UI shells on mock data (your job = wire them)
- `web/app/(app)/organise/page.tsx` — host dashboard (mock → your slice 3.1)
- `web/app/(app)/organise/new/page.tsx` — create event form (mock → your slice 3.1)
- `web/app/(app)/organise/[id]/edit/page.tsx` — edit form (mock → your slice 3.1)
- `web/app/(app)/organise/[id]/run/page.tsx` — run view (mock → your slice 3.6)
- `web/app/(app)/admin/page.tsx` — admin queue (mock → your slice 3.2)
- `web/app/(app)/me/page.tsx` — profile page (mock → leave for now, not in your slices)

---

## 3. Architecture — non-negotiable rules

**Reads = React Server Components (RSC). Writes = Server Actions.**

```
// CORRECT — reading data in a page
export default async function MyPage() {
  const supabase = await createClient();           // from @/lib/supabase/server
  const { data } = await supabase.from("events").select("...");
  return <div>{data?.map(...)}</div>;
}

// CORRECT — a write (Server Action)
"use server";
export async function doSomething(id: string) {
  const supabase = await createClient();
  await supabase.from("events").update({ state: "published" }).eq("id", id);
  revalidatePath("/organise");
}

// CORRECT — wiring a Server Action to a button
<form action={doSomething.bind(null, event.id)}>
  <Button type="submit">PUBLISH</Button>
</form>
```

**Never use:** `react-query`, `useState` + `fetch`, client-side Supabase calls
for data reads, `useEffect` for data loading. If you find yourself reaching for
any of these, stop — you're off pattern.

**`"use client"`** is only for genuinely interactive client-only bits (e.g. a
character counter, a toggle that doesn't persist). Do not add it to pages.

---

## 4. Database reference — what you'll call

Read `web/supabase/migrations/0002_functions.sql` for the full source. Key
functions for your slices:

```sql
-- Insert or upsert an event (your slice 3.1 uses direct table insert/update)
-- No function needed — insert into events directly via the Supabase client.
-- The set_event_initial_state trigger fires automatically on INSERT:
--   trusted host  → state = 'published'
--   untrusted     → state = 'pending_review'
-- You do NOT set the state yourself.

-- Approve a pending event (slice 3.2)
-- Direct update: .update({ state: 'published' }).eq('id', eventId)
-- The flip_host_trusted_on_publish trigger fires automatically on UPDATE
-- to state='published': sets host profile.is_trusted = true.
-- You do NOT set is_trusted yourself.

-- Return attendee list for run-view (slice 3.6)
select * from event_attendees(p_event_id := '<uuid>');
-- Returns: { user_id, full_name, checked_in }
-- RLS: only host of the event or admin can call this.
```

**Table shapes (abbreviated — read the migration for the full schema):**

```
events: id, host_id, host_name, title, description, city (enum), venue,
        starts_at, ends_at, capacity (nullable int), tags (text[]),
        state (draft|pending_review|published|cancelled|taken_down),
        featured_for (jsonb), broadcast_message, broadcast_sent_at

profiles: id, full_name, email, goal, level, city, is_trusted, is_admin

rsvps: id, event_id, user_id, status (going|cancelled), checked_in

feedback: id, event_id, user_id, rating (thumbs_up|thumbs_down), note
          UNIQUE(event_id, user_id)
```

**City enum values** (match exactly — the DB will reject anything else):
`bangalore`, `pune`, `delhi`, `hyderabad`

**Tag values**: `beginner`, `interview_prep`, `ai_pm`, `build`, `resume`

---

## 5. Auth helpers

`web/lib/auth.ts` exports three helpers. Use them at the top of every
protected Server Component and Server Action:

```typescript
// In a Server Component (page that requires login):
import { requireAuth } from "@/lib/auth";
const { userId, profile, supabase } = await requireAuth();

// In a Server Component (admin-only page):
import { requireAdmin } from "@/lib/auth";
const { userId, profile, supabase } = await requireAdmin();

// In a Server Action (checking host owns the event):
import { requireOwner } from "@/lib/auth";
const { userId, supabase } = await requireOwner(eventId);
```

`requireAuth` throws and redirects to `/auth` if unauthenticated. You don't
need to handle the unauth case yourself.

---

## 6. How to write code

- **Ponytail** (`/ponytail full`): smallest diff that works. No speculative
  abstractions, no scaffolding for later, no new dependencies.
- Read the existing file you're modifying before touching it.
- Every non-trivial Server Action gets one test in `web/tests/`.
- Mark intentional shortcuts: `// ponytail: X covers it, upgrade when Y`.
- Run `npm test` before opening a PR. All tests must pass.
- Run `npx tsc --noEmit` before opening a PR. Must be clean.

---

## 7. Your four slices

Start with **3.1**, then **3.2**. These two unlock the rest of the app
(without them, no events exist and nothing else can be tested). Do 3.6 and
3.9 after.

---

### Slice 3.1 — Trusted-host publishing

**Branch:** `slice/3.1-host-publishing`

**Before you write code, read:**
- `web/app/(app)/organise/page.tsx` — the existing UI shell (mock data)
- `web/app/(app)/organise/new/page.tsx` — existing create form shell
- `web/app/(app)/organise/[id]/edit/page.tsx` — existing edit form shell
- `web/supabase/migrations/0001_schema.sql` lines for the `events` table
- `web/supabase/migrations/0003_rls.sql` for the `events` RLS policies
- `web/lib/auth.ts` for `requireAuth` and `requireOwner`

**What you're building:**

1. **`web/app/actions/event.ts`** — new file, Server Actions:
   - `createEvent(formData: FormData)` — insert into `events`, redirect to `/organise`
   - `updateEvent(eventId: string, formData: FormData)` — update event fields
   - `cancelEvent(eventId: string)` — set `state = 'cancelled'`, revalidate

   Shape of createEvent:
   ```typescript
   "use server";
   import { requireAuth } from "@/lib/auth";
   import { revalidatePath } from "next/cache";
   import { redirect } from "next/navigation";

   export async function createEvent(formData: FormData) {
     const { userId, profile, supabase } = await requireAuth();
     if (!profile.is_trusted && !profile.is_admin) {
       // untrusted hosts can still create — trigger sets state to pending_review
     }
     const { error } = await supabase.from("events").insert({
       host_id: userId,
       host_name: profile.full_name,
       title: formData.get("title") as string,
       description: formData.get("description") as string || null,
       city: formData.get("city") as string,
       venue: formData.get("venue") as string || null,
       starts_at: formData.get("starts_at") as string,
       ends_at: formData.get("ends_at") as string,
       capacity: formData.get("capacity") ? Number(formData.get("capacity")) : null,
       tags: (formData.getAll("tags") as string[]),
       // DO NOT set state — the trigger handles it
     });
     if (error) throw new Error(error.message);
     redirect("/organise");
   }
   ```

2. **`web/app/(app)/organise/page.tsx`** — replace mock data with:
   - `requireAuth()` at the top
   - Query `events` where `host_id = userId`, ordered by `starts_at desc`
   - Render the existing card/badge UI with real data

3. **`web/app/(app)/organise/new/page.tsx`** — wire the existing form to `createEvent`:
   - `<form action={createEvent}>` — no changes to the HTML/CSS
   - City: `<select name="city">` with options matching the enum values exactly
   - Tags: `<input type="checkbox" name="tags" value="beginner">` etc.
   - Dates: `<input type="datetime-local" name="starts_at">` (store as ISO string)

4. **`web/app/(app)/organise/[id]/edit/page.tsx`** — read event from DB,
   pre-fill form, wire to `updateEvent`.

5. **Cancel button** on the host dashboard: `<form action={cancelEvent.bind(null, event.id)}>`.
   Email notification for cancel is **not required** — skip it, leave a `// TODO: email` comment.

**What you must NOT build:**
- Do not build an `is_trusted` check that blocks untrusted hosts from creating — the trigger handles it, just let the insert go through.
- Do not build online/offline mode, meet_url field, or conflict detection.
- Do not add `featured_for` editing — that's admin-only.
- Do not add new npm packages.

**Tests (`web/tests/host-publishing.test.ts`):**
```typescript
// Untrusted host creates event → state is 'pending_review'
// Trusted host creates event → state is 'published'
// Host can update their own event's title
// Host cannot update another host's event (RLS blocks it)
// Cancel sets state to 'cancelled'
```

---

### Slice 3.2 — Admin queue + trust flip + takedown

**Branch:** `slice/3.2-admin`

**Before you write code, read:**
- `web/app/(app)/admin/page.tsx` — the existing UI shell (mock data)
- `web/supabase/migrations/0002_functions.sql` — the `flip_host_trusted_on_publish` trigger
- `web/lib/auth.ts` for `requireAdmin`

**What you're building:**

1. **`web/app/actions/admin.ts`** — new file, Server Actions:
   ```typescript
   "use server";
   import { requireAdmin } from "@/lib/auth";
   import { revalidatePath } from "next/cache";
   import { createClient as createServiceClient } from "@supabase/supabase-js";

   // Approve a pending event. The flip_host_trusted_on_publish trigger
   // automatically sets the host's is_trusted = true — no extra code needed.
   export async function approveEvent(eventId: string) {
     const { supabase } = await requireAdmin();
     await supabase.from("events").update({ state: "published" }).eq("id", eventId);
     revalidatePath("/admin");
   }

   // Takedown any event
   export async function takedownEvent(eventId: string) {
     const { supabase } = await requireAdmin();
     await supabase.from("events").update({ state: "taken_down" }).eq("id", eventId);
     revalidatePath("/admin");
   }

   // Toggle is_trusted on a profile — must use service role key
   export async function setTrusted(profileId: string, trusted: boolean) {
     await requireAdmin(); // verify caller is admin
     const service = createServiceClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.SUPABASE_SERVICE_ROLE_KEY!,
       { auth: { persistSession: false } }
     );
     await service.from("profiles").update({ is_trusted: trusted }).eq("id", profileId);
     revalidatePath("/admin");
   }
   ```

2. **`web/app/(app)/admin/page.tsx`** — replace mock data with:
   - `requireAdmin()` at the top
   - Section 1: `pending_review` events — each has an APPROVE button
   - Section 2: all events — each has a TAKEDOWN button (if not already taken down)
   - Section 3: all profiles — each has a TRUST TOGGLE button

**What you must NOT build:**
- Do not build email notifications for approval — skip, leave `// TODO: email` comment.
- Do not add pagination — V2.
- Do not add search/filter — V2.
- Do not use the service role key for anything except `setTrusted`.

**Tests (`web/tests/admin.test.ts`):**
```typescript
// Approve pending event → state is 'published' AND host profile.is_trusted is true
// Takedown published event → event not visible to anon (RLS check)
// setTrusted(id, true) → profile.is_trusted is true
// setTrusted(id, false) → profile.is_trusted is false
// Non-admin cannot call approveEvent (requireAdmin throws)
```

---

### Slice 3.6 — Host run-view + one broadcast

**Branch:** `slice/3.6-run-view`

**Before you write code, read:**
- `web/app/(app)/organise/[id]/run/page.tsx` — the existing UI shell (mock data)
- `web/supabase/migrations/0002_functions.sql` — the `event_attendees` function
- `web/lib/auth.ts` for `requireOwner`
- `web/supabase/migrations/0001_schema.sql` — `broadcast_message`, `broadcast_sent_at` columns on events

**What you're building:**

1. **`web/app/(app)/organise/[id]/run/page.tsx`** — replace mock data:
   - `requireOwner(eventId)` at top (throws 403 if caller isn't host)
   - Call `supabase.rpc("event_attendees", { p_event_id: eventId })` to get the list
   - Display: name, checked_in status, check-in button per row
   - Broadcast section: textarea + send button (disabled if `broadcast_sent_at` is not null)

2. **`web/app/actions/run.ts`** — new file:
   ```typescript
   "use server";
   import { requireOwner } from "@/lib/auth";
   import { revalidatePath } from "next/cache";

   export async function checkIn(rsvpId: string, eventId: string, value: boolean) {
     const { supabase } = await requireOwner(eventId);
     await supabase.from("rsvps").update({ checked_in: value }).eq("id", rsvpId);
     revalidatePath(`/organise/${eventId}/run`);
   }

   export async function sendBroadcast(eventId: string, message: string) {
     const { supabase } = await requireOwner(eventId);
     // Block second send
     const { data: event } = await supabase
       .from("events").select("broadcast_sent_at").eq("id", eventId).single();
     if (event?.broadcast_sent_at) throw new Error("Already sent");

     // TODO: send email via Resend to all going RSVPs
     // For now, just persist the message
     await supabase.from("events").update({
       broadcast_message: message,
       broadcast_sent_at: new Date().toISOString(),
     }).eq("id", eventId);
     revalidatePath(`/organise/${eventId}/run`);
   }
   ```

**What you must NOT build:**
- Do not implement the actual Resend email call — leave the `// TODO: send email` comment.
- Do not add real-time updates / subscriptions — V2.
- Do not add pagination of the attendee list — V2.

**Tests (`web/tests/run-view.test.ts`):**
```typescript
// checkIn sets rsvps.checked_in = true
// checkIn sets rsvps.checked_in = false (toggle off)
// sendBroadcast sets broadcast_message and broadcast_sent_at on the event
// Second sendBroadcast throws "Already sent"
// Non-host cannot call checkIn (requireOwner throws)
```

---

### Slice 3.9 — Post-session feedback

**Branch:** `slice/3.9-feedback`

**Before you write code, read:**
- `web/app/(app)/e/[id]/page.tsx` — you'll add a feedback form here (after event ends)
- `web/app/(app)/organise/[id]/` — you'll add a `feedback/page.tsx` here
- `web/supabase/migrations/0001_schema.sql` — the `feedback` table + unique constraint
- `web/supabase/migrations/0003_rls.sql` — feedback RLS policies

**What you're building:**

1. **`web/app/actions/feedback.ts`** — new file:
   ```typescript
   "use server";
   import { requireAuth } from "@/lib/auth";
   import { revalidatePath } from "next/cache";

   export async function submitFeedback(eventId: string, rating: "thumbs_up" | "thumbs_down", note: string) {
     const { userId, supabase } = await requireAuth();
     await supabase.from("feedback").upsert(
       { event_id: eventId, user_id: userId, rating, note: note || null },
       { onConflict: "event_id,user_id" }
     );
     revalidatePath(`/e/${eventId}`);
   }
   ```

2. **`web/app/(app)/e/[id]/page.tsx`** — add feedback section after the event ends:
   - Only show if `isPast && isGoing` (attendees only, after event ends)
   - Check if user already submitted: `select id, rating from feedback where event_id=X and user_id=Y`
   - If already submitted: show their rating (read-only)
   - If not: show thumbs up / thumbs down form + optional note textarea

3. **`web/app/(app)/organise/[id]/feedback/page.tsx`** — host read-view:
   - `requireOwner(eventId)` at top
   - Query all feedback for the event
   - Show: thumbs up count, thumbs down count, list of notes
   - Add link to this page from `organise/[id]/run/page.tsx`

**What you must NOT build:**
- Do not show feedback on the public event page — host + admin only.
- Do not show individual names next to feedback — anonymous to host.
- Do not add a feedback summary to the feed cards — V2.

**Tests (`web/tests/feedback.test.ts`):**
```typescript
// Attendee can submit feedback after event ends
// Second submission upserts (doesn't throw)
// Non-attendee cannot insert (RLS blocks)
// Non-host cannot read feedback for another host's event (RLS blocks)
```

---

## 8. Workflow

```bash
# 1. Pull latest main before starting each slice
git checkout main && git pull origin main

# 2. Branch
git checkout -b slice/3.1-host-publishing

# 3. Read the files listed in "Before you write code" above — all of them

# 4. Write the failing test first, then implement

# 5. Verify before PR
npm test          # all tests must pass (including the 37 existing RLS tests)
npx tsc --noEmit  # must be clean

# 6. Open PR — one slice per PR
```

Keep PRs to one slice. Don't combine. Don't add "bonus" improvements to files
outside your slice — raise them as a comment on the PR instead.

---

## 9. Slice order

**3.1 → 3.2 first.** They're the critical path: without them, no events exist
and 3.6/3.9 can't be tested. Do 3.6 and 3.9 after both are merged.

---

## 10. If something is unclear

Don't guess. Don't build a workaround. Leave a `// TODO: ask Krishna` comment
and move to the next thing. Raise questions in the PR description.

The two most dangerous things Claude can do on this repo:
1. Build infrastructure or abstractions that weren't asked for
2. Modify files outside the slice's listed scope

When in doubt: do less, not more.
