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

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const { city: cityParam } = await searchParams;
  const activeCity = CITY_VALUES.includes(cityParam as (typeof CITY_VALUES)[number])
    ? (cityParam as string)
    : null;

  const supabase = await createClient();

  // Published events, city-filtered if set
  let q = supabase
    .from("events")
    .select("id, title, city, venue, starts_at, ends_at, capacity, tags, host_name, featured_for")
    .eq("state", "published")
    .order("starts_at");
  if (activeCity) q = q.eq("city", activeCity);

  const { data: rawEvents } = await q;
  const safeEvents = rawEvents ?? [];

  // Going counts: single query, aggregate in JS
  const ids = safeEvents.map((e) => e.id);
  const goingMap = new Map<string, number>();
  if (ids.length > 0) {
    const { data: goingRows } = await supabase
      .from("rsvps")
      .select("event_id")
      .in("event_id", ids)
      .eq("status", "going");
    for (const row of goingRows ?? []) {
      goingMap.set(row.event_id, (goingMap.get(row.event_id) ?? 0) + 1);
    }
  }

  // Current user's profile + RSVP set
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { goal: string | null; city: string | null } | null = null;
  const myGoingIds = new Set<string>();

  if (user && ids.length > 0) {
    const [{ data: prof }, { data: myRsvps }] = await Promise.all([
      supabase.from("profiles").select("goal, city").eq("id", user.id).single(),
      supabase
        .from("rsvps")
        .select("event_id")
        .in("event_id", ids)
        .eq("user_id", user.id)
        .eq("status", "going"),
    ]);
    profile = prof;
    for (const r of myRsvps ?? []) myGoingIds.add(r.event_id);
  } else if (user) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("goal, city")
      .eq("id", user.id)
      .single();
    profile = prof;
  }

  const now = new Date();
  const events: FeedEvent[] = safeEvents.map((e) => ({
    ...e,
    going_count: goingMap.get(e.id) ?? 0,
  }));

  const happeningNow = events.filter(
    (e) => new Date(e.starts_at) <= now && new Date(e.ends_at) > now
  );

  const forYou =
    profile?.goal || profile?.city
      ? events.filter(
          (e) =>
            e.featured_for &&
            (e.featured_for.goal === profile!.goal ||
              e.featured_for.city === profile!.city)
        )
      : [];

  const upcoming = events.filter((e) => new Date(e.starts_at) > now);

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

        {/* For You — only for logged-in users with goal/city set */}
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
              {BRAND.empty.feed}{" "}
              <Link
                href="/organise"
                className="underline underline-offset-4 hover:text-primary"
              >
                Host one.
              </Link>
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
