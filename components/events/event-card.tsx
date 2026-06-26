"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatEventTime } from "@/lib/utils";
import { isLive } from "@/lib/feed-filters";
import { BRAND } from "@/lib/brand";
import type { EventWithOrganizer } from "@/lib/types";

type EventCardProps = {
  event: EventWithOrganizer;
};

export function EventCard({ event }: EventCardProps) {
  const start = formatEventTime(event.starts_at, event.timezone);
  const location =
    event.event_type === "online"
      ? "ONLINE"
      : event.location_name?.toUpperCase() ?? "TBD";

  const now = new Date();
  const live = isLive(event, now);

  const registrationCount = event.registrations?.length ?? 0;
  const full =
    event.capacity != null &&
    registrationCount >= event.capacity &&
    !live; // live events keep the LIVE badge; FULL is for upcoming

  return (
    <Link href={`/e/${event.id}`} className="group relative block">
      {/* Hard shadow offset div */}
      <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 bg-on-background" />

      {/* Content */}
      <div className="relative border-4 border-on-background bg-surface transition-transform group-hover:-translate-x-px group-hover:-translate-y-px">
        {/* Image + state badge */}
        <div className="relative aspect-video overflow-hidden bg-surface-dim">
          <div className="h-full w-full bg-surface-dim grayscale group-hover:grayscale-0 transition-all duration-500" />

          {/* State badge — top-left, max one per card */}
          {live && (
            <span className="absolute left-0 top-0 flex items-center gap-1.5 bg-tertiary px-3 py-1 font-mono text-label-data uppercase font-semibold text-on-tertiary">
              <span
                className="h-2 w-2 rounded-full bg-on-tertiary motion-safe:animate-pulse"
                aria-hidden="true"
              />
              {BRAND.lifecycle.live}
            </span>
          )}
          {!live && full && (
            <span className="absolute left-0 top-0 bg-secondary-container px-3 py-1 font-mono text-label-data uppercase font-semibold text-on-secondary-container">
              {BRAND.lifecycle.full}
            </span>
          )}
        </div>

        {/* Metadata row */}
        <div className="flex items-center justify-between border-t-2 border-on-background px-grid-margin py-2">
          <span className="font-mono text-label-data uppercase font-semibold text-on-surface-variant">
            {start.date} / {start.time}
          </span>
          <span className="font-mono text-label-data uppercase font-semibold text-on-surface-variant">
            {location}
          </span>
        </div>

        {/* Title area */}
        <div
          className={cn(
            "px-grid-margin py-3 transition-colors duration-200 group-hover:bg-secondary-fixed",
            full && "opacity-60"
          )}
        >
          <h3 className="text-body-lg font-bold uppercase text-on-surface">
            {event.title}
          </h3>
          {event.tag && (
            <span className="mt-1 inline-block border border-on-background px-2 py-0.5 font-mono text-label-data uppercase font-semibold text-on-surface-variant">
              {BRAND.tags.options.find((t) => t.value === event.tag)?.label}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
