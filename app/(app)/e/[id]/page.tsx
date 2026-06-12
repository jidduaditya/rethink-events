"use client";

import React from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Clock, MapPin } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useEvent } from "@/hooks/use-event";
import { useRegistrations } from "@/hooks/use-registrations";
import { useRegistration } from "@/hooks/use-registration";
import { useCancelEvent } from "@/hooks/use-cancel-event";
import { RegisterAction } from "@/components/events/register-action";
import { SpeakerBlock } from "@/components/events/speaker-block";
import { ConflictWarning } from "@/components/events/conflict-warning";
import { CapacityWarning } from "@/components/events/capacity-warning";
import { AttendeeCount } from "@/components/events/attendee-count";
import { AttendeesPanel } from "@/components/admin/attendees-panel";
import { CancelDialog } from "@/components/events/cancel-dialog";
import { BRAND } from "@/lib/brand";
import { formatEventTime } from "@/lib/utils";
import { hasTimeOverlap } from "@/lib/guards";
import { isLive } from "@/lib/feed-filters";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

// Derive the UI display state from event fields + current time.
type EventUIState =
  | "cancelled"
  | "rejected"
  | "pending"
  | "past"
  | "live"
  | "upcoming";

function deriveUIState(
  event: { status: string; starts_at: string; ends_at: string },
  now: Date
): EventUIState {
  if (event.status === "cancelled") return "cancelled";
  if (event.status === "rejected") return "rejected";
  if (event.status === "pending") return "pending";
  // status === "approved"
  if (new Date(event.ends_at) <= now) return "past";
  if (isLive(event, now)) return "live";
  return "upcoming";
}

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
  const isHost = userId === event?.created_by;
  const isAdmin =
    (session?.user as unknown as { profile?: Profile })?.profile?.role === "admin";

  const cancelMutation = useCancelEvent(id);
  const [showCancelDialog, setShowCancelDialog] = React.useState(false);

  const conflictingEvent = React.useMemo(() => {
    if (!event || !userRegs) return null;
    return userRegs.find(
      (r) => r.event_id !== id && hasTimeOverlap(r.event, event)
    ) ?? null;
  }, [event, userRegs, id]);

  const isFull =
    event?.capacity != null && attendeeCount >= event.capacity && !isGoing;

  const isExternal = event?.register_mode === "external";

  const now = new Date();
  const uiState = event ? deriveUIState(event, now) : null;

  const canCancel =
    event &&
    uiState === "upcoming" &&
    (isHost || isAdmin);

  // Pending and rejected events are only visible to creator and admin.
  const isHidden =
    uiState === "pending"
      ? !isHost && !isAdmin
      : uiState === "rejected"
      ? !isHost && !isAdmin
      : false;

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="dot-grid min-h-[80vh]">
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

  if (!event || isHidden) {
    notFound();
  }

  const start = formatEventTime(event.starts_at, event.timezone);
  const end = formatEventTime(event.ends_at, event.timezone);
  const venue =
    event.event_type === "online"
      ? "ONLINE"
      : event.location_name ?? "TBD";

  const canRegister =
    uiState === "upcoming" || uiState === "live";

  return (
    <div className="dot-grid min-h-[80vh]">
      {/* Cancel dialog */}
      {showCancelDialog && (
        <CancelDialog
          onConfirm={(reason) => {
            cancelMutation.mutate(reason, {
              onSuccess: () => setShowCancelDialog(false),
            });
          }}
          onCancel={() => setShowCancelDialog(false)}
          isLoading={cancelMutation.isPending}
        />
      )}

      {/* Cancelled banner */}
      {uiState === "cancelled" && (
        <div className="border-b-4 border-on-background bg-error-container px-grid-margin py-stack-md">
          <p className="font-serif text-headline-md font-bold uppercase text-on-error-container">
            {BRAND.lifecycle.cancelled}
          </p>
          {event.cancellation_reason && (
            <p className="mt-1 font-mono text-label-mono uppercase text-on-error-container">
              {event.cancellation_reason}
            </p>
          )}
        </div>
      )}

      {/* Past banner */}
      {uiState === "past" && (
        <div className="border-b-4 border-on-background bg-surface-container px-grid-margin py-stack-md">
          <p className="font-serif text-headline-md font-bold uppercase text-on-surface">
            {BRAND.lifecycle.ended}
          </p>
        </div>
      )}

      {/* Pending notice (creator + admin only) */}
      {uiState === "pending" && (
        <div className="border-b-4 border-on-background bg-secondary-container px-grid-margin py-stack-md">
          <p className="font-mono text-label-mono uppercase font-semibold text-on-secondary-container">
            {BRAND.lifecycle.pendingBanner}
          </p>
        </div>
      )}

      {/* Rejected notice (creator + admin only) */}
      {uiState === "rejected" && (
        <div className="border-b-4 border-on-background bg-error-container px-grid-margin py-stack-md">
          <p className="font-mono text-label-mono uppercase font-semibold text-on-error-container">
            {BRAND.lifecycle.rejected}
          </p>
        </div>
      )}

      {/* Hero section */}
      <div className="group relative aspect-video w-full overflow-hidden border-4 border-on-background bg-surface-dim">
        {event.image_url ? (
          <Image
            src={event.image_url}
            alt={event.title}
            fill
            className={cn(
              "object-cover transition-all duration-500",
              uiState === "cancelled" || uiState === "past"
                ? "grayscale"
                : "grayscale group-hover:grayscale-0"
            )}
            unoptimized
          />
        ) : (
          <div className="h-full w-full bg-surface-dim" />
        )}

        {/* LIVE badge — top-left, screen's single pink element */}
        {uiState === "live" && (
          <span className="absolute left-0 top-0 flex items-center gap-1.5 bg-tertiary px-4 py-2 font-mono text-label-mono uppercase font-semibold text-on-tertiary">
            <span
              className="h-2 w-2 rounded-full bg-on-tertiary motion-safe:animate-pulse"
              aria-hidden="true"
            />
            {BRAND.lifecycle.live}
          </span>
        )}

        {/* Title block overlay */}
        <div className="absolute bottom-0 left-0 w-3/4 border-r-4 border-t-4 border-on-background bg-primary-container p-stack-md md:w-1/2">
          <h1 className="font-serif text-headline-lg font-black uppercase text-on-primary">
            {event.title}
          </h1>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="mx-auto grid max-w-7xl gap-stack-lg px-grid-margin py-stack-xl md:grid-cols-12">
        {/* Left column */}
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

          {/* Speaker */}
          <SpeakerBlock event={event} />
        </div>

        {/* Right column — RSVP sidebar */}
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

            {/* Register action — only for upcoming/live events */}
            {canRegister && (
              <RegisterAction
                event={event}
                isGoing={isGoing}
                onRegister={() => rsvp(id)}
                onCancel={() => cancel(id)}
                isLoading={isRsvping}
                disabled={isFull && !isGoing}
              />
            )}

            {/* Capacity/conflict/count — native only */}
            {canRegister && !isExternal && (
              <>
                {conflictingEvent && (
                  <ConflictWarning conflictingEvent={conflictingEvent.event} />
                )}
                {isFull && <CapacityWarning />}
                <AttendeeCount count={attendeeCount} />
              </>
            )}

            {/* Cancel event — host or admin, upcoming only */}
            {canCancel && (
              <button
                type="button"
                onClick={() => setShowCancelDialog(true)}
                className="w-full border-2 border-on-background bg-error px-6 py-3 font-mono text-label-mono uppercase font-semibold text-on-error hard-shadow hard-shadow-hover hard-shadow-active transition-transform"
              >
                {BRAND.admin.cancel.button}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Host-only attendees management */}
      {isHost && (
        <div className="mx-auto max-w-7xl px-grid-margin pb-stack-xl">
          <AttendeesPanel event={event} />
        </div>
      )}
    </div>
  );
}
