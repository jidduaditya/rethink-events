# "For You" Row Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "For you" feed section that surfaces events matching a member's goal + level via tag mapping, plus admin-hand-picked events and a cohort social proof count ("N from your cohort are going").

**Architecture:** Relevance matching lives in `lib/for-you.ts` (pure client-side logic, fully testable). The feed page extends `deriveSections` to add a fourth bucket. Cohort counts come from a `get_cohort_counts` Supabase RPC (joined registrations → profiles). Admin sets `featured_for_goal/level/city` on events via a panel in the event detail page.

**Tech Stack:** Next.js App Router, Supabase Postgres (RPC), TanStack React Query, Tailwind, TypeScript strict.

## Design Decisions (locked)

| Decision | Chosen |
|---|---|
| Relevance matching | Client-side logic in `lib/for-you.ts` |
| Goal → tag mapping | Defined as constants in `lib/for-you.ts` |
| Section order | Happening now → **For you** → Registered → Everything else |
| Mutual exclusivity | Hero events excluded from "For you"; registered events excluded from "For you" |
| Cohort count query | Supabase RPC `get_cohort_counts` (migration 018) |
| Cohort count display | Optional prop on EventCard, only passed for "For you" events |
| Admin featured_for | Three nullable columns on events; all three must be non-null to activate |
| Admin UI | Panel in event-detail-client.tsx, visible to role=admin only |
| No profile goal/level | "For you" section hidden (returns empty array from deriveSections) |

## Global Constraints

- All user-facing strings in `lib/brand.ts` — no inline strings in components.
- No `any`. `bunx tsc --noEmit` clean before every commit.
- Migrations 001–016 applied and immutable. This adds 017 and 018.
- Branch: `feat/events-v1`. Package manager: Bun.
- Tag slugs (from 016): `beginner`, `interview-prep`, `ai-pm`, `build`, `resume`.
- Goal values (from 015): `break_into_pm`, `grow_as_pm`, `build_products`, `ai_pm`, `interview_prep`.
- Level values (from 015): `aspiring`, `early`, `mid`, `senior`.

---

## File Map

| File | Action | What changes |
|---|---|---|
| `supabase/migrations/017_featured_for.sql` | Create | Add `featured_for_goal/level/city` to events |
| `supabase/migrations/018_cohort_counts_rpc.sql` | Create | `get_cohort_counts` RPC |
| `lib/types.ts` | Modify | Add `featured_for_*` fields to `Event` |
| `lib/for-you.ts` | Create | `isForYou` logic + goal/level→tag mapping constants |
| `lib/for-you.test.ts` | Create | Unit tests for `isForYou` |
| `lib/brand.ts` | Modify | Add `forYou` section copy |
| `hooks/use-cohort-counts.ts` | Create | React Query hook wrapping the RPC |
| `hooks/use-feature-event.ts` | Create | Mutation hook to set featured_for fields |
| `components/events/event-card.tsx` | Modify | Accept optional `cohortCount` prop |
| `app/(app)/page.tsx` | Modify | Load profile, extend deriveSections, render "For you" section with cohort counts |
| `app/(app)/e/[id]/event-detail-client.tsx` | Modify | Import and render `FeaturedForPanel` for admins |
| `components/admin/featured-for-panel.tsx` | Create | Admin UI to set featured_for fields |

---

### Task 1: Migrations + types

**Files:**
- Create: `supabase/migrations/017_featured_for.sql`
- Create: `supabase/migrations/018_cohort_counts_rpc.sql`
- Modify: `lib/types.ts`

**Interfaces:**
- Produces: `featured_for_goal: ProfileGoal | null`, `featured_for_level: ProfileLevel | null`, `featured_for_city: string | null` on `Event` type

- [ ] **Step 1: Write migration 017**

```sql
-- 017_featured_for.sql
-- Adds admin hand-pick targeting to events.
-- All three columns must be non-null for the feature to activate.

alter table public.events
  add column featured_for_goal  text check (featured_for_goal in (
    'break_into_pm', 'grow_as_pm', 'build_products', 'ai_pm', 'interview_prep'
  )),
  add column featured_for_level text check (featured_for_level in (
    'aspiring', 'early', 'mid', 'senior'
  )),
  add column featured_for_city  text;
```

Save to `supabase/migrations/017_featured_for.sql`.

- [ ] **Step 2: Write migration 018**

```sql
-- 018_cohort_counts_rpc.sql
-- Returns per-event count of confirmed registrants whose profile matches
-- the caller's goal, level, and city. Used for "N from your cohort" display.

create or replace function public.get_cohort_counts(
  p_event_ids uuid[],
  p_goal      text,
  p_level     text,
  p_city      text
)
returns table(event_id uuid, cohort_count bigint)
language sql
security definer
set search_path = ''
as $$
  select r.event_id, count(*)::bigint as cohort_count
  from public.registrations r
  join public.profiles p on p.id = r.user_id
  where r.event_id = any(p_event_ids)
    and r.status = 'confirmed'
    and p.goal  = p_goal
    and p.level = p_level
    and p.city  = p_city
  group by r.event_id;
$$;
```

Save to `supabase/migrations/018_cohort_counts_rpc.sql`.

- [ ] **Step 3: Update `lib/types.ts`**

Add after the `tag: EventTag | null;` line in `Event`:

```typescript
  featured_for_goal:  ProfileGoal | null;
  featured_for_level: ProfileLevel | null;
  featured_for_city:  string | null;
```

Also update the import at the top of the file — `ProfileGoal` and `ProfileLevel` are already exported from `lib/types.ts` itself (they were added for migration 015), so no new import needed.

- [ ] **Step 4: Type-check**

```bash
cd rethink-events && bunx tsc --noEmit
```

Expected: no errors. The `select("*")` calls in `use-events.ts` and `use-event.ts` will automatically include the new columns once the migration runs.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/017_featured_for.sql supabase/migrations/018_cohort_counts_rpc.sql lib/types.ts
git commit -m "feat: add featured_for columns and get_cohort_counts RPC"
```

---

### Task 2: `lib/for-you.ts` — relevance matching + tests

**Files:**
- Create: `lib/for-you.ts`
- Create: `lib/for-you.test.ts`

**Interfaces:**
- Consumes: `Event`, `Profile`, `EventTag`, `ProfileGoal`, `ProfileLevel` from `lib/types.ts`
- Produces: `isForYou(event, profile): boolean` — consumed by `deriveSections` in `page.tsx`

- [ ] **Step 1: Write the failing tests**

Create `lib/for-you.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { isForYou } from "@/lib/for-you";
import type { Event, Profile } from "@/lib/types";

type MinEvent = Pick<Event, "tag" | "featured_for_goal" | "featured_for_level" | "featured_for_city">;
type MinProfile = Pick<Profile, "goal" | "level" | "city">;

const noFeatured: MinEvent = {
  tag: null,
  featured_for_goal: null,
  featured_for_level: null,
  featured_for_city: null,
};

const profile: MinProfile = {
  goal: "ai_pm",
  level: "mid",
  city: "Bangalore",
};

describe("isForYou — tag matching", () => {
  it("returns true when event tag matches goal tags", () => {
    expect(isForYou({ ...noFeatured, tag: "ai-pm" }, profile)).toBe(true);
  });

  it("returns true when event tag matches level tags", () => {
    // mid level → ['build', 'ai-pm']
    expect(isForYou({ ...noFeatured, tag: "build" }, profile)).toBe(true);
  });

  it("returns false when event tag does not match goal or level", () => {
    expect(isForYou({ ...noFeatured, tag: "beginner" }, profile)).toBe(false);
  });

  it("returns false when event has no tag and no featured_for", () => {
    expect(isForYou(noFeatured, profile)).toBe(false);
  });
});

describe("isForYou — admin featured match", () => {
  const featured: MinEvent = {
    tag: null,
    featured_for_goal: "ai_pm",
    featured_for_level: "mid",
    featured_for_city: "Bangalore",
  };

  it("returns true when all three featured_for fields match profile", () => {
    expect(isForYou(featured, profile)).toBe(true);
  });

  it("returns false when featured_for_goal does not match", () => {
    expect(isForYou({ ...featured, featured_for_goal: "interview_prep" }, profile)).toBe(false);
  });

  it("returns false when featured_for_city does not match", () => {
    expect(isForYou({ ...featured, featured_for_city: "Mumbai" }, profile)).toBe(false);
  });

  it("returns false when only some featured_for fields are set (partial activation)", () => {
    expect(isForYou({ ...featured, featured_for_city: null }, profile)).toBe(false);
  });
});

describe("isForYou — null profile fields", () => {
  it("returns false when profile.goal is null", () => {
    expect(isForYou({ ...noFeatured, tag: "ai-pm" }, { ...profile, goal: null })).toBe(false);
  });

  it("returns false when profile.level is null", () => {
    expect(isForYou({ ...noFeatured, tag: "ai-pm" }, { ...profile, level: null })).toBe(false);
  });
});

describe("isForYou — break_into_pm goal (multi-tag)", () => {
  const breakInProfile: MinProfile = { goal: "break_into_pm", level: "aspiring", city: "Pune" };

  it("matches beginner tag", () => {
    expect(isForYou({ ...noFeatured, tag: "beginner" }, breakInProfile)).toBe(true);
  });

  it("matches resume tag", () => {
    expect(isForYou({ ...noFeatured, tag: "resume" }, breakInProfile)).toBe(true);
  });

  it("matches interview-prep tag", () => {
    expect(isForYou({ ...noFeatured, tag: "interview-prep" }, breakInProfile)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun run test lib/for-you.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/for-you'`

- [ ] **Step 3: Implement `lib/for-you.ts`**

```typescript
import type { Event, EventTag, Profile, ProfileGoal, ProfileLevel } from "@/lib/types";

const GOAL_TAGS: Record<ProfileGoal, EventTag[]> = {
  break_into_pm:  ["beginner", "resume", "interview-prep"],
  grow_as_pm:     ["build", "ai-pm"],
  build_products: ["build"],
  ai_pm:          ["ai-pm"],
  interview_prep: ["interview-prep"],
};

const LEVEL_TAGS: Record<ProfileLevel, EventTag[]> = {
  aspiring: ["beginner"],
  early:    ["beginner", "interview-prep"],
  mid:      ["build", "ai-pm"],
  senior:   ["build", "ai-pm"],
};

export function isForYou(
  event: Pick<Event, "tag" | "featured_for_goal" | "featured_for_level" | "featured_for_city">,
  profile: Pick<Profile, "goal" | "level" | "city">
): boolean {
  if (!profile.goal || !profile.level) return false;

  // Tag match: union of goal tags and level tags
  if (event.tag) {
    const matching = new Set<string>([
      ...(GOAL_TAGS[profile.goal] ?? []),
      ...(LEVEL_TAGS[profile.level] ?? []),
    ]);
    if (matching.has(event.tag)) return true;
  }

  // Admin featured match: all three must be non-null and match exactly
  if (
    event.featured_for_goal &&
    event.featured_for_level &&
    event.featured_for_city
  ) {
    return (
      event.featured_for_goal  === profile.goal &&
      event.featured_for_level === profile.level &&
      event.featured_for_city  === (profile.city ?? "")
    );
  }

  return false;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun run test lib/for-you.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Run full test suite**

```bash
bun run test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/for-you.ts lib/for-you.test.ts
git commit -m "feat: add isForYou relevance matching with goal/level→tag mapping"
```

---

### Task 3: Cohort count hook + brand copy

**Files:**
- Create: `hooks/use-cohort-counts.ts`
- Modify: `lib/brand.ts`

**Interfaces:**
- Consumes: `get_cohort_counts` RPC from migration 018
- Produces: `useCohortCounts(eventIds, profile)` → `Record<string, number>` (event_id → count), consumed by `page.tsx`

- [ ] **Step 1: Add "For you" brand copy to `lib/brand.ts`**

Add a `forYou` section inside `BRAND`, before the `manifesto` line:

```typescript
  forYou: {
    sectionTitle: "For you",
    cohortBadge: (n: number) => `${n} FROM YOUR COHORT`,
    empty: "NO EVENTS MATCH YOUR PROFILE YET.",
  },
```

- [ ] **Step 2: Create `hooks/use-cohort-counts.ts`**

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ProfileGoal, ProfileLevel } from "@/lib/types";

type CohortProfile = {
  goal: ProfileGoal | null;
  level: ProfileLevel | null;
  city: string | null;
};

export function useCohortCounts(eventIds: string[], profile: CohortProfile) {
  const supabase = createClient();

  return useQuery<Record<string, number>>({
    queryKey: [
      "cohort-counts",
      [...eventIds].sort().join(","),
      profile.goal,
      profile.level,
      profile.city,
    ],
    enabled:
      eventIds.length > 0 &&
      !!profile.goal &&
      !!profile.level &&
      !!profile.city,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_cohort_counts", {
        p_event_ids: eventIds,
        p_goal: profile.goal,
        p_level: profile.level,
        p_city: profile.city,
      });
      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        counts[row.event_id] = Number(row.cohort_count);
      }
      return counts;
    },
  });
}
```

- [ ] **Step 3: Type-check**

```bash
bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add hooks/use-cohort-counts.ts lib/brand.ts
git commit -m "feat: add useCohortCounts hook and forYou brand copy"
```

---

### Task 4: "For you" section in the feed

**Files:**
- Modify: `components/events/event-card.tsx`
- Modify: `app/(app)/page.tsx`

**Interfaces:**
- Consumes: `isForYou` from `lib/for-you.ts`; `useCohortCounts` from `hooks/use-cohort-counts.ts`; `useProfile` from `hooks/use-profile.ts`; `BRAND.forYou` from `lib/brand.ts`

- [ ] **Step 1: Add optional `cohortCount` prop to `EventCard`**

In `components/events/event-card.tsx`, update the props type:

```typescript
type EventCardProps = {
  event: EventWithOrganizer;
  cohortCount?: number;
};
```

Update the function signature:

```typescript
export function EventCard({ event, cohortCount }: EventCardProps) {
```

Add this block inside the title area `<div>`, after the existing tag pill block:

```tsx
          {cohortCount !== undefined && cohortCount > 0 && (
            <p className="mt-1 font-mono text-label-data uppercase font-semibold text-primary">
              {BRAND.forYou.cohortBadge(cohortCount)}
            </p>
          )}
```

- [ ] **Step 2: Update `app/(app)/page.tsx`**

Add imports at the top:

```typescript
import { useProfile } from "@/hooks/use-profile";
import { useCohortCounts } from "@/hooks/use-cohort-counts";
import { isForYou } from "@/lib/for-you";
```

Update `deriveSections` function signature and body (replace the existing function entirely):

```typescript
function deriveSections(
  events: EventWithOrganizer[],
  filters: FeedFilters,
  registeredIds: Set<string>,
  profile: import("@/lib/types").Profile | null | undefined,
  now: Date
) {
  const heroFilters: FeedFilters = { ...filters, when: "all" };
  const heroEligible = events.filter((e) => matchesFilters(e, heroFilters, now));
  const liveEvents = heroEligible.filter((e) => isLive(e, now));
  const soonestUpcoming = heroEligible.find((e) => new Date(e.starts_at) > now);
  const hero =
    liveEvents.length > 0
      ? liveEvents
      : soonestUpcoming
        ? [soonestUpcoming]
        : [];
  const heroIds = new Set(hero.map((e) => e.id));

  const filtered = events.filter((e) => matchesFilters(e, filters, now));

  const forYou = profile
    ? filtered.filter((e) => !heroIds.has(e.id) && isForYou(e, profile))
    : [];
  const forYouIds = new Set(forYou.map((e) => e.id));

  const registered = filtered.filter(
    (e) => registeredIds.has(e.id) && !heroIds.has(e.id) && !forYouIds.has(e.id)
  );
  const everything = filtered.filter(
    (e) => !registeredIds.has(e.id) && !heroIds.has(e.id) && !forYouIds.has(e.id)
  );

  return { hero, forYou, registered, everything };
}
```

In `FeedPage`, add profile loading after the `useRegistrations` call:

```typescript
  const { data: profile } = useProfile(userId);
```

Replace the `deriveSections` call:

```typescript
  const { hero, forYou, registered, everything } = deriveSections(
    events,
    filters,
    registeredIds,
    profile,
    now,
  );
```

Add cohort count hook after the `deriveSections` call:

```typescript
  const forYouEventIds = forYou.map((e) => e.id);
  const { data: cohortCounts } = useCohortCounts(forYouEventIds, {
    goal: profile?.goal ?? null,
    level: profile?.level ?? null,
    city: profile?.city ?? null,
  });
```

In the JSX, add the "For you" `FeedSection` between hero and registered. The "For you" section needs a custom render to pass `cohortCount` per card. Update `FeedSection` usage for the "For you" section — since `FeedSection` renders generic `EventCard`s and doesn't know about cohort counts, pass a custom `renderCard` prop. 

Check the `FeedSection` component signature first:

```bash
cat rethink-events/components/events/feed-section.tsx
```

If `FeedSection` renders `<EventCard event={e} />` directly, add an optional `renderCard` prop:

```typescript
// In FeedSection props:
renderCard?: (event: EventWithOrganizer) => React.ReactNode;
```

And inside FeedSection, use `renderCard(event) ?? <EventCard event={event} />` per event.

Then in page.tsx, render the "For you" section:

```tsx
            <FeedSection
              title={BRAND.forYou.sectionTitle}
              events={forYou}
              emptyLabel={profile?.goal ? BRAND.forYou.empty : ""}
              renderCard={(event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  cohortCount={cohortCounts?.[event.id]}
                />
              )}
            />
```

Place this block between the hero FeedSection and the registered FeedSection.

- [ ] **Step 3: Update `FeedSection` to support `renderCard`**

Read `components/events/feed-section.tsx` first, then add the `renderCard` prop. If `FeedSection` maps events to `<EventCard>`, replace that mapping with:

```typescript
{events.map((event) =>
  renderCard ? renderCard(event) : <EventCard key={event.id} event={event} />
)}
```

- [ ] **Step 4: Type-check**

```bash
bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Run tests**

```bash
bun run test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add components/events/event-card.tsx app/\(app\)/page.tsx components/events/feed-section.tsx
git commit -m "feat: add For You section to feed with cohort count display"
```

---

### Task 5: Admin featured_for panel

**Files:**
- Create: `components/admin/featured-for-panel.tsx`
- Create: `hooks/use-feature-event.ts`
- Modify: `app/(app)/e/[id]/event-detail-client.tsx`

**Interfaces:**
- Consumes: `Event` (with new featured_for fields), `BRAND.profile.goals/levels`, `BRAND.cities`
- Produces: mutation that updates `featured_for_*` columns on the event

- [ ] **Step 1: Create `hooks/use-feature-event.ts`**

```typescript
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ProfileGoal, ProfileLevel } from "@/lib/types";

type FeaturedForInput = {
  featured_for_goal:  ProfileGoal | null;
  featured_for_level: ProfileLevel | null;
  featured_for_city:  string | null;
};

export function useFeatureEvent(eventId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: FeaturedForInput) => {
      const { error } = await supabase
        .from("events")
        .update(input)
        .eq("id", eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidates: ["event", eventId] (detail page re-fetches),
      //              ["events", "feed"] (feed re-evaluates For You row).
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}
```

- [ ] **Step 2: Create `components/admin/featured-for-panel.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useFeatureEvent } from "@/hooks/use-feature-event";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import type { Event, ProfileGoal, ProfileLevel } from "@/lib/types";

type Props = {
  event: Pick<
    Event,
    "id" | "featured_for_goal" | "featured_for_level" | "featured_for_city"
  >;
};

export function FeaturedForPanel({ event }: Props) {
  const [goal, setGoal] = useState<ProfileGoal | "">(event.featured_for_goal ?? "");
  const [level, setLevel] = useState<ProfileLevel | "">(event.featured_for_level ?? "");
  const [city, setCity] = useState(event.featured_for_city ?? "");

  const { mutate, isPending, isSuccess } = useFeatureEvent(event.id);

  const isActive = !!event.featured_for_goal;
  const canSave = goal !== "" && level !== "" && city !== "";

  const selectBase =
    "border-2 border-on-background bg-surface w-full p-3 font-mono text-label-mono uppercase font-semibold focus:border-primary outline-none appearance-none";

  function handleSave() {
    if (!canSave) return;
    mutate({
      featured_for_goal:  goal as ProfileGoal,
      featured_for_level: level as ProfileLevel,
      featured_for_city:  city,
    });
  }

  function handleClear() {
    setGoal("");
    setLevel("");
    setCity("");
    mutate({ featured_for_goal: null, featured_for_level: null, featured_for_city: null });
  }

  return (
    <div className="border-t-4 border-on-background mt-stack-md pt-stack-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-mono text-label-mono uppercase font-semibold text-on-surface-variant">
          FEATURE FOR AUDIENCE
        </h3>
        {isActive && (
          <span className="border border-primary px-2 py-0.5 font-mono text-label-data uppercase font-semibold text-primary">
            ACTIVE
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block font-mono text-label-data uppercase font-semibold text-on-surface-variant mb-2">
            GOAL
          </label>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value as ProfileGoal)}
            className={selectBase}
          >
            <option value="">— None —</option>
            {BRAND.profile.goals.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-mono text-label-data uppercase font-semibold text-on-surface-variant mb-2">
            LEVEL
          </label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as ProfileLevel)}
            className={selectBase}
          >
            <option value="">— None —</option>
            {BRAND.profile.levels.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-mono text-label-data uppercase font-semibold text-on-surface-variant mb-2">
            CITY
          </label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={selectBase}
          >
            <option value="">— None —</option>
            {BRAND.cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={!canSave || isPending}
          className={cn(
            "border-2 border-on-background px-6 py-2 font-mono text-label-mono uppercase font-semibold hard-shadow hard-shadow-hover hard-shadow-active bg-primary text-on-primary",
            (!canSave || isPending) && "opacity-50 pointer-events-none"
          )}
        >
          {isPending ? "SAVING..." : isSuccess ? "SAVED" : "FEATURE EVENT"}
        </button>
        {isActive && (
          <button
            onClick={handleClear}
            disabled={isPending}
            className="border-2 border-on-background px-6 py-2 font-mono text-label-mono uppercase font-semibold bg-surface text-on-surface hard-shadow hard-shadow-hover hard-shadow-active"
          >
            CLEAR
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Import and render `FeaturedForPanel` in `event-detail-client.tsx`**

Add import:

```typescript
import { FeaturedForPanel } from "@/components/admin/featured-for-panel";
```

Find the block where admin-only controls are rendered (after `CancelDialog` or in the host/admin section). Add the panel inside the `isAdmin` guard, after the attendees panel and before the closing tags:

```tsx
            {isAdmin && event && (
              <FeaturedForPanel event={event} />
            )}
```

- [ ] **Step 4: Type-check**

```bash
bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Run tests**

```bash
bun run test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add hooks/use-feature-event.ts components/admin/featured-for-panel.tsx app/\(app\)/e/\[id\]/event-detail-client.tsx
git commit -m "feat: add admin FeaturedForPanel to hand-pick events for audience segments"
```

---

## Spec Coverage Check

- Filter member's goal + level against event tags ✓ Task 2 (`isForYou`, `GOAL_TAGS`, `LEVEL_TAGS`)
- Admin hand-pick via `featured_for {goal, level, city}` ✓ Task 1 (migration 017) + Task 5 (panel)
- Cohort social proof "N from your cohort are going" ✓ Task 1 (migration 018 RPC) + Task 3 (hook) + Task 4 (card badge)
- "For you" section in the feed ✓ Task 4 (deriveSections + FeedSection)
- Collapse if no profile goal/level ✓ Task 4 (`forYou` returns `[]` when profile is null/undefined)

## After all tasks: apply migrations then smoke test

1. Apply migration 017 in Supabase SQL editor.
2. Apply migration 018 in Supabase SQL editor.
3. `bun run dev`
4. Log in as a user who has goal + level set. Verify "For you" section appears with matching events.
5. Log in as admin. Open an event detail. Verify "FEATURE FOR AUDIENCE" panel appears. Set goal + level + city. Save. Verify event appears in "For you" for a matching user.
6. Verify cohort badge shows count when another user with matching goal+level+city is registered.
7. Log in as a user with NO goal/level. Verify "For you" section is empty/hidden.
