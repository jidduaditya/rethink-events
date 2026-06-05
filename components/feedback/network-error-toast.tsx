"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

type NetworkErrorToastProps = {
  message: string;
  onDismiss: () => void;
};

export function NetworkErrorToast({ message, onDismiss }: NetworkErrorToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-20 right-4 z-50 border-2 border-on-background bg-surface hard-shadow p-stack-md flex items-center gap-3 max-w-sm">
      <span className="font-mono text-label-mono text-on-surface">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 p-1"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4 text-on-surface" />
      </button>
    </div>
  );
}
