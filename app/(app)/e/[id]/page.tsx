"use client";

import React from "react";
import { notFound } from "next/navigation";
import { Clock, MapPin } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useEvent } from "@/hooks/use-event";
import { useRegistrations } from "@/hooks/use-registrations";
import { useRegistration } from "@/hooks/use-registration";
import { RsvpButton } from "@/components/events/rsvp-button";
import { ConflictWarning } from "@/components/events/conflict-warning";
import { CapacityWarning } from "@/components/events/capacity-warning";
import { AttendeeCount } from "@/components/events/attendee-count";
import { BRAND } from "@/lib/brand";
import { formatEventTime } from "@/lib/utils";
import { hasTimeOverlap } from "@/lib/guards";

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const { data: eventData, isLoading, isError } = useEvent(id);
  const { data: userRegs } = useRegistrations(userId);

  const event = eventData?.event;
  const attendeeCount = eventData?.attendeeCount ?? 0;

  const { rsvp, cancel, isRsvping } = useRegistration(event, userId, userRegs);

  const isGoing = userRegs?.some((r) => r.event_id === id) ?? false;

  const conflictingEvent = React.useMemo(() => {
    if (!event || !userRegs) return null;
    return userRegs.find(
      (r) => r.event_id !== id && hasTimeOverlap(r.event, event)
    ) ?? null;
  }, [event, userRegs, id]);

  const isFull =
    event?.capacity != null && attendeeCount >= event.capacity && !isGoing;

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="dot-grid min-h-[80vh]">
        {/* Hero skeleton */}
        <div className="relative aspect-video w-full border-4 border-on-background bg-surface-dim" />
        <div className="mx-auto grid max-w-7xl gap-stack-lg px-grid-margin py-stack-xl md:grid-cols-12">
          <div className="space-y-stack-md md:col-span-8">
            <div className="h-6 w-1/3 bg-surface-dim" />
            <div className="h-4 w-full bg-surface-dim" />
            <div className="h-4 w-2/3 bg-surface-dim" />
          </div>
          <div className="md:col-span-4">
            <div className="h-64 border-4 border-on-background bg-surface-container" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center p-stack-md">
        <div className="text-center">
          <h1 className="mb-6 font-serif text-headline-lg font-bold text-on-background">
            {BRAND.errors.loadFailed}
          </h1>
        </div>
      </div>
    );
  }

  // Not found
  if (!event) {
    notFound();
  }

  const start = formatEventTime(event.starts_at, event.timezone);
  const end = formatEventTime(event.ends_at, event.timezone);
  const venue =
    event.event_type === "online"
      ? "ONLINE"
      : event.location_name ?? "TBD";

  return (
    <div className="dot-grid min-h-[80vh]">
      {/* Hero section */}
      <div className="relative aspect-video w-full border-4 border-on-background bg-surface-dim">
        {/* Title block overlay */}
        <div className="absolute bottom-0 left-0 w-3/4 border-r-4 border-t-4 border-on-background bg-primary-container p-stack-md md:w-1/2">
          <h1 className="font-serif text-headline-lg font-black uppercase text-on-primary">
            {event.title}
          </h1>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="mx-auto grid max-w-7xl gap-stack-lg px-grid-margin py-stack-xl md:grid-cols-12">
        {/* Left column -- details */}
        <div className="space-y-stack-lg md:col-span-8">
          {/* Host line */}
          <div className="border-l-8 border-tertiary pl-stack-md">
            <p className="font-sans text-body-lg font-bold italic">
              Hosted by {event.organizer.full_name}
            </p>
          </div>

          {/* Description */}
          <div className="font-serif text-body-lg whitespace-pre-wrap text-on-surface">
            {event.description}
          </div>
        </div>

        {/* Right column -- RSVP sidebar */}
        <div className="md:col-span-4">
          <div className="sticky top-28 space-y-stack-md border-4 border-on-background bg-surface p-stack-lg hard-shadow">
            {/* Date/time */}
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-on-surface-variant" strokeWidth={2.5} />
              <div>
                <p className="font-mono text-label-mono uppercase font-semibold">
                  {start.full}
                </p>
                <p className="font-mono text-label-data uppercase text-on-surface-variant">
                  {start.time} - {end.time}
                </p>
              </div>
            </div>

            {/* Venue */}
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-on-surface-variant" strokeWidth={2.5} />
              <div>
                <p className="font-mono text-label-mono uppercase font-semibold">
                  {venue}
                </p>
                {event.location_address && (
                  <p className="font-mono text-label-data uppercase text-on-surface-variant">
                    {event.location_address}
                  </p>
                )}
              </div>
            </div>

            {/* RSVP button */}
            <RsvpButton
              event={event}
              isGoing={isGoing}
              onRsvp={() => rsvp(id)}
              onCancel={() => cancel(id)}
              isLoading={isRsvping}
              disabled={isFull && !isGoing}
            />

            {/* Warnings */}
            {conflictingEvent && (
              <ConflictWarning conflictingEvent={conflictingEvent.event} />
            )}
            {isFull && <CapacityWarning />}

            {/* Attendee count */}
            <AttendeeCount count={attendeeCount} />
          </div>
        </div>
      </div>
    </div>
  );
}
