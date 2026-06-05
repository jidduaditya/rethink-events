"use client";

import { ArrowRight } from "lucide-react";
import type { Event } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

type RsvpButtonProps = {
  event: Event;
  isGoing: boolean;
  onRsvp: () => void;
  onCancel: () => void;
  isLoading: boolean;
  disabled: boolean;
};

export function RsvpButton({
  event,
  isGoing,
  onRsvp,
  onCancel,
  isLoading,
  disabled,
}: RsvpButtonProps) {
  const isPast = new Date(event.starts_at) < new Date();

  if (isPast) {
    return (
      <span className="font-mono text-label-mono uppercase font-semibold text-on-surface-variant">
        {BRAND.errors.past}
      </span>
    );
  }

  const isDisabled = disabled || isLoading;

  if (isGoing) {
    return (
      <button
        type="button"
        onClick={onCancel}
        disabled={isDisabled}
        className={cn(
          "bg-surface-container text-on-surface border-2 border-on-background py-3 px-6 font-mono text-label-mono uppercase hard-shadow hard-shadow-hover hard-shadow-active transition-transform",
          isDisabled && "opacity-50 pointer-events-none"
        )}
      >
        {BRAND.rsvp.cancel}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onRsvp}
      disabled={isDisabled}
      className={cn(
        "inline-flex items-center gap-2 bg-secondary-container text-on-secondary-container border-2 border-on-background py-3 px-6 font-mono text-label-mono uppercase hard-shadow hard-shadow-hover hard-shadow-active transition-transform",
        isDisabled && "opacity-50 pointer-events-none"
      )}
    >
      {BRAND.rsvp.going}
      <ArrowRight className="h-4 w-4" />
    </button>
  );
}
