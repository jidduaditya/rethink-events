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

## 5. What's already done (Phase 0)

`web/` has: the design system + layout + theme provider, Supabase SSR clients
(`web/lib/supabase/*`), the Next 16 `proxy.ts` session refresh, and pure-UI
components (button, app-shell, nav, footer). It builds clean (`npm run build`).
Your old data-coupled components (event-card, event-form, rsvp-button) were NOT
harvested yet — they get rebuilt against the real schema in Phase 1/3.

**Next, before slices can start:** Phase 1 (UI skeleton) and Phase 2 (schema +
RLS + auth + email) must land first — the repo owner is doing those. Phase 2's
schema and `lib/supabase/types.ts` are the shared foundation. Don't start your
slices until Phase 2 is merged to `main`.

## 6. Your slices (Phase 3)

These play to your strength (you wrote a clean transactional `create_rsvp`):

- **3.1 — Trusted-host publishing.** Create/edit forms → `events`; the
  initial-state trigger sets published vs pending_review by host trust.
- **3.2 — Admin queue + trust flip + takedown.** Approve = publish + set host
  `is_trusted`; takedown sets `taken_down`.
- **3.4 — RSVP + capacity + ticket + calendar.** Port your `create_rsvp`
  pattern (SECURITY DEFINER + FOR UPDATE + cap check) — **minus** the
  conflict-detection block (that's V2). On success route to the ticket stub;
  add ICS + Google Calendar link.

Each slice has a "Test:" line in the plan; expand it into real tests.

## 7. Workflow (PRs + review)

1. Branch per slice: `git checkout -b slice/3.4-rsvp-ticket`.
2. Build TDD, ponytail-lazy. Keep the **RLS matrix test (plan Task 2.3) green** —
   it's the shared regression gate every PR must pass.
3. **Don't regenerate `web/lib/supabase/types.ts` on a feature branch.** It's a
   shared generated file, frozen after Phase 2. If your slice needs a schema
   change, change the migration + regenerate types in that PR and tell the other
   dev to rebase.
4. Open a PR. We review before merge to `main`.
5. Keep PRs to one slice — easier to review, smaller blast radius.

## 8. Questions to raise (don't guess)

The plan has three open questions that need a team call before they're built:
member `goal`/`level` enum values, online-vs-offline handling, and the
open-signup auth confirmation. If a slice depends on one, flag it, don't assume.

Welcome aboard.
