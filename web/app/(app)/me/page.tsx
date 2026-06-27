import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { EventCard } from "@/components/ui/event-card";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { MOCK_ME, MOCK_MY_RSVPS, MOCK_EVENTS } from "@/lib/mock";

// ponytail: Phase 1 — mock data. Real profile + rsvps wired in slice 3.4.

const myEvents = MOCK_EVENTS.filter((e) =>
  MOCK_MY_RSVPS.some((r) => r.event_id === e.id && r.status === "going")
);

const GOAL_LABELS: Record<string, string> = {
  break_into_pm: "BREAKING INTO PM",
  interview_prep: "INTERVIEW PREP",
  level_up: "LEVELLING UP",
  build_with_ai: "BUILDING WITH AI",
  switch_domain: "SWITCHING DOMAIN",
};

const LEVEL_LABELS: Record<string, string> = {
  aspiring: "ASPIRING PM",
  junior: "JUNIOR PM",
  mid: "MID-LEVEL PM",
  senior: "SENIOR PM",
};

export default function MyEventsPage() {
  return (
    <AppShell>
      <div className="px-grid-margin py-stack-xl">
        {/* profile card */}
        <div className="flex flex-col gap-4 border-b-4 border-on-background pb-stack-lg md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-serif text-headline-lg font-black uppercase">
              {MOCK_ME.full_name ?? "ANON"}
            </h1>
            <div className="mt-2 flex flex-wrap gap-2">
              {MOCK_ME.goal && (
                <span className="border-2 border-on-background bg-secondary-container px-3 py-1 font-mono text-label-data font-semibold uppercase text-on-secondary-container">
                  {GOAL_LABELS[MOCK_ME.goal] ?? MOCK_ME.goal}
                </span>
              )}
              {MOCK_ME.level && (
                <span className="border border-outline px-3 py-1 font-mono text-label-data uppercase text-on-surface-variant">
                  {LEVEL_LABELS[MOCK_ME.level] ?? MOCK_ME.level}
                </span>
              )}
              {MOCK_ME.city && (
                <span className="border border-outline px-3 py-1 font-mono text-label-data uppercase text-on-surface-variant">
                  {MOCK_ME.city.toUpperCase()}
                </span>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm">EDIT PROFILE</Button>
        </div>

        {/* my events */}
        <section className="mt-stack-xl">
          <h2 className="font-mono text-label-mono font-semibold uppercase tracking-widest text-on-surface-variant border-l-4 border-primary pl-3">
            MY EVENTS
          </h2>
          {myEvents.length === 0 ? (
            <div className="mt-stack-lg">
              <p className="font-serif text-body-lg text-on-surface-variant">
                {BRAND.empty.myEvents}
              </p>
              <Link href="/" className="mt-stack-lg inline-block">
                <Button variant="secondary">BROWSE EVENTS</Button>
              </Link>
            </div>
          ) : (
            <div className="mt-stack-lg grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {myEvents.map((e) => (
                <EventCard key={e.id} event={e} going />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
