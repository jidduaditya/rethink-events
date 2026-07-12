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
Last updated: 2026-07-12.

- Repo home: MOVED to github.com/jidduaditya/rethink-events (origin). OrangeAKA
  remote dropped — zero teammate dependency. Branches: main = V1;
  phase-4/community-app = Phase 4 (PR #1, open, awaiting review, NOT merged);
  feat/events-v1 = parked v2; archive/initial-mvp = the old 2-commit MVP.
- Current layer: Phase 4 code-complete on phase-4/community-app. All 10 plan
  tasks done. 118/118 tests green (13 files) against the live DB; build clean.
- Migrations: 0001-0006 APPLIED and VERIFIED on the hosted project
  (lebniekpmnoxughcsiko — Aditya's Supabase, reused for Phase 4 after wiping the
  parked v2). rls.test.ts + whitelist-rls.test.ts green prove them live. Applied
  via supabase db reset/push --db-url (project is not linked to the CLI).
- Un-run e2e flows: V1 has NO working auth (no OTP action, no /login route,
  /auth is a Phase 1 stub). The signup -> RSVP -> ticket -> run -> feedback
  browser walk is therefore NOT possible via UI and was NOT done. Phase 4's
  access rules are verified at the RLS layer by the integration suite instead.
  Wiring real auth is the next foundation task before the app is usable.
- Pending production swaps: none pending; production launch (Vercel domain,
  Resend SPF/DKIM, whitelist seeding) still deferred.
- Blocking open questions: none. Deferred: real auth (OTP login), 24h reminder
  email, feedback granularity, whether knowledge/ + CLAUDE.md merge onto main.

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
