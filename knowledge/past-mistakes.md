# Past Mistakes — ReThink Events

Purpose: append-only record of what failed, got reverted, or surprised us.
Abstract the class, not the instance; future sessions read this at BOOT.
Format: `## YYYY-MM-DD · <title>` then What happened, Why it happened
(root cause), Class of mistake, What we do instead.

## 2026-07-12 · V1 was documented "code-complete" but has no working auth

What happened: CLAUDE.md and the plan's Task 10 smoke test assumed a working
signup/login flow. Executing Phase 4 revealed V1 has no auth at all: no
signInWithOtp/verifyOtp, no /login route, no callback; /auth is a Phase 1 static
stub; the middleware protects routes and redirects to that dead-end. The app
cannot be signed into via UI. Separately, main did not build (a stale duplicate
/admin route), which the "baseline suite green" gate never caught.
Why it happened: foundation state was trusted from docs, not proven end to end.
The foundation gate verified "migrations applied + tests pass" but not "the app
builds" or "a user can actually complete the core loop". The integration suite
also couldn't run at all without DB keys that weren't on the machine, so the
build break hid until the first Task 1 build.
Class of mistake: verifying a proxy for the foundation (tests pass) instead of
the foundation itself (app builds; primary user journey works). Same family as
the stale-branch and invented-identifier entries below: acting on claims, not
observed live state.
What we do instead: a foundation gate must include `npm run build` AND one real
end-to-end pass of the core loop — or an explicit, logged "this loop has no UI
path yet (e.g. no auth)". "Code-complete" is a claim to verify, never a fact to
inherit.

## 2026-07-07 · Three PRs built on a stale base became unmergeable

What happened: slices 3.4/3.6/3.9 were developed on branches cut from a
pre-Phase-1 main. Meanwhile the repo owner merged Phase 1 + slices 3.3/3.5,
which re-implemented overlapping files (event page, ticket, layout, service
client). By review time, PRs #8/#9/#10 could not be merged, only ported.
Why it happened: work proceeded from a remembered picture of main instead of
re-fetching and rebasing as main moved; nobody rebased across three weeks.
Class of mistake: acting on remembered state instead of verifying live state.
What we do instead: fetch and diff against origin/main before building on any
branch, and rebase long-lived branches every session they are touched.

## 2026-07-07 · Cited a DB function by an invented name

What happened: the Phase 4 spec referenced a self-elevation guard as
`protect_trust_admin_flags`; the real function is `protect_profile_flags`.
Caught during plan-writing verification, before any executor inherited it.
Why it happened: named from memory of what the function does instead of
grepping the migration that defines it.
Class of mistake: inventing identifiers instead of checking the source
(same family as assuming column names; see host_user_id vs host_id in
slice 3.6, fixed in commit 3a3ef45).
What we do instead: every identifier in a spec or plan is copy-pasted from
code, never typed from memory. "Never invent library APIs or assume column
names" extends to our own schema.
