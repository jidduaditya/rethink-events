import type { Event } from "@/lib/types";
import { RsvpButton } from "@/components/events/rsvp-button";
import { BRAND } from "@/lib/brand";

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
    // Capacity/conflict do not apply to external events, so props.disabled
    // (driven by isFull) is intentionally inert here; only isLoading gates the click.
    return (
      <button
        type="button"
        onClick={props.onRegister}
        disabled={props.isLoading}
        className="min-h-[44px] w-full border-2 border-on-background bg-primary p-4 font-mono text-label-mono uppercase text-on-primary hard-shadow hard-shadow-hover disabled:opacity-50"
      >
        {props.isGoing ? BRAND.rsvp.externalRegistered : BRAND.rsvp.externalRegister}
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
