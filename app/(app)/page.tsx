"use client";

import React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useEvents } from "@/hooks/use-events";
import { useRegistrations } from "@/hooks/use-registrations";
import { FilterBar } from "@/components/events/filter-bar";
import { FeedSection } from "@/components/events/feed-section";
import { EmptyState } from "@/components/events/empty-state";
import { matchesFilters, isLive, type FeedFilters } from "@/lib/feed-filters";
import type { EventWithOrganizer } from "@/lib/types";
import { BRAND } from "@/lib/brand";

const DEFAULT_FILTERS: FeedFilters = { city: "all", format: "all", when: "all", tag: "all" };

function SkeletonCard() {
  return (
    <div className="border-4 border-on-background bg-surface-container">
      <div className="aspect-video bg-surface-dim" />
      <div className="space-y-2 p-grid-margin">
        <div className="h-4 w-3/4 bg-surface-dim" />
        <div className="h-4 w-1/2 bg-surface-dim" />
      </div>
    </div>
  );
}

/**
 * Splits the loaded feed into three mutually-exclusive sections.
 * - hero: live events now; if none live, the single soonest upcoming event.
 *   The hero ignores the `when` filter but still respects city/format.
 * - registered: events the user is registered for, passing the full filters.
 * - everything: the rest, passing the full filters.
 * No event appears in more than one section (hero ids are excluded from both).
 */
function deriveSections(
  events: EventWithOrganizer[],
  filters: FeedFilters,
  registeredIds: Set<string>,
  now: Date
) {
  // Hero ignores `when` but honours city/format.
  const heroFilters: FeedFilters = { ...filters, when: "all" };
  const heroEligible = events.filter((e) => matchesFilters(e, heroFilters, now));

  const liveEvents = heroEligible.filter((e) => isLive(e, now));
  // Events are loaded sorted by starts_at ascending; first upcoming is soonest.
  const soonestUpcoming = heroEligible.find(
    (e) => new Date(e.starts_at) > now
  );

  const hero =
    liveEvents.length > 0
      ? liveEvents
      : soonestUpcoming
        ? [soonestUpcoming]
        : [];
  const heroIds = new Set(hero.map((e) => e.id));

  const filtered = events.filter((e) => matchesFilters(e, filters, now));

  const registered = filtered.filter(
    (e) => registeredIds.has(e.id) && !heroIds.has(e.id)
  );
  const everything = filtered.filter(
    (e) => !registeredIds.has(e.id) && !heroIds.has(e.id)
  );

  return { hero, registered, everything };
}

export default function FeedPage() {
  const { data: session } = useSession();
  const userId = session?.user.id;

  const [filters, setFilters] = React.useState<FeedFilters>(DEFAULT_FILTERS);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isError,
    refetch,
  } = useEvents({ city: filters.city, format: filters.format, tag: filters.tag });

  const { data: registrations } = useRegistrations(userId);

  const events = data?.pages.flatMap((page) => page) ?? [];

  const now = new Date();
  const registeredIds = new Set(
    (registrations ?? []).map((r) => r.event_id)
  );

  const cities = [
    ...new Set(events.map((e) => e.city).filter((c): c is string => Boolean(c))),
  ];

  const { hero, registered, everything } = deriveSections(
    events,
    filters,
    registeredIds,
    now
  );

  return (
    <div className="dot-grid min-h-[80vh]">
      <div className="mx-auto max-w-[1600px] px-grid-margin py-stack-xl">
        {/* Heading */}
        <div className="mb-stack-lg border-b-4 border-on-background pb-stack-md">
          <h1 className="font-serif text-headline-md font-bold uppercase md:text-display-lg">
            {BRAND.feed.upcoming}
          </h1>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-x-grid-gutter gap-y-stack-lg md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="flex flex-col items-center justify-center py-stack-xl">
            <p className="mb-stack-md font-mono text-body-lg font-semibold uppercase text-on-surface-variant">
              {BRAND.errors.loadFailed}
            </p>
            <button
              onClick={() => refetch()}
              className="border-2 border-on-background bg-surface px-6 py-3 font-mono text-label-mono uppercase font-semibold hard-shadow hard-shadow-hover hard-shadow-active"
            >
              RETRY
            </button>
          </div>
        )}

        {/* Empty state (no events at all) */}
        {!isLoading && !isError && events.length === 0 && (
          <EmptyState
            message={BRAND.empty.feed}
            actionLabel="ORGANISE"
            actionHref="/organise"
          />
        )}

        {/* Three-section feed */}
        {!isLoading && !isError && events.length > 0 && (
          <>
            <FilterBar value={filters} cities={cities} onChange={setFilters} />

            <FeedSection
              title="Happening now"
              events={hero}
              emptyLabel="NOTHING LIVE OR COMING UP."
            />
            <FeedSection
              title="You're registered"
              events={registered}
              emptyLabel={
                registeredIds.size === 0
                  ? "YOU HAVEN'T REGISTERED FOR ANYTHING YET."
                  : "NO REGISTERED EVENTS MATCH THESE FILTERS."
              }
            />
            <FeedSection
              title="Everything else"
              events={everything}
              emptyLabel="NO EVENTS MATCH THESE FILTERS."
            />

            {/* Load more */}
            {hasNextPage && (
              <div className="mt-stack-xl flex justify-center">
                <button
                  onClick={() => fetchNextPage()}
                  className="border-2 border-on-background bg-surface px-8 py-3 font-mono text-label-mono uppercase font-semibold hard-shadow hard-shadow-hover hard-shadow-active"
                >
                  LOAD MORE
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating action button */}
      {session && (
        <Link
          href="/organise"
          className="fixed bottom-24 right-grid-margin z-40 flex aspect-square w-28 flex-col items-center justify-center border-4 border-on-background bg-primary font-mono text-label-mono uppercase text-surface hard-shadow hard-shadow-hover hard-shadow-active md:bottom-stack-lg"
        >
          <Plus className="mb-1 h-6 w-6" strokeWidth={3} />
          ORGANISE
        </Link>
      )}
    </div>
  );
}
