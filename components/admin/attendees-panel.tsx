"use client";

import { Trash2 } from "lucide-react";
import {
  useEventAttendees,
  useRemoveAttendee,
  useCheckIn,
} from "@/hooks/use-event-attendees";
import { BRAND } from "@/lib/brand";
import type { Event } from "@/lib/types";

export function AttendeesPanel({ event }: { event: Event }) {
  const { data: attendees = [], isLoading, isError } = useEventAttendees(
    event.id,
  );
  const remove = useRemoveAttendee(event.id);
  const checkIn = useCheckIn(event.id);

  const isExternal = event.register_mode === "external";

  if (isExternal) {
    return (
      <section className="border-4 border-on-background bg-surface p-stack-lg hard-shadow">
        <h2 className="mb-stack-md font-serif text-headline-md font-bold uppercase">
          Headcount
        </h2>
        {isLoading ? (
          <p className="font-mono text-label-data">Loading...</p>
        ) : isError ? (
          <p className="font-mono text-label-data uppercase text-error">
            Failed to load headcount
          </p>
        ) : (
          <div>
            <p className="font-serif text-headline-lg font-black">
              {attendees.filter((a) => a.status !== "cancelled").length}
            </p>
            <p className="font-mono text-label-data uppercase text-on-surface-variant">
              Registered
            </p>
          </div>
        )}
      </section>
    );
  }

  const visibleAttendees = attendees.filter((a) => a.status !== "cancelled");

  return (
    <section className="border-4 border-on-background bg-surface p-stack-lg hard-shadow">
      <h2 className="mb-stack-md font-serif text-headline-md font-bold uppercase">
        Attendees
      </h2>
      <ul className="mt-stack-lg divide-y-2 divide-on-background border-t-2 border-on-background">
        {isLoading && (
          <li className="py-3 font-mono text-label-data">Loading...</li>
        )}
        {!isLoading && isError && (
          <li className="py-3 font-mono text-label-data uppercase text-error">
            Failed to load attendees
          </li>
        )}
        {!isLoading && !isError && visibleAttendees.length === 0 && (
          <li className="py-3 font-mono text-label-data uppercase text-on-surface-variant">
            No attendees yet
          </li>
        )}
        {visibleAttendees.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-2 py-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="block truncate font-mono text-label-data">
                  {a.user.full_name}
                </span>
                {a.status === "waitlisted" && (
                  <span className="shrink-0 bg-surface-container px-2 py-0.5 font-mono text-label-data uppercase text-on-surface-variant">
                    WAITLISTED
                  </span>
                )}
                {a.status === "confirmed" && (
                  <span className="shrink-0 font-mono text-label-data uppercase text-on-surface-variant">
                    CONFIRMED
                  </span>
                )}
              </div>
              <span className="block truncate font-mono text-label-data text-on-surface-variant">
                {a.user.email}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {a.status === "confirmed" && (
                <button
                  type="button"
                  onClick={() =>
                    checkIn.mutate({
                      registrationId: a.id,
                      checkedIn: !a.checked_in_at,
                    })
                  }
                  disabled={checkIn.isPending}
                  className={`h-11 border-2 border-on-background px-3 font-mono text-label-data uppercase font-semibold disabled:opacity-50 transition-transform ${
                    a.checked_in_at
                      ? "bg-secondary-container text-on-secondary-container"
                      : "hard-shadow hard-shadow-hover hard-shadow-active bg-surface text-on-background"
                  }`}
                >
                  {a.checked_in_at
                    ? `${BRAND.admin.checkIn.checkedIn} ${BRAND.admin.checkIn.undo}`
                    : BRAND.admin.checkIn.checkIn}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Remove ${a.user.full_name}?`))
                    remove.mutate(a.id);
                }}
                disabled={remove.isPending}
                aria-label={`Remove ${a.user.full_name}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
