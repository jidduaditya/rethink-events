"use client";

import Link from "next/link";
import type { EventWithOrganizer } from "@/lib/types";
import { formatEventTime } from "@/lib/utils";

type EventCardProps = {
  event: EventWithOrganizer;
};

export function EventCard({ event }: EventCardProps) {
  const start = formatEventTime(event.starts_at, event.timezone);
  const location =
    event.event_type === "online"
      ? "ONLINE"
      : event.location_name?.toUpperCase() ?? "TBD";

  return (
    <Link href={`/e/${event.id}`} className="group relative block">
      {/* Hard shadow offset div */}
      <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 bg-on-background" />

      {/* Content */}
      <div className="relative border-4 border-on-background bg-surface transition-transform group-hover:-translate-x-px group-hover:-translate-y-px">
        {/* Image placeholder */}
        <div className="aspect-video bg-surface-dim overflow-hidden">
          <div className="h-full w-full bg-surface-dim grayscale group-hover:grayscale-0 transition-all duration-500" />
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
        <div className="px-grid-margin py-3 transition-colors duration-200 group-hover:bg-secondary-fixed">
          <h3 className="text-body-lg font-bold uppercase text-on-surface">
            {event.title}
          </h3>
        </div>
      </div>
    </Link>
  );
}
