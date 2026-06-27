# ReThink Events — V1 Build Spec

Status: Approved scope. This is the reference document for building V1.
Last updated: 2026-06-22

---

## 1. The problem

ReThink is a learning community for PMs and builders. Participation drops when
visibility disappears: activity is scattered across WhatsApp, LinkedIn, an LMS
nobody opens proactively, and personal calendars. Founder-flown city meetups
(Bangalore, Pune, Delhi, Hyderabad — Nov–Dec 2025) proved demand, but they don't
scale: every event needs a founder to arrange venue, calls, and logistics.

Two failures compound:
- **Information** — members miss events they wanted to attend.
- **Agency** — events don't happen unless a founder makes them happen.

Demand is already proven. V1's job is to scale **supply** (events that happen
without founders) and **visibility** — not to manufacture demand.

## 2. What we're building

The participation layer for the ReThink ecosystem. A trusted community member can
create, publish, fill, and run an event solo, and that event becomes a beautiful
shareable link that pulls new people into the community.

Three bottlenecks, broken in this order:

1. **Agency** (now) — trusted members publish events without a founder.
2. **Visibility** (now) — one place to see what's on, plus shareable public pages.
3. **Relevance** (felt now, computed later) — early members feel "this is for me"
   through curation, not an algorithm.

### The relevance decision (important)

We want early members to find genuine value, so relevance must be felt in V1. But
we are **not** building a match-scoring algorithm yet. At 5–8 events, relevance is
a **curation problem, not a computation problem** — a cold-start algorithm is at
its weakest exactly at launch, when there's no history to learn from. Hand
curation (stated goals + tags + an admin pick + cohort social proof) delivers
better felt relevance at low volume, at a fraction of the build cost.

We build the match score in V2, when hand-curation can no longer keep up. That is
the explicit trigger.

## 3. V1 scope

### Spine — agency + visibility

1. **Auth.** Open registration, email OTP login. Anyone can discover and view a
   public event page; you must be signed in to RSVP or host. No allowlist gate.
   OTP edge cases (resend, expiry, rate-limit) handled by the auth provider.
2. **Trusted-host publishing.** A member proposes an event → their first event is
   admin-reviewed → approval flips them to trusted → all future events publish
   instantly.
   - **Event lifecycle states:** `draft` → `pending_review` → `published` →
     `cancelled` / `taken_down`. Trusted hosts skip `pending_review`. Only
     `published` events appear in the feed and on public pages.
   - **Edit & cancel.** A host can edit or cancel a published event. Cancel emails
     all RSVPs and marks the calendar entry cancelled. Editing time/venue
     re-notifies RSVPs.
   - **Capacity.** Events have an optional hard cap. At cap the event shows `FULL`
     and RSVP is blocked. (Waitlist is deferred; the cap itself is in V1.)
3. **Curated feed.** Three sections — happening now / you're registered /
   everything else — with tag and city filters. Designed for the **low-volume
   case**: at launch with <5 events, collapse empty sections and lead with the
   "For you" row.
4. **Native RSVP** + add-to-calendar (ICS / Google Calendar link).
5. **Host run-view.** Attendee list + manual check-in toggle + **one broadcast
   message per event** (this replaces the WhatsApp group — one-way, not chat).
6. **24h reminder email** to confirmed attendees.
7. **Admin.** Approval queue, trust toggle, take-down.

### Relevance by curation — no algorithm

8. Member states **goal + level** at signup (two dropdowns).
9. Event **tags** (beginner / interview-prep / AI-PM / build / resume). **City**
   is a separate field, a fixed enum of the launch cities (Bangalore, Pune, Delhi,
   Hyderabad) — not free text, no city-admin system in V1.
10. **"For you" row**, assembled from three cheap signals:
    - **Filter** the member's goal + level against event tags.
    - **Admin hand-pick:** a per-event `featured_for {goal, level, city}` flag set
      by an admin. This is the entire data model behind "curation" — keep it this
      simple.
    - **Cohort social proof:** "N from your cohort are going," where **cohort =
      members matching your goal + level + city.**

### Growth + delight — the wedge

11. **Public event page** `/e/[id]` + **OG share card** + WhatsApp share. The
    dynamic per-event OG image is a **first-class workstream**, not a footnote —
    it's the growth surface, so it can't be quick-and-dirty.
12. **Ticket stub** — a screenshot-worthy confirmation with calendar + share. No QR
    in V1.
13. **Post-session feedback** — thumbs up / down + an optional one-line text field
    (opens on tap). Feedback is attached to the **event** (not the host) and
    visible **only to admins and that event's host**. No public ratings.

## 4. Explicitly deferred to V2

Not in V1, with the trigger that brings each one in:

| Deferred | Build it when |
|---|---|
| Relevance match score / algorithm | Hand-curation can't keep up with event volume |
| Participation proof / badges / streaks | There's a participation history worth surfacing |
| Host grading rubric (beyond the binary trust flag) | Trust decisions need more than first-event review |
| Structured "Room" formats as enforced taxonomy | Tags prove too loose to organize discovery |
| Waitlist + promotion | An event actually caps out |
| QR check-in | Manual check-in becomes too slow at the door |
| Conflict warnings (overlapping events) | Event density makes clashes common |
| Online/offline meet-URL gating | Online events become a meaningful share of the calendar |
| Payments / paid tickets | We decide to monetize events |
| Threaded / two-way broadcast (chat) | One-way updates prove insufficient |

## 5. Tech notes

- Stack: Next.js App Router + Supabase (Auth, Postgres + RLS, Storage) + a
  transactional email provider + an OG image route. Greenfield — no migrations
  exist yet, so the whole stack starts unvalidated.
- **RLS is the trickiest correctness surface.** Before coding, enumerate the
  **role × state visibility matrix** (anon / member / host / admin × draft /
  pending / published / cancelled / taken_down). "First event reviewed, then
  instant publish" plus who-can-see-what is easy to get subtly wrong.
- **Email deliverability is on the critical path.** Name the provider and set up
  domain auth (SPF/DKIM) early — success is measured partly by reminder open
  rates, and a cold sending domain fails that before the product does.

## 6. Success metrics

- % of published events created by **non-admin members** (agency broken).
- Time from create → live for a trusted host (target: minutes).
- RSVP → attendance conversion (target: >50%) and reminder open rate.
- Anonymous visits to `/e/[id]` and login-from-event conversions (growth loop works).
- At least 2 hosts who want to host again.
- Members report that relevance + host credibility helped them decide.

## 7. Open questions

1. **Feedback granularity.** V1 uses thumbs up/down. Binary is blind to the "it
   was fine" middle, which is a useful early curation signal. Revisit a 3-point
   scale in V1.1 if binary proves too coarse.
2. **Online vs offline.** V1 leans offline-first (city meetups). Decide whether
   online events need any handling in V1 or just live in the description.
3. **Subjective feedback text.** Kept optional in V1. Low stakes either way.

## 8. Before we build — validation play

Run this before writing production code:

- Ask ~30 members what session they could confidently host.
- Pick 5 member-led sessions.
- Curate them onto a single page (a manual page is fine — not the app yet).
- Tag them (beginner / interview-prep / AI-PM / build / resume / city).
- Share hand-picked recommendations with ~10 members.
- Track RSVP, attendance, feedback, and repeat interest.

**Validated if:** at least 8–10 members surface clear session ideas, and RSVP →
attendance clears 50%. This tests the "curate, don't compute" thesis in the real
world and de-risks V1 before a line of app code ships.
