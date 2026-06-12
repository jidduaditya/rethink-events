"use client";

// ConflictDialog — shown when a time overlap is detected before registration.
// The user decides whether to register anyway or cancel.
// Pattern mirrors cancel-dialog.tsx (same overlay, border, hard-shadow structure).

type ConflictDialogProps = {
  conflictingEventTitle: string;
  onConfirm: () => void; // proceed with registration anyway
  onCancel: () => void;  // abort registration
};

export function ConflictDialog({
  conflictingEventTitle,
  onConfirm,
  onCancel,
}: ConflictDialogProps) {
  return (
    // Overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-background/80 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-dialog-title"
    >
      <div className="relative w-full max-w-lg">
        {/* Hard shadow */}
        <div className="absolute inset-0 translate-x-2 translate-y-2 bg-on-background" />

        <div className="relative border-4 border-on-background bg-surface p-8">
          <h2
            id="conflict-dialog-title"
            className="mb-3 font-serif text-headline-md font-bold uppercase text-on-background"
          >
            SCHEDULING CONFLICT
          </h2>
          <p className="mb-6 font-mono text-label-data uppercase text-on-surface-variant">
            THIS OVERLAPS WITH &ldquo;{conflictingEventTitle}&rdquo;. REGISTER ANYWAY?
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 border-2 border-on-background bg-primary text-on-primary px-6 py-3 font-mono text-label-mono uppercase font-semibold hard-shadow hard-shadow-hover hard-shadow-active transition-transform"
            >
              REGISTER ANYWAY
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 border-2 border-on-background bg-surface text-on-background px-6 py-3 font-mono text-label-mono uppercase font-semibold hard-shadow hard-shadow-hover hard-shadow-active transition-transform"
            >
              CANCEL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
