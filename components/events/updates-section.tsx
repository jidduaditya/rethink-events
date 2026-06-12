"use client";

// UpdatesSection — host broadcast composer + chronological update list.
//
// Shown on the event detail page (app/(app)/e/[id]/page.tsx).
// The integration agent wires this into the page with:
//   <UpdatesSection eventId={event.id} isHost={event.created_by === session.user.id} />
//
// Visibility rules:
//   - Host view: composer + list (even when list is empty).
//   - Attendee view: list only; if list is empty, renders null (hidden).
//
// Email fan-out after send is handled by the integration agent (server action
// or API route) — this component only inserts the message row and shows it.

import { useState, useRef } from "react";
import { useEventMessages, useSendMessage } from "@/hooks/use-event-messages";
import { cn } from "@/lib/utils";

type UpdatesSectionProps = {
  eventId: string;
  isHost: boolean;
};

const MAX_BODY_LENGTH = 1000;

// Format timestamp as mono label: "12 JUN 2026 · 09:41"
function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d
    .toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .toUpperCase()
    .replace(",", " ·");
}

export function UpdatesSection({ eventId, isHost }: UpdatesSectionProps) {
  const { data: messages, isLoading } = useEventMessages(eventId);
  const { sendMessage, isSending, sendError, cooldownSeconds, isOnCooldown } =
    useSendMessage(eventId);

  const [body, setBody] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasMessages = (messages?.length ?? 0) > 0;

  // Attendees only see the section when there are updates to show.
  if (!isHost && !hasMessages && !isLoading) {
    return null;
  }

  function handleSend() {
    const trimmed = body.trim();
    if (!trimmed || isSending || isOnCooldown) return;

    sendMessage(trimmed, {
      onSuccess: () => {
        setBody("");
        textareaRef.current?.focus();
      },
    });
  }

  const charsRemaining = MAX_BODY_LENGTH - body.length;
  const sendDisabled = isSending || isOnCooldown || body.trim().length === 0;

  return (
    <section aria-label="Event updates" className="mt-8">
      {/* Section header */}
      <h2 className="font-mono text-label-mono uppercase font-semibold tracking-wider text-on-surface-variant mb-4">
        UPDATES
      </h2>

      {/* Composer — host only */}
      {isHost && (
        <div className="mb-6">
          <div className="border-2 border-on-background">
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={MAX_BODY_LENGTH}
              rows={4}
              placeholder="Write an update for your attendees..."
              disabled={isSending}
              aria-label="Broadcast message body"
              className={cn(
                "w-full bg-surface text-on-surface p-3 font-sans text-body-md resize-none",
                "placeholder:text-on-surface-variant",
                "focus:outline-none focus:ring-0",
                "disabled:opacity-50"
              )}
            />
            <div className="border-t-2 border-on-background flex items-center justify-between px-3 py-2 bg-surface-container">
              <span
                className={cn(
                  "font-mono text-label-mono text-on-surface-variant",
                  charsRemaining < 100 && "text-error"
                )}
              >
                {charsRemaining}
              </span>
              <button
                type="button"
                onClick={handleSend}
                disabled={sendDisabled}
                className={cn(
                  "bg-secondary-container text-on-secondary-container",
                  "border-2 border-on-background",
                  "py-2 px-5 font-mono text-label-mono uppercase",
                  "hard-shadow hard-shadow-hover hard-shadow-active transition-transform",
                  "min-h-[44px]",
                  sendDisabled && "opacity-50 pointer-events-none"
                )}
              >
                {isOnCooldown
                  ? `WAIT ${cooldownSeconds}S`
                  : isSending
                  ? "SENDING..."
                  : "SEND UPDATE"}
              </button>
            </div>
          </div>

          {sendError && (
            <p className="mt-2 font-mono text-label-mono text-error uppercase">
              {sendError instanceof Error
                ? sendError.message
                : "SEND FAILED. TRY AGAIN."}
            </p>
          )}
        </div>
      )}

      {/* Updates list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="border-2 border-on-background p-4 bg-surface-container animate-pulse"
              style={{ height: "80px" }}
              aria-hidden="true"
            />
          ))}
        </div>
      ) : hasMessages ? (
        <ol className="space-y-3 list-none p-0 m-0">
          {messages!.map((msg) => (
            <li key={msg.id} className="border-2 border-on-background p-4 bg-surface">
              {/* Header: timestamp */}
              <p className="font-mono text-label-mono text-on-surface-variant uppercase mb-2">
                {formatTimestamp(msg.created_at)}
              </p>
              {/* Body */}
              <p className="font-serif text-body-md text-on-surface whitespace-pre-wrap break-words">
                {msg.body}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        // Empty state — only shown to host (attendee view returns null above)
        <p className="font-mono text-label-mono text-on-surface-variant uppercase">
          NO UPDATES SENT. ATTENDEES GET THESE BY EMAIL TOO.
        </p>
      )}
    </section>
  );
}
