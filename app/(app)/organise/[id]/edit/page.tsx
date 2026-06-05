"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-session";
import { useEvent } from "@/hooks/use-event";
import { useUpdateEvent } from "@/hooks/use-update-event";
import { EventForm } from "@/components/events/event-form";
import { EventStatusBadge } from "@/components/events/event-status-badge";

export default function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const router = useRouter();
  const { data: session, isLoading: sessionLoading } = useSession();
  const { data: eventData, isLoading: eventLoading } = useEvent(id);
  const { updateEvent, isUpdating } = useUpdateEvent();

  const event = eventData?.event;
  const userId = session?.user?.id;

  // Redirect if not the owner or event is not pending
  React.useEffect(() => {
    if (sessionLoading || eventLoading) return;
    if (!event || !userId) return;

    if (event.created_by !== userId || event.status !== "pending") {
      router.replace("/me");
    }
  }, [event, userId, sessionLoading, eventLoading, router]);

  // Loading skeleton
  if (sessionLoading || eventLoading) {
    return (
      <div className="dot-grid min-h-[80vh]">
        <div className="mx-auto max-w-3xl px-grid-margin py-stack-xl">
          <div className="mb-stack-lg space-y-2">
            <div className="h-5 w-32 bg-surface-dim" />
            <div className="h-4 w-20 bg-surface-dim" />
          </div>
          <div className="h-96 border-4 border-on-background bg-surface-container" />
        </div>
      </div>
    );
  }

  // Guard: don't render form if not the owner or not pending
  if (!event || !userId || event.created_by !== userId || event.status !== "pending") {
    return null;
  }

  return (
    <div className="dot-grid min-h-[80vh]">
      <div className="mx-auto max-w-3xl px-grid-margin py-stack-xl">
        {/* Header */}
        <div className="mb-stack-lg flex items-center gap-stack-md">
          <h1 className="font-mono text-label-mono uppercase font-semibold">
            EDIT EVENT
          </h1>
          <EventStatusBadge status={event.status} />
        </div>

        {/* Event form pre-filled */}
        <EventForm
          event={event}
          onSubmit={(data) => {
            updateEvent(
              { eventId: id, updates: data },
              {
                onSuccess: () => {
                  router.push("/me");
                },
              }
            );
          }}
          isSubmitting={isUpdating}
        />
      </div>
    </div>
  );
}
