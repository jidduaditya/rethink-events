import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { EventCard, type FeedEvent } from "@/components/ui/event-card";
import { BRAND } from "@/lib/brand";
import { createClient } from "@/lib/supabase/server";

const CITY_ABBR: Record<string, string> = {
  bangalore: "BLR",
  pune: "PNE",
  delhi: "DEL",
  hyderabad: "HYD",
};

const CITY_VALUES = ["bangalore", "pune", "delhi", "hyderabad"] as const;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const { city: cityParam } = await searchParams;
  const activeCity = CITY_VALUES.includes(cityParam as (typeof CITY_VALUES)[number])
    ? (cityParam as string)
    : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Published events, city-filtered if set
  let q = supabase
    .from("events")
    .select("id, title, city, venue, starts_at, ends_at, capacity, tags, host_name, featured_for")
    .eq("state", "published")
    .order("starts_at");
  if (activeCity) q = q.eq("city", activeCity);
  const { data: rawEvents } = await q;
  const published = rawEvents ?? [];

  // Member commitments: own events + going RSVPs (unfiltered by city tab)
  let hosting: typeof published = [];
  const myGoingIds = new Set<string>();
  let profile: { goal: string | null; city: string | null; is_trusted: boolean } | null = null;

  if (user) {
    const [{ data: prof }, { data: myEvents }, { data: myRsvps }] = await Promise.all([
      supabase.from("profiles").select("goal, city, is_trusted").eq("id", user.id).single(),
      supabase
        .from("events")
        .select("id, title, city, venue, starts_at, ends_at, capacity, tags, host_name, featured_for")
        .eq("host_id", user.id)
        .not("state", "in", '("cancelled","taken_down")')
        .gte("ends_at", new Date().toISOString())
        .order("starts_at"),
      supabase
        .from("rsvps")
        .select("event_id")
        .eq("user_id", user.id)
        .eq("status", "going"),
    ]);
    profile = prof;
    hosting = myEvents ?? [];
    for (const r of myRsvps ?? []) myGoingIds.add(r.event_id);
  }

  // Going counts for everything we might render
  const allIds = [...new Set([...published.map((e) => e.id), ...hosting.map((e) => e.id)])];
  const goingMap = new Map<string, number>();
  if (allIds.length > 0) {
    const { data: goingRows } = await supabase
      .from("rsvps")
      .select("event_id")
      .in("event_id", allIds)
      .eq("status", "going");
    for (const row of goingRows ?? []) {
      goingMap.set(row.event_id, (goingMap.get(row.event_id) ?? 0) + 1);
    }
  }

  const withCount = (e: (typeof published)[number]): FeedEvent => ({
    ...e,
    going_count: goingMap.get(e.id) ?? 0,
  });

  const now = new Date();
  const events = published.map(withCount);
  const hostingCards = hosting.map(withCount);
  const hostingIds = new Set(hosting.map((e) => e.id));

  const happeningNow = events.filter(
    (e) => new Date(e.starts_at) <= now && new Date(e.ends_at) > now
  );
  const attending = events.filter(
    (e) => myGoingIds.has(e.id) && new Date(e.ends_at) > now && !hostingIds.has(e.id)
  );
  const forYou =
    profile?.goal || profile?.city
      ? events.filter(
          (e) =>
            e.featured_for &&
            (e.featured_for.goal === profile!.goal ||
              e.featured_for.city === profile!.city) &&
            !hostingIds.has(e.id) &&
            !myGoingIds.has(e.id)
        )
      : [];
  const upcoming = events.filter(
    (e) =>
      new Date(e.starts_at) > now && !hostingIds.has(e.id) && !myGoingIds.has(e.id)
  );

  const hasCommitments = hostingCards.length > 0 || attending.length > 0;

  return (
    <AppShell>
      {/* Hero strip */}
      <section className="border-b-4 border-on-background bg-secondary-container px-grid-margin py-stack-xl">
        <h1 className="font-serif text-display-lg font-black uppercase leading-none tracking-tight">
          {BRAND.hero.heading}
        </h1>
        <p className="mt-stack-sm font-mono text-label-mono uppercase text-on-surface-variant">
          {BRAND.tagline}
        </p>
      </section>

      {/* City filter tabs — server-rendered via ?city= searchParam */}
      <nav className="sticky top-20 z-40 flex border-b-4 border-on-background bg-background">
        {[{ label: "ALL", value: null }, ...CITY_VALUES.map((c) => ({ label: CITY_ABBR[c], value: c }))].map(
          ({ label, value }) => {
            const isActive = value === activeCity;
            const href = value ? `/?city=${value}` : "/";
            return (
              <Link
                key={label}
                href={href}
                className={`border-r-4 border-on-background px-6 py-3 font-mono text-label-mono font-semibold uppercase transition-colors last:border-r-0 ${
                  isActive
                    ? "bg-primary text-on-primary"
                    : "hover:bg-secondary-container"
                }`}
              >
                {label}
              </Link>
            );
          }
        )}
      </nav>

      <div className="px-grid-margin">
        {/* Happening Now */}
        {happeningNow.length > 0 && (
          <section className="mt-stack-xl">
            <SectionHeader label={BRAND.feed.happeningNow} />
            <div className="mt-stack-lg grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {happeningNow.map((e) => (
                <EventCard key={e.id} event={e} going={myGoingIds.has(e.id)} />
              ))}
            </div>
          </section>
        )}

        {/* Hosting — the member's own events, with a manage link */}
        {hostingCards.length > 0 && (
          <section className="mt-stack-xl">
            <SectionHeader label={BRAND.dashboard.hosting} />
            <div className="mt-stack-lg grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {hostingCards.map((e) => (
                <div key={e.id}>
                  <EventCard event={e} going={false} />
                  <Link
                    href={`/organise/${e.id}/run`}
                    className="mt-2 inline-block font-mono text-label-data uppercase underline underline-offset-4 hover:text-primary"
                  >
                    {BRAND.dashboard.manage}
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* You're in — going RSVPs */}
        {attending.length > 0 && (
          <section className="mt-stack-xl">
            <SectionHeader label={BRAND.dashboard.attending} />
            <div className="mt-stack-lg grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {attending.map((e) => (
                <EventCard key={e.id} event={e} going />
              ))}
            </div>
          </section>
        )}

        {/* Signed-in, no commitments: nudge */}
        {user && !hasCommitments && (
          <p className="mt-stack-xl font-serif text-body-lg text-on-surface-variant">
            {BRAND.dashboard.emptyCommitments}
          </p>
        )}

        {/* For You */}
        {forYou.length > 0 && (
          <section className="mt-stack-xl">
            <SectionHeader label="FOR YOU" />
            {profile?.goal && (
              <p className="mt-1 font-mono text-label-data uppercase text-on-surface-variant">
                Based on your goal: {profile.goal.replace(/_/g, " ")}
              </p>
            )}
            <div className="mt-stack-lg grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {forYou.map((e) => (
                <EventCard key={e.id} event={e} going={myGoingIds.has(e.id)} />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming */}
        <section className="mt-stack-xl pb-stack-xl">
          <SectionHeader label={BRAND.feed.upcoming} />
          {upcoming.length === 0 ? (
            <EmptyState>
              {BRAND.empty.feed}
              {profile?.is_trusted && (
                <>
                  {" "}
                  <Link
                    href="/organise"
                    className="underline underline-offset-4 hover:text-primary"
                  >
                    Host one.
                  </Link>
                </>
              )}
            </EmptyState>
          ) : (
            <div className="mt-stack-lg grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((e) => (
                <EventCard key={e.id} event={e} going={myGoingIds.has(e.id)} />
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
    <h2 className="border-l-4 border-primary pl-3 font-mono text-label-mono font-semibold uppercase tracking-widest text-on-surface-variant">
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
