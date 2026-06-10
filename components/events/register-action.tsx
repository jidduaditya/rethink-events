import type { Event } from "@/lib/types";
import { RsvpButton } from "@/components/events/rsvp-button";

export function RegisterAction(props: {
  event: Event;
  isGoing: boolean;
  isLoading: boolean;
  disabled?: boolean;
  onRegister: () => void;
  onCancel: () => void;
}) {
  const { event } = props;

  if (event.register_mode === "external") {
    return (
      <button
        type="button"
        onClick={props.onRegister}
        disabled={props.isLoading}
        className="min-h-[44px] w-full border-2 border-on-background bg-primary p-4 font-mono text-label-mono uppercase text-on-primary hard-shadow hard-shadow-hover disabled:opacity-50"
      >
        {props.isGoing ? "Registered — open page" : "Register on host's page"}
      </button>
    );
  }

  return (
    <RsvpButton
      event={event}
      isGoing={props.isGoing}
      onRsvp={props.onRegister}
      onCancel={props.onCancel}
      isLoading={props.isLoading}
      disabled={props.disabled ?? false}
    />
  );
}
