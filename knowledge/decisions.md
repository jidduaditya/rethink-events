# Decisions — ReThink Events

Purpose: every non-trivial choice, dated, with the why and what was rejected,
so no future session re-litigates or silently reverses one.
Format: `## YYYY-MM-DD · <decision>` then Why, Rejected, Implication.

## 2026-07-07 · Phase 4 is an evolution of this repo, not a rebuild

Why: rebuild challenge (gate 2) found nothing that cannot be evolved in
place; schema, RLS, and all five slices support the community-app direction.
Rejected: fresh repo/folder ("Rethink Community App" as a new build).
Implication: one codebase; the two-sibling-folders pattern from past projects
ends here.

## 2026-07-07 · Whitelist gates HOSTING only; attendance stays open

Why: Aditya's call during grill — anyone can view, share, and RSVP (signed
in); only the create flow is whitelist-gated. Being whitelisted IS the trust
decision: instant publish, no first-event review.
Rejected: members-only gate on the whole app; approval-on-signup; invite
codes; keeping first-event review for whitelisted hosts.
Implication: public event pages and the OG growth surface stay live, dormant.

## 2026-07-07 · The whitelist is the ONLY write path for is_trusted

Why: two write paths drift. The slice 3.2 manual trust toggle and the
first-event-approval trust flip both competed with the list; a person could
become trusted with no whitelist row, unrevocable through the admin UI.
Rejected: keeping the manual toggle alongside the list; app-layer grant/
revoke (half-failure drift) — grant/revoke are DB triggers on host_whitelist.
Implication: setTrust action deleted; events_flip_trust trigger dropped in
0006; admins must whitelist their own email to host. Class of design rule:
when a new mechanism decides something an old one also decides, name the
loser in writing.

## 2026-07-07 · Migration 0006 resets all is_trusted to false

Why: pre-launch, "the list is exactly who can host" must hold from day one;
grandfathered seed/test trust flips would be invisible to the admin UI.
Rejected: backfilling the whitelist from currently-trusted profiles.
Implication: after 0006 applies, every real host must be added via /admin.

## 2026-07-07 · Open PRs #8/#9/#10 are PORTED onto main, not merged

Why: all three branches were cut from a pre-Phase-1 main and re-add files
main already has (event page, ticket, layout, service client); a GitHub
merge is a wall of add/add conflicts with no mechanical resolution. Port =
`git checkout <branch> -- <unique files>` + three small hand-applied diffs,
landed as one stabilize PR; #8/#9/#10 closed as superseded.
Rejected: sequential rebase-and-merge (spec's original line, amended
2026-07-07 with Aditya's approval).
Implication: PR #8's ICS route needed a Next 16 params fix during port;
class of mistake recorded in past-mistakes.md.
