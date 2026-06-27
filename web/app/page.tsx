import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { EventCard } from "@/components/ui/event-card";
import { BRAND } from "@/lib/brand";
import {
  MOCK_EVENTS,
  MOCK_FEATURED,
  MOCK_ME,
  MOCK_MY_RSVPS,
} from "@/lib/mock";

// ponytail: Phase 1 — mock data only. Real curated feed + for-you logic lands in slice 3.5.

const NOW = new Date("2026-06-27T10:00:00Z");

const happeningNow = MOCK_EVENTS.filter(
  (e) =>
    e.state === "published" &&
    new Date(e.starts_at) <= NOW &&
    new Date(e.ends_at) > NOW
);

const upcoming = MOCK_EVENTS.filter(
  (e) => e.state === "published" && new Date(e.starts_at) > NOW
).sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

// "For you" = featured events matching user's goal or city (mock logic only)
const forYou = MOCK_FEATURED.filter(
  (e) =>
    e.state === "published" &&
    (e.featured_for?.goal === MOCK_ME.goal || e.featured_for?.city === MOCK_ME.city)
);

const myRsvpIds = new Set(MOCK_MY_RSVPS.filter((r) => r.status === "going").map((r) => r.event_id));

export default function FeedPage() {
  return (
    <AppShell>
      {/* ── Hero strip ─────────────────────────────────────────────────── */}
      <section className="border-b-4 border-on-background bg-secondary-container px-grid-margin py-stack-xl">
        <h1 className="font-serif text-display-lg font-black uppercase leading-none tracking-tight">
          {BRAND.hero.heading}
        </h1>
        <p className="mt-stack-sm font-mono text-label-mono uppercase text-on-surface-variant">
          {BRAND.tagline}
        </p>
      </section>

      {/* ── City filter tabs ────────────────────────────────────────────── */}
      <section className="sticky top-20 z-40 flex gap-0 border-b-4 border-on-background bg-background">
        {["ALL", ...BRAND.cities.map((c) => c.toUpperCase())].map((city) => (
          <button
            key={city}
            className="border-r-4 border-on-background px-6 py-3 font-mono text-label-mono font-semibold uppercase transition-colors first:border-l-0 last:border-r-0 hover:bg-secondary-container data-[active]:bg-primary data-[active]:text-on-primary"
            data-active={city === "ALL" ? "" : undefined}
          >
            {city}
          </button>
        ))}
      </section>

      <div className="px-grid-margin">
        {/* ── Happening Now ───────────────────────────────────────────────── */}
        {happeningNow.length > 0 && (
          <section className="mt-stack-xl">
            <SectionHeader label={BRAND.feed.happeningNow} />
            <div className="mt-stack-lg grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {happeningNow.map((e) => (
                <EventCard key={e.id} event={e} going={myRsvpIds.has(e.id)} />
              ))}
            </div>
          </section>
        )}

        {/* ── For You ─────────────────────────────────────────────────────── */}
        {forYou.length > 0 && (
          <section className="mt-stack-xl">
            <SectionHeader label="FOR YOU" />
            <p className="mt-1 font-mono text-label-data uppercase text-on-surface-variant">
              Based on your goal: {MOCK_ME.goal?.replace(/_/g, " ")}
            </p>
            <div className="mt-stack-lg grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {forYou.map((e) => (
                <EventCard key={e.id} event={e} going={myRsvpIds.has(e.id)} />
              ))}
            </div>
          </section>
        )}

        {/* ── Upcoming ────────────────────────────────────────────────────── */}
        <section className="mt-stack-xl pb-stack-xl">
          <SectionHeader label={BRAND.feed.upcoming} />
          {upcoming.length === 0 ? (
            <EmptyState>
              {BRAND.empty.feed}{" "}
              <Link href="/organise" className="underline underline-offset-4 hover:text-primary">
                Host one.
              </Link>
            </EmptyState>
          ) : (
            <div className="mt-stack-lg grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((e) => (
                <EventCard key={e.id} event={e} going={myRsvpIds.has(e.id)} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <h2 className="font-mono text-label-mono font-semibold uppercase tracking-widest text-on-surface-variant border-l-4 border-primary pl-3">
      {label}
    </h2>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-stack-lg font-serif text-body-lg text-on-surface-variant">
      {children}
    </p>
  );
}
