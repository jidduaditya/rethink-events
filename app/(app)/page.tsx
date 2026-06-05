"use client";

import React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useEvents } from "@/hooks/use-events";
import { EventCard } from "@/components/events/event-card";
import { EmptyState } from "@/components/events/empty-state";
import { BRAND } from "@/lib/brand";

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

export default function FeedPage() {
  const { data: session } = useSession();
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isError,
    refetch,
  } = useEvents();

  const events = data?.pages.flatMap((page) => page) ?? [];

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

        {/* Empty state */}
        {!isLoading && !isError && events.length === 0 && (
          <EmptyState
            message={BRAND.empty.feed}
            actionLabel="ORGANISE"
            actionHref="/organise"
          />
        )}

        {/* Event grid */}
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
