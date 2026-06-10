"use client";

import { Trash2 } from "lucide-react";
import {
  useEventAttendees,
  useRemoveAttendee,
} from "@/hooks/use-event-attendees";
import type { Event } from "@/lib/types";

export function AttendeesPanel({ event }: { event: Event }) {
  const { data: attendees = [], isLoading } = useEventAttendees(event.id);
  const remove = useRemoveAttendee(event.id);

  const isExternal = event.register_mode === "external";

  if (isExternal) {
    return (
      <section className="border-4 border-on-background bg-surface p-stack-lg hard-shadow">
        <h2 className="mb-stack-md font-serif text-headline-md font-bold uppercase">
          Headcount
        </h2>
        {isLoading ? (
          <p className="font-mono text-label-data">Loading...</p>
        ) : (
          <div>
            <p className="font-serif text-headline-lg font-black">
              {attendees.length}
            </p>
            <p className="font-mono text-label-data uppercase text-on-surface-variant">
              Registered
            </p>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="border-4 border-on-background bg-surface p-stack-lg hard-shadow">
      <h2 className="mb-stack-md font-serif text-headline-md font-bold uppercase">
        Attendees
      </h2>
      <ul className="mt-stack-lg divide-y-2 divide-on-background border-t-2 border-on-background">
        {isLoading && (
          <li className="py-3 font-mono text-label-data">Loading...</li>
        )}
        {!isLoading && attendees.length === 0 && (
          <li className="py-3 font-mono text-label-data uppercase text-on-surface-variant">
            No attendees yet
          </li>
        )}
        {attendees.map((a) => (
          <li key={a.id} className="flex items-center justify-between py-2">
            <div className="min-w-0">
              <span className="block truncate font-mono text-label-data">
                {a.user.full_name}
              </span>
              <span className="block truncate font-mono text-label-data text-on-surface-variant">
                {a.user.email}
              </span>
            </div>
            <button
              onClick={() => remove.mutate(a.id)}
              disabled={remove.isPending}
              aria-label={`Remove ${a.user.full_name}`}
              className="ml-3 flex h-11 w-11 shrink-0 items-center justify-center disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
