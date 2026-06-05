"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

type MutationErrorToastProps = {
  message: string;
  onDismiss: () => void;
};

export function MutationErrorToast({ message, onDismiss }: MutationErrorToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-20 right-4 z-50 border-2 border-on-background bg-error-container text-on-error-container hard-shadow p-stack-md flex items-center gap-3 max-w-sm">
      <span className="font-mono text-label-mono">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 p-1"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
