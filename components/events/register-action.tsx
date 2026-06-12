import React from "react";
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
  const [showConfirm, setShowConfirm] = React.useState(false);

  if (event.register_mode === "external") {
    // Capacity/conflict do not apply to external events, so props.disabled
    // (driven by isFull) is intentionally inert here; only isLoading gates the click.

    if (showConfirm) {
      return (
        <div className="space-y-3">
          <p className="font-mono text-label-mono uppercase font-semibold text-center">DID YOU REGISTER?</p>
          <button
            type="button"
            onClick={() => { props.onRegister(); setShowConfirm(false); }}
            className="w-full border-2 border-on-background bg-primary px-6 py-3 font-mono text-label-mono uppercase font-semibold text-on-primary hard-shadow hard-shadow-hover hard-shadow-active transition-transform"
          >
            YES, I REGISTERED
          </button>
          <button
            type="button"
            onClick={() => setShowConfirm(false)}
            className="w-full border-2 border-on-background bg-surface px-6 py-3 font-mono text-label-mono uppercase font-semibold hard-shadow hard-shadow-hover hard-shadow-active transition-transform"
          >
            NOT YET
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => {
          if (props.isGoing) {
            if (event.register_url) window.open(event.register_url, "_blank", "noopener,noreferrer");
            return;
          }
          if (event.register_url) window.open(event.register_url, "_blank", "noopener,noreferrer");
          setShowConfirm(true);
        }}
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
