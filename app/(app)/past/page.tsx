"use client";

// Past events archive — reverse-chronological list of ended approved events.
// Query key: ["events", "past", {cursor}]
// Cursor: ends_at descending.
// Page size: 20.

import React from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { EventCard } from "@/components/events/event-card";
import type { EventWithOrganizer } from "@/lib/types";

const PAGE_SIZE = 20;

function usePastEvents() {
  const supabase = createClient();

  return useInfiniteQuery<EventWithOrganizer[]>({
    // Canonical key from plan §6 query key registry
    queryKey: ["events", "past"],
    queryFn: async ({ pageParam }) => {
      let query = supabase
        .from("events")
        .select("*, organizer:profiles!created_by(id, full_name, email)")
        .eq("status", "approved")
        .lt("ends_at", new Date().toISOString())
        .order("ends_at", { ascending: false })
        .limit(PAGE_SIZE);

      // Cursor pagination: filter by ends_at < cursor (descending)
      if (pageParam) {
        query = query.lt("ends_at", pageParam as string);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EventWithOrganizer[];
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return lastPage[lastPage.length - 1].ends_at;
    },
  });
}

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

export default function PastEventsPage() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isError,
    refetch,
  } = usePastEvents();

  const events = data?.pages.flatMap((page) => page) ?? [];

  return (
    <div className="dot-grid min-h-[80vh]">
      <div className="mx-auto max-w-[1600px] px-grid-margin py-stack-xl">
        {/* Heading */}
        <div className="mb-stack-lg border-b-4 border-on-background pb-stack-md">
          <h1 className="font-serif text-headline-md font-bold uppercase md:text-display-lg">
            PAST EVENTS
          </h1>
          <p className="mt-stack-sm font-mono text-label-mono uppercase text-on-surface-variant">
            THE ARCHIVE
          </p>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-x-grid-gutter gap-y-stack-lg md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="flex flex-col items-center justify-center py-stack-xl">
            <p className="mb-stack-md font-mono text-body-lg font-semibold uppercase text-on-surface-variant">
              COULD NOT LOAD THE ARCHIVE. TRY AGAIN.
            </p>
            <button
              onClick={() => refetch()}
              className="border-2 border-on-background bg-surface px-6 py-3 font-mono text-label-mono uppercase font-semibold hard-shadow hard-shadow-hover hard-shadow-active"
            >
              RETRY
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && events.length === 0 && (
          <div className="border-4 border-on-background bg-surface-container p-stack-xl text-center hard-shadow">
            <p className="font-mono text-body-lg font-semibold uppercase text-on-surface-variant">
              NOTHING IN THE ARCHIVE YET.
            </p>
            <p className="mt-stack-sm font-mono text-label-mono uppercase text-on-surface-variant">
              THE FIRST EVENT BECOMES HISTORY HERE.
            </p>
          </div>
        )}

        {/* Event grid — grayscale by default (EventCard already applies this) */}
        {!isLoading && !isError && events.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-x-grid-gutter gap-y-stack-lg md:grid-cols-2 xl:grid-cols-4">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>

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
    </div>
  );
}
