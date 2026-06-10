import type { EventWithOrganizer } from "@/lib/types";
import { EventCard } from "@/components/events/event-card";

export function FeedSection({
  title,
  events,
  emptyLabel,
}: {
  title: string;
  events: EventWithOrganizer[];
  emptyLabel?: string;
}) {
  return (
    <section className="mb-stack-xl">
      <h2 className="mb-stack-md border-b-4 border-on-background pb-stack-sm font-serif text-headline-md font-bold uppercase">
        {title}
      </h2>
      {events.length === 0 ? (
        <p className="font-mono text-label-data uppercase text-on-surface-variant">
          {emptyLabel ?? "Nothing here yet."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-x-grid-gutter gap-y-stack-lg md:grid-cols-2 xl:grid-cols-4">
          {events.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}
    </section>
  );
}
