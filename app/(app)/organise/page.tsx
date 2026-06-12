"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useCreateEvent } from "@/hooks/use-create-event";
import { EventForm } from "@/components/events/event-form";
import { BRAND } from "@/lib/brand";

export default function OrganisePage() {
  const router = useRouter();
  const { createEvent, isCreating } = useCreateEvent();

  return (
    <div className="dot-grid min-h-[80vh]">
      <div className="mx-auto max-w-3xl px-grid-margin py-stack-xl">
        {/* Header */}
        <div className="mb-stack-lg space-y-1">
          <h1 className="font-mono text-label-mono uppercase font-semibold">
            {BRAND.create.header}
          </h1>
          <p className="font-mono text-label-data uppercase text-on-surface-variant">
            {BRAND.create.status}
          </p>
        </div>

        {/* Event form */}
        <EventForm
          onSubmit={(data) => {
            createEvent(data, {
              onSuccess: (event) => {
                if (event.status === "approved") {
                  // Trusted host or admin: event is live, go see it.
                  router.push(`/e/${event.id}?published=1`);
                } else {
                  // First-time creator: pending review.
                  router.push("/me?created=1");
                }
              },
            });
          }}
          isSubmitting={isCreating}
        />

        {/* First-timer notice (always visible on this page, pre-submit) */}
        <p className="mt-stack-md font-mono text-label-data uppercase text-on-surface-variant">
          {BRAND.create.pendingReview}
        </p>
      </div>
    </div>
  );
}
