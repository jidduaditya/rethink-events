# ReThink Events Final — CLAUDE.md

Facts about this project only. Workflow rules load from AI Projects/CLAUDE.md.

## What this is

The participation layer for the ReThink community (PMs and builders, Indian
launch cities). A whitelisted member can create, publish, fill, and run an
event solo, with no founder in the loop; every event is a shareable public
link. Attendance is open to any signed-in member; hosting is whitelist-gated
(Phase 4). Source-of-truth scope: `ReThink-Events-V1.md`, then
`docs/superpowers/specs/2026-07-07-community-app-phase4-design.md`.

## Stack

Deviations from AI Projects defaults, all deliberate:

- npm, not Bun (repo predates the default; do not migrate mid-flight).
- Reads = React Server Components, writes = Server Actions. NO react-query;
  the layer-2 "React Query for server data" rule does not apply here. Anon
  must be able to view public event pages server-rendered (growth loop).
- Next.js 16 App Router + Supabase (Auth OTP, Postgres + RLS) + Resend +
  vitest + zod v4. Copy strings live in `web/lib/brand.ts` (BRAND dict).
- All access rules are enforced in RLS; app-layer guards only mirror them.
- Design system: Electric Zine tokens in `web/app/globals.css`.

## Status and foundation state

Read by the foundation gate at BOOT. Keep current via /session-end.
Last updated: 2026-07-07.

- Current layer: V1 code-complete. main has Phases 0-2 + slices 3.1-3.5;
  slices 3.4-ICS/3.6/3.9 sit in open PRs #8/#9/#10 (superseded-port strategy
  approved; see plan Task 1-3). Phase 4 spec + plan written, build NOT started.
- Unapplied migrations: UNVERIFIED. Migrations 0001-0005 are assumed applied
  to the hosted Supabase project but this has never been confirmed from this
  machine. Plan Task 0 verifies; nothing builds before it passes. 0006 exists
  only in the plan, not yet written or applied.
- Un-run e2e flows: full V1 browser flow (signup -> RSVP -> ticket -> run ->
  feedback) has never been walked end-to-end. Plan Task 10 Step 2 is that walk.
- Pending production swaps: none pending; production launch (Vercel domain,
  Resend SPF/DKIM, whitelist seeding) is explicitly deferred out of Phase 4.
- Blocking open questions: none for Phase 4 (resolved in the 2026-07-07 grill).
  Deferred, non-blocking: 24h reminder email, feedback granularity revisit.

## Where to find what

| Need | File |
|---|---|
| System map, data model | knowledge/architecture.md |
| Why we chose or rejected things | knowledge/decisions.md |
| Mistakes not to repeat | knowledge/past-mistakes.md |
| What happened each session | knowledge/session-journal.md |
| Approved V1 scope | ReThink-Events-V1.md |
| Phase 4 spec | docs/superpowers/specs/2026-07-07-community-app-phase4-design.md |
| Phase 4 implementation plan (for the executor) | docs/superpowers/plans/2026-07-07-phase-4-community-app.md |
| Team conventions + slice briefs | docs/ONBOARDING-ADITYA.md |
