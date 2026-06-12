"use client";

import React from "react";
import Link from "next/link";
import { useSession } from "@/hooks/use-session";
import { useRegistrations } from "@/hooks/use-registrations";
import { useCancelRegistration } from "@/hooks/use-cancel-registration";
import { EventCard } from "@/components/events/event-card";
import { BRAND } from "@/lib/brand";
import { EventStatusBadge } from "@/components/events/event-status-badge";
import { EmptyState } from "@/components/events/empty-state";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { EventWithOrganizer, RegistrationWithEvent } from "@/lib/types";

function useMyEvents(userId: string | undefined) {
  const supabase = createClient();

  return useQuery<EventWithOrganizer[]>({
    queryKey: ["events", "mine", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, organizer:profiles!created_by(id, full_name, email)")
        .eq("created_by", userId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as EventWithOrganizer[];
    },
    enabled: !!userId,
  });
}

type Tab = "going" | "organized" | "tickets";

export default function MyEventsPage() {
  const [activeTab, setActiveTab] = React.useState<Tab>("going");
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const { data: rsvps, isLoading: rsvpsLoading } = useRegistrations(userId);
  const { data: myEvents, isLoading: myEventsLoading } = useMyEvents(userId);
  const cancelReg = useCancelRegistration();

  // Filter RSVPs to approved + confirmed events only
  const goingEvents = React.useMemo(() => {
    if (!rsvps) return [];
    return rsvps.filter((r) => r.event.status === "approved" && r.status === "confirmed");
  }, [rsvps]);

  const myTickets = React.useMemo(() => {
    if (!rsvps) return [];
    return rsvps.filter((r) => r.status !== "cancelled" && r.event.status === "approved");
  }, [rsvps]);

  const isLoading =
    activeTab === "going"
      ? rsvpsLoading
      : activeTab === "organized"
      ? myEventsLoading
      : rsvpsLoading; // tickets uses same data as going

  return (
    <div className="dot-grid min-h-[80vh]">
      <div className="mx-auto max-w-[1600px] px-grid-margin py-stack-xl">
        {/* Tabs */}
        <div className="mb-stack-lg flex border-4 border-on-background">
          <button
            type="button"
            onClick={() => setActiveTab("going")}
            className={`flex-1 px-6 py-3 font-mono text-label-mono uppercase font-semibold transition-colors ${
              activeTab === "going"
                ? "bg-on-background text-surface"
                : "border-r-4 border-on-background bg-surface text-on-background"
            }`}
          >
            GOING
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("organized")}
            className={`flex-1 px-6 py-3 font-mono text-label-mono uppercase font-semibold transition-colors ${
              activeTab === "organized"
                ? "bg-on-background text-surface"
                : "border-r-4 border-on-background bg-surface text-on-background"
            }`}
          >
            ORGANIZED
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tickets")}
            className={`flex-1 px-6 py-3 font-mono text-label-mono uppercase font-semibold transition-colors ${
              activeTab === "tickets"
                ? "bg-on-background text-surface"
                : "bg-surface text-on-background"
            }`}
          >
            TICKETS
          </button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-x-grid-gutter gap-y-stack-lg md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border-4 border-on-background bg-surface-container">
                <div className="aspect-video bg-surface-dim" />
                <div className="space-y-2 p-grid-margin">
                  <div className="h-4 w-3/4 bg-surface-dim" />
                  <div className="h-4 w-1/2 bg-surface-dim" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* GOING tab */}
        {!isLoading && activeTab === "going" && (
          <>
            {goingEvents.length === 0 ? (
              <EmptyState
                message={BRAND.empty.myEvents}
                actionLabel="BROWSE EVENTS"
                actionHref="/"
              />
            ) : (
              <div className="grid grid-cols-1 gap-x-grid-gutter gap-y-stack-lg md:grid-cols-2 xl:grid-cols-4">
                {goingEvents.map((rsvp: RegistrationWithEvent) => (
                  <div key={rsvp.event.id} className="relative">
                    <EventCard event={rsvp.event as EventWithOrganizer} />
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("Cancel your registration for this event?")) {
                          cancelReg.mutate({
                            registrationId: rsvp.id,
                            eventId: rsvp.event_id,
                            code: rsvp.registration_code,
                          });
                        }
                      }}
                      disabled={cancelReg.isPending}
                      className="mt-2 w-full border-2 border-on-background bg-surface px-4 py-2 font-mono text-label-data uppercase font-semibold hard-shadow hard-shadow-hover hard-shadow-active disabled:opacity-50"
                    >
                      CAN'T MAKE IT
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ORGANIZED tab */}
        {!isLoading && activeTab === "organized" && (
          <>
            {(!myEvents || myEvents.length === 0) ? (
              <EmptyState
                message="You haven't created any events yet."
                actionLabel="ORGANISE"
                actionHref="/organise"
              />
            ) : (
              <div className="grid grid-cols-1 gap-x-grid-gutter gap-y-stack-lg md:grid-cols-2 xl:grid-cols-4">
                {myEvents.map((event) => (
                  <div key={event.id} className="relative">
                    {/* Status badge overlay */}
                    <div className="absolute left-grid-margin top-3 z-10">
                      <EventStatusBadge status={event.status} />
                    </div>
                    <EventCard event={event} />
                    {event.status === "pending" && (
                      <Link
                        href={`/organise/${event.id}/edit`}
                        className="mt-2 inline-block border-2 border-on-background bg-surface px-4 py-2 font-mono text-label-data uppercase font-semibold hard-shadow hard-shadow-hover hard-shadow-active"
                      >
                        EDIT
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* TICKETS tab */}
        {!isLoading && activeTab === "tickets" && (
          <>
            {myTickets.length === 0 ? (
              <EmptyState
                message="No tickets yet. Register for an event to see them here."
                actionLabel="BROWSE EVENTS"
                actionHref="/"
              />
            ) : (
              <div className="space-y-3">
                {myTickets.map((rsvp: RegistrationWithEvent) => (
                  <a
                    key={rsvp.id}
                    href={`/t/${rsvp.registration_code}`}
                    className="flex items-center justify-between border-4 border-on-background bg-surface p-stack-md hard-shadow hover:-translate-x-px hover:-translate-y-px transition-transform"
                  >
                    <div>
                      <p className="font-serif text-body-lg font-bold uppercase">{rsvp.event.title}</p>
                      <p className="font-mono text-label-data uppercase text-on-surface-variant">
                        {rsvp.status === "confirmed" ? "CONFIRMED" : "WAITLISTED"}
                      </p>
                    </div>
                    <span className="font-mono text-label-data uppercase text-on-surface-variant">
                      {rsvp.registration_code}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
