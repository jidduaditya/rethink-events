# Event Tags Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a single nullable `tag` column to events so hosts can categorise their event (one of 5 options), members can filter the feed by tag, and the tag appears as a pill on event cards.

**Architecture:** `tag` is a single `text` column on `events` with a check constraint (not an array). The event form gets a segmented toggle with a "None" option. The feed filter gets a select dropdown. The event card renders the tag as a pill below the title when set.

**Tech Stack:** Next.js App Router, Supabase Postgres, TanStack React Query, Tailwind, TypeScript strict.

## Design Decisions (locked)

| Decision | Chosen |
|---|---|
| Column type | `text` nullable (not `text[]`) |
| Field name | `tag` (singular) |
| Cardinality | One tag per event max |
| Required? | No — optional |
| Form UI | Segmented toggle + "None" to clear |
| Feed filter UI | Select dropdown (consistent with city) |
| Card display | Pill below title, only when tag is set |
| Query operator | `.eq("tag", value)` |

## Global Constraints

- All user-facing strings live in `lib/brand.ts` — no inline strings in components.
- No `any` types. `bunx tsc --noEmit` must pass clean before every commit.
- Tag slugs: `beginner`, `interview-prep`, `ai-pm`, `build`, `resume` (lowercase, hyphenated).
- Branch: `feat/events-v1`. Migrations 001–015 applied and immutable. This adds migration 016.
- Package manager: Bun.
- Never touch migrations 001–015.

---

## File Map

| File | Action | What changes |
|---|---|---|
| `supabase/migrations/016_event_tags.sql` | Create | Add `tag text` column with check constraint |
| `lib/types.ts` | Modify | Add `EventTag` union type; add `tag: EventTag \| null` to `Event` |
| `lib/brand.ts` | Modify | Add `tags` section with label + option list |
| `components/events/event-form.tsx` | Modify | Add `tag` to `EventFormData`, `PreparedEventData`, `prepareFormData`, segmented toggle UI |
| `components/events/event-card.tsx` | Modify | Render tag pill below title when `event.tag` is set |
| `lib/feed-filters.ts` | Modify | Add `tag` field to `FeedFilters`; add tag check to `matchesFilters` |
| `components/events/filter-bar.tsx` | Modify | Add tag select dropdown |
| `hooks/use-events.ts` | Modify | Accept `tag` filter; add `.eq()` to query; add `tag` to query key |
| `app/(app)/page.tsx` | Modify | Add `tag: "all"` to `DEFAULT_FILTERS`; pass `tag` to `useEvents` |

---

### Task 1: Migration + TypeScript types

**Files:**
- Create: `supabase/migrations/016_event_tags.sql`
- Modify: `lib/types.ts`

**Interfaces:**
- Produces: `EventTag` union type; `tag: EventTag | null` on `Event`

- [ ] **Step 1: Write the migration**

```sql
-- 016_event_tags.sql
-- Adds a single optional tag to events for relevance filtering ("For you" row).

alter table public.events
  add column tag text check (tag in (
    'beginner',
    'interview-prep',
    'ai-pm',
    'build',
    'resume'
  ));
```

Save to `supabase/migrations/016_event_tags.sql`.

- [ ] **Step 2: Update `lib/types.ts`**

Add `EventTag` after the `RegisterMode` line:

```typescript
export type EventTag =
  | "beginner"
  | "interview-prep"
  | "ai-pm"
  | "build"
  | "resume";
```

Add `tag: EventTag | null;` to the `Event` type after the `capacity` field:

```typescript
  capacity: number | null;
  tag: EventTag | null;
  status: EventStatus;
```

- [ ] **Step 3: Type-check**

```bash
cd rethink-events && bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/016_event_tags.sql lib/types.ts
git commit -m "feat: add tag column to events schema and EventTag type"
```

---

### Task 2: Brand copy + event form tag field + event card pill

**Files:**
- Modify: `lib/brand.ts`
- Modify: `components/events/event-form.tsx`
- Modify: `components/events/event-card.tsx`

**Interfaces:**
- Consumes: `EventTag` from `lib/types.ts`
- Produces: `tag: string` in `PreparedEventData` (spread into Supabase insert/update — no hook changes needed)

- [ ] **Step 1: Add tags copy to `lib/brand.ts`**

Add a `tags` section inside `BRAND`, before the `manifesto` line:

```typescript
  tags: {
    label: "TAG (OPTIONAL)",
    none: "None",
    options: [
      { value: "beginner",       label: "Beginner" },
      { value: "interview-prep", label: "Interview Prep" },
      { value: "ai-pm",          label: "AI & PM" },
      { value: "build",          label: "Build" },
      { value: "resume",         label: "Resume" },
    ],
  },
```

- [ ] **Step 2: Add `tag` to `EventFormData` and `PreparedEventData` in `event-form.tsx`**

In `EventFormData`:
```typescript
  tag: string; // "" means no tag selected
```

In `PreparedEventData`:
```typescript
  tag: string | null;
```

- [ ] **Step 3: Update `prepareFormData`**

```typescript
    tag: form.tag.trim() || null,
```

- [ ] **Step 4: Update `useState` initialiser**

```typescript
    tag: event?.tag ?? "",
```

- [ ] **Step 5: Add segmented toggle UI to the form**

Add this block after the City + Image URL section, before the Event Format toggle:

```tsx
      {/* Tag */}
      <div className="mb-6">
        <label className="block font-mono text-label-mono uppercase font-semibold text-on-surface-variant mb-2">
          {BRAND.tags.label}
        </label>
        <div className="flex flex-wrap gap-0 border-2 border-on-background w-fit">
          <button
            type="button"
            onClick={() => update("tag", "")}
            className={cn(
              "min-h-[44px] px-4 font-mono text-label-mono uppercase font-semibold transition-colors border-r-2 border-on-background",
              form.tag === ""
                ? "bg-on-background text-surface"
                : "bg-surface text-on-surface hover:bg-secondary-fixed"
            )}
          >
            {BRAND.tags.none}
          </button>
          {BRAND.tags.options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update("tag", opt.value)}
              className={cn(
                "min-h-[44px] px-4 font-mono text-label-mono uppercase font-semibold transition-colors border-r-2 border-on-background last:border-r-0",
                form.tag === opt.value
                  ? "bg-primary text-on-primary"
                  : "bg-surface text-on-surface hover:bg-secondary-fixed"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
```

- [ ] **Step 6: Add tag pill to `event-card.tsx`**

Import `BRAND` (already imported). Add the pill inside the title area `<div>`, below the `<h3>`:

```tsx
          {event.tag && (
            <span className="mt-1 inline-block border border-on-background px-2 py-0.5 font-mono text-label-data uppercase font-semibold text-on-surface-variant">
              {BRAND.tags.options.find((t) => t.value === event.tag)?.label}
            </span>
          )}
```

- [ ] **Step 7: Type-check**

```bash
bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add lib/brand.ts components/events/event-form.tsx components/events/event-card.tsx
git commit -m "feat: add tag field to event form and tag pill to event card"
```

---

### Task 3: Feed tag filter — FeedFilters, FilterBar, useEvents, page.tsx

**Files:**
- Modify: `lib/feed-filters.ts`
- Modify: `components/events/filter-bar.tsx`
- Modify: `hooks/use-events.ts`
- Modify: `app/(app)/page.tsx`

**Interfaces:**
- Consumes: `FeedFilters` (shared by FilterBar, page.tsx, matchesFilters)

- [ ] **Step 1: Add `tag` to `FeedFilters` and `matchesFilters` in `lib/feed-filters.ts`**

Replace `FeedFilters`:

```typescript
export type FeedFilters = {
  city: string;
  format: "all" | "online" | "offline";
  when: "all" | "today" | "week";
  tag: "all" | "beginner" | "interview-prep" | "ai-pm" | "build" | "resume";
};
```

Update `matchesFilters` signature and add the tag check after the format check:

```typescript
export function matchesFilters(
  e: Pick<Event, "city" | "event_type" | "starts_at" | "tag">,
  f: FeedFilters,
  now: Date
): boolean {
  if (f.city !== "all" && (e.city ?? "") !== f.city) return false;
  if (f.format !== "all" && e.event_type !== f.format) return false;
  if (f.tag !== "all" && e.tag !== f.tag) return false;
  if (f.when !== "all") {
    const start = new Date(e.starts_at);
    const end = new Date(now);
    if (f.when === "today") end.setHours(23, 59, 59, 999);
    if (f.when === "week") end.setDate(end.getDate() + 7);
    if (start > end) return false;
  }
  return true;
}
```

- [ ] **Step 2: Add tag select to `components/events/filter-bar.tsx`**

Add this import at the top:
```typescript
import { BRAND } from "@/lib/brand";
```

Add the tag select inside `FilterBar` JSX, after the When segmented control:

```tsx
      {/* Tag select */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="filter-tag"
          className="font-mono text-label-data uppercase font-semibold text-on-surface-variant"
        >
          Tag
        </label>
        <select
          id="filter-tag"
          value={value.tag}
          onChange={(e) =>
            onChange({ ...value, tag: e.target.value as FeedFilters["tag"] })
          }
          className="min-h-[44px] border-2 border-on-background bg-surface px-3 font-mono text-label-mono uppercase font-semibold text-on-surface"
        >
          <option value="all">All tags</option>
          {BRAND.tags.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
```

- [ ] **Step 3: Add `tag` filter to `hooks/use-events.ts`**

Update the filter parameter:

```typescript
export function useEvents(filters?: {
  city?: string;
  format?: "all" | "online" | "offline";
  tag?: string;
}) {
```

Add `tag` to the query key:

```typescript
    queryKey: [
      "events",
      "feed",
      filters?.city ?? "all",
      filters?.format ?? "all",
      filters?.tag ?? "all",
    ],
```

Add the tag filter after the format filter block:

```typescript
      if (filters?.tag && filters.tag !== "all") {
        query = query.eq("tag", filters.tag);
      }
```

- [ ] **Step 4: Update `app/(app)/page.tsx`**

Update `DEFAULT_FILTERS`:

```typescript
const DEFAULT_FILTERS: FeedFilters = { city: "all", format: "all", when: "all", tag: "all" };
```

Update the `useEvents` call:

```typescript
  const { data, fetchNextPage, hasNextPage, isLoading, isError, refetch } =
    useEvents({ city: filters.city, format: filters.format, tag: filters.tag });
```

- [ ] **Step 5: Type-check**

```bash
bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/feed-filters.ts components/events/filter-bar.tsx hooks/use-events.ts app/\(app\)/page.tsx
git commit -m "feat: add tag filter to feed — FeedFilters, FilterBar, useEvents"
```

---

## Smoke test (after applying migration 016 in Supabase)

1. `bun run dev`
2. Create event — tag segmented toggle appears, "None" selected by default, selecting a tag highlights it in blue.
3. Save event — tag persists on reload.
4. Event card — tag pill appears below title when tag is set; no pill when tag is None.
5. Feed filter — tag dropdown appears; selecting a tag hides untagged and differently-tagged events.
6. Select "All tags" — all events reappear.
