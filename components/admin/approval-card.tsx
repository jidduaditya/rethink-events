"use client";

import type { EventWithOrganizer } from "@/lib/types";
import { formatEventTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

type ApprovalCardProps = {
  event: EventWithOrganizer;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isLoading: boolean;
};

export function ApprovalCard({
  event,
  onApprove,
  onReject,
  isLoading,
}: ApprovalCardProps) {
  const start = formatEventTime(event.starts_at, event.timezone);
  const isRejected = event.status === "rejected";

  return (
    <div className="relative">
      {/* Hard shadow */}
      <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 bg-on-background" />

      {/* Card content */}
      <div className="relative border-4 border-on-background bg-surface p-stack-lg">
        {/* Header */}
        <h3 className="text-body-lg font-bold uppercase text-on-surface mb-2">
          {event.title}
        </h3>

        {/* Meta */}
        <div className="space-y-1 mb-4">
          <p className="font-mono text-label-data uppercase text-on-surface-variant">
            BY {event.organizer.full_name}
          </p>
          <p className="font-mono text-label-data uppercase text-on-surface-variant">
            {start.date} / {start.time}
          </p>
          <p className="font-mono text-label-data uppercase text-on-surface-variant">
            {event.event_type === "online" ? "ONLINE" : event.location_name?.toUpperCase() ?? "OFFLINE"}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onApprove(event.id)}
            disabled={isLoading}
            className={cn(
              "bg-primary text-on-primary px-6 py-2 font-mono text-label-mono uppercase font-semibold border-2 border-on-background hard-shadow hard-shadow-hover hard-shadow-active transition-transform",
              isLoading && "opacity-50 pointer-events-none"
            )}
          >
            {isRejected ? "RE-APPROVE" : "APPROVE"}
          </button>
          <button
            type="button"
            onClick={() => onReject(event.id)}
            disabled={isLoading}
            className={cn(
              "bg-error text-on-error px-6 py-2 font-mono text-label-mono uppercase font-semibold border-2 border-on-background hard-shadow hard-shadow-hover hard-shadow-active transition-transform",
              isLoading && "opacity-50 pointer-events-none"
            )}
          >
            REJECT
          </button>
        </div>
      </div>
    </div>
  );
}
