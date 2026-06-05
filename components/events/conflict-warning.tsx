import { formatEventTime } from "@/lib/utils";

type ConflictWarningProps = {
  conflictingEvent: {
    title: string;
    starts_at: string;
    ends_at: string;
    timezone: string;
  };
};

export function ConflictWarning({ conflictingEvent }: ConflictWarningProps) {
  const start = formatEventTime(conflictingEvent.starts_at, conflictingEvent.timezone);

  return (
    <div className="border-2 border-on-background bg-secondary-fixed p-stack-md font-mono text-label-mono">
      You&apos;re already booked for {conflictingEvent.title} on {start.date} at{" "}
      {start.time}.
    </div>
  );
}
