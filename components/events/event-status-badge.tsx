import type { EventStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type EventStatusBadgeProps = {
  status: EventStatus;
};

const statusStyles: Record<EventStatus, string> = {
  pending:
    "bg-surface border-2 border-on-background text-on-surface",
  approved:
    "bg-on-background text-surface",
  rejected:
    "bg-error text-on-error border-2 border-error",
};

export function EventStatusBadge({ status }: EventStatusBadgeProps) {
  return (
    <span
      className={cn(
        "px-3 py-1 font-mono text-label-data uppercase font-semibold inline-block",
        statusStyles[status]
      )}
    >
      {status}
    </span>
  );
}
