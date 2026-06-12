"use client";

import React from "react";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

type CancelDialogProps = {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isLoading: boolean;
};

export function CancelDialog({ onConfirm, onCancel, isLoading }: CancelDialogProps) {
  const [reason, setReason] = React.useState("");
  const canSubmit = reason.trim().length > 0 && !isLoading;

  function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onConfirm(reason.trim());
  }

  return (
    // Overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-background/80 px-grid-margin"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-dialog-title"
    >
      <div className="relative w-full max-w-lg">
        {/* Hard shadow */}
        <div className="absolute inset-0 translate-x-2 translate-y-2 bg-on-background" />

        <form
          onSubmit={handleConfirm}
          className="relative border-4 border-on-background bg-surface p-stack-lg"
        >
          <h2
            id="cancel-dialog-title"
            className="mb-2 font-serif text-headline-md font-bold uppercase"
          >
            {BRAND.admin.cancel.dialogTitle}
          </h2>
          <p className="mb-stack-md font-mono text-label-data uppercase text-on-surface-variant">
            {BRAND.admin.cancel.dialogBody}
          </p>

          <label
            htmlFor="cancel-reason"
            className="mb-2 block font-mono text-label-data uppercase font-semibold"
          >
            {BRAND.admin.cancel.reasonLabel}
          </label>
          <textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            className="mb-stack-md w-full border-2 border-on-background bg-surface px-3 py-2 font-mono text-body-md text-on-surface focus:border-primary focus:outline-none resize-none"
            placeholder="E.g. venue unavailable, speaker cancelled..."
            autoFocus
          />

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                "flex-1 border-2 border-on-background bg-error px-6 py-3 font-mono text-label-mono uppercase font-semibold text-on-error hard-shadow hard-shadow-hover hard-shadow-active transition-transform",
                !canSubmit && "opacity-50 pointer-events-none"
              )}
            >
              {isLoading ? "CANCELLING..." : BRAND.admin.cancel.confirm}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 border-2 border-on-background bg-surface px-6 py-3 font-mono text-label-mono uppercase font-semibold hard-shadow hard-shadow-hover hard-shadow-active transition-transform disabled:opacity-50"
            >
              {BRAND.admin.cancel.abort}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
