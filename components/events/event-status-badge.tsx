import type { EventStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type EventStatusBadgeProps = {
  status: EventStatus;
};

const statusStyles: Record<EventStatus, string> = {
  pending:   "bg-surface-container border-2 border-on-background text-on-surface",
  approved:  "bg-on-background text-surface",
  rejected:  "bg-error text-on-error border-2 border-on-background",
  cancelled: "bg-error-container text-on-error-container border-2 border-on-background",
};

const statusLabels: Record<EventStatus, string> = {
  pending:   "IN REVIEW",
  approved:  "APPROVED",
  rejected:  "REJECTED",
  cancelled: "CANCELLED",
};

export function EventStatusBadge({ status }: EventStatusBadgeProps) {
  return (
    <span
      className={cn(
        "px-3 py-1 font-mono text-label-data uppercase font-semibold inline-block",
        statusStyles[status]
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
