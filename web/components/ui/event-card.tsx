import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Event } from "@/lib/mock";

const TAG_LABELS: Record<string, string> = {
  beginner: "BEGINNER",
  interview_prep: "INTERVIEWS",
  ai_pm: "AI × PM",
  build: "BUILD",
  resume: "RESUME",
};

const CITY_LABELS: Record<string, string> = {
  bangalore: "BLR",
  pune: "PNE",
  delhi: "DEL",
  hyderabad: "HYD",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

interface EventCardProps {
  event: Event;
  going?: boolean;
  className?: string;
}

export function EventCard({ event, going, className }: EventCardProps) {
  const isFull = event.capacity != null && (event.going_count ?? 0) >= event.capacity;
  const spotsLeft = event.capacity != null ? event.capacity - (event.going_count ?? 0) : null;

  return (
    <Link
      href={`/e/${event.id}`}
      className={cn(
        "group flex flex-col gap-stack-sm border-2 border-on-background bg-background p-grid-margin hard-shadow hard-shadow-hover transition-all",
        className
      )}
    >
      {/* top row: city + tags */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="border-2 border-on-background bg-secondary-container px-2 py-0.5 font-mono text-label-data font-semibold uppercase text-on-secondary-container">
          {CITY_LABELS[event.city] ?? event.city.toUpperCase()}
        </span>
        {event.tags.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="border border-outline px-2 py-0.5 font-mono text-label-data uppercase text-on-surface-variant"
          >
            {TAG_LABELS[tag] ?? tag}
          </span>
        ))}
        {going && (
          <span className="ml-auto border-2 border-primary bg-primary px-2 py-0.5 font-mono text-label-data font-semibold uppercase text-on-primary">
            GOING
          </span>
        )}
      </div>

      {/* title */}
      <h2 className="font-serif text-headline-md font-black uppercase leading-tight group-hover:text-primary transition-colors">
        {event.title}
      </h2>

      {/* host + date */}
      <div className="flex flex-col gap-1">
        {event.host_name && (
          <p className="font-mono text-label-mono uppercase text-on-surface-variant">
            {event.host_name}
          </p>
        )}
        <p className="font-mono text-label-mono uppercase text-on-surface-variant">
          {formatDate(event.starts_at)}
        </p>
        {event.venue && (
          <p className="font-mono text-label-data uppercase text-on-surface-variant">
            {event.venue}
          </p>
        )}
      </div>

      {/* capacity */}
      {event.capacity != null && (
        <p
          className={cn(
            "font-mono text-label-data uppercase",
            isFull ? "text-error font-semibold" : spotsLeft != null && spotsLeft <= 5 ? "text-primary font-semibold" : "text-on-surface-variant"
          )}
        >
          {isFull
            ? "FULL"
            : spotsLeft != null && spotsLeft <= 10
            ? `${spotsLeft} SPOTS LEFT`
            : `${event.going_count ?? 0} GOING`}
        </p>
      )}
    </Link>
  );
}
