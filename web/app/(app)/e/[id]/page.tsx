import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { createClient } from "@/lib/supabase/server";
import { rsvpToEvent, cancelRsvp } from "@/app/actions/rsvp";

const TAG_LABELS: Record<string, string> = {
  beginner: "BEGINNER",
  interview_prep: "INTERVIEWS",
  ai_pm: "AI × PM",
  build: "BUILD",
  resume: "RESUME",
};

function formatFull(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

async function getEvent(id: string) {
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, title, description, city, venue, starts_at, ends_at, capacity, tags, state, host_name, host_id")
    .eq("id", id)
    .single();

  if (!event) return null;

  const { count: goingCount } = await supabase
    .from("rsvps")
    .select("*", { count: "exact", head: true })
    .eq("event_id", id)
    .eq("status", "going");

  const { data: { user } } = await supabase.auth.getUser();

  let myRsvp: { id: string; status: string } | null = null;
  if (user) {
    const { data } = await supabase
      .from("rsvps")
      .select("id, status")
      .eq("event_id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    myRsvp = data;
  }

  return { event, goingCount: goingCount ?? 0, myRsvp };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const result = await getEvent(id);
  if (!result) return { title: "Event not found" };
  const { event } = result;
  return {
    title: `${event.title} — RETHINK EVENTS`,
    description: event.description ?? `A ReThink event in ${event.city}.`,
    openGraph: {
      title: event.title,
      description: event.description ?? "",
      images: [`/e/${id}/opengraph-image`],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getEvent(id);
  if (!result) notFound();

  const { event, goingCount, myRsvp } = result;

  const isFull = event.capacity != null && goingCount >= event.capacity;
  const isGoing = myRsvp?.status === "going";
  const isPast = new Date(event.ends_at) < new Date();
  const spotsLeft = event.capacity != null ? event.capacity - goingCount : null;

  const gcalUrl = new URL("https://calendar.google.com/calendar/render");
  gcalUrl.searchParams.set("action", "TEMPLATE");
  gcalUrl.searchParams.set("text", event.title);
  gcalUrl.searchParams.set("dates",
    `${new Date(event.starts_at).toISOString().replace(/[-:]/g, "").split(".")[0]}Z/${new Date(event.ends_at).toISOString().replace(/[-:]/g, "").split(".")[0]}Z`
  );
  if (event.venue) gcalUrl.searchParams.set("location", event.venue);
  if (event.description) gcalUrl.searchParams.set("details", event.description);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-grid-margin py-stack-xl">
        <Link
          href="/"
          className="font-mono text-label-mono uppercase text-on-surface-variant hover:text-primary transition-colors"
        >
          ← BACK TO EVENTS
        </Link>

        <div className="mt-stack-lg flex flex-wrap items-center gap-2">
          {event.tags.map((tag: string) => (
            <span
              key={tag}
              className="border-2 border-on-background bg-secondary-container px-3 py-1 font-mono text-label-mono font-semibold uppercase text-on-secondary-container"
            >
              {TAG_LABELS[tag] ?? tag}
            </span>
          ))}
          {isFull && (
            <span className="border-2 border-error bg-error px-3 py-1 font-mono text-label-mono font-semibold uppercase text-on-error">
              FULL
            </span>
          )}
          {isPast && (
            <span className="border-2 border-on-surface-variant px-3 py-1 font-mono text-label-mono font-semibold uppercase text-on-surface-variant">
              PAST
            </span>
          )}
        </div>

        <h1 className="mt-stack-lg font-serif text-display-lg font-black uppercase leading-none tracking-tight">
          {event.title}
        </h1>

        <div className="mt-stack-xl grid gap-6 border-y-4 border-on-background py-stack-lg md:grid-cols-3">
          <MetaBlock label="WHEN">
            <p>{formatFull(event.starts_at)}</p>
            <p className="text-on-surface-variant">Ends {formatTime(event.ends_at)}</p>
          </MetaBlock>
          <MetaBlock label="WHERE">
            <p>{event.venue ?? "Location TBC"}</p>
            <p className="text-on-surface-variant capitalize">{event.city}</p>
          </MetaBlock>
          <MetaBlock label="HOST">
            <p>{event.host_name ?? "ReThink"}</p>
            {event.capacity != null && (
              <p className={spotsLeft != null && spotsLeft <= 5 ? "text-primary font-semibold" : "text-on-surface-variant"}>
                {isFull ? "Event full" : `${spotsLeft} of ${event.capacity} spots left`}
              </p>
            )}
            {event.capacity == null && goingCount > 0 && (
              <p className="text-on-surface-variant">{goingCount} going</p>
            )}
          </MetaBlock>
        </div>

        {event.description && (
          <div className="mt-stack-xl">
            <p className="whitespace-pre-wrap font-serif text-body-lg leading-relaxed">
              {event.description}
            </p>
          </div>
        )}

        {/* CTA — RSVP action wired in slice 3.4 */}
        <div className="mt-stack-xl flex flex-col gap-4 sm:flex-row sm:items-center">
          {isPast ? (
            <p className="font-mono text-label-mono uppercase text-on-surface-variant">
              {BRAND.errors.past}
            </p>
          ) : isGoing ? (
            <>
              <Button variant="secondary" size="lg" disabled>
                YOU&apos;RE GOING ✓
              </Button>
              <Link
                href={gcalUrl.toString()}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-label-mono uppercase underline underline-offset-4 hover:text-primary transition-colors"
              >
                + ADD TO CALENDAR
              </Link>
              <Link
                href={`/ticket/${myRsvp!.id}`}
                className="font-mono text-label-mono uppercase underline underline-offset-4 hover:text-primary transition-colors"
              >
                VIEW TICKET →
              </Link>
              <form action={cancelRsvp.bind(null, myRsvp!.id, event.id)}>
                <button
                  type="submit"
                  className="font-mono text-label-mono uppercase text-on-surface-variant underline underline-offset-4 hover:text-error transition-colors"
                >
                  {BRAND.rsvp.cancel}
                </button>
              </form>
            </>
          ) : isFull ? (
            <p className="font-mono text-label-mono uppercase text-on-surface-variant">
              {BRAND.errors.full}
            </p>
          ) : (
            <form action={rsvpToEvent.bind(null, event.id)}>
              <Button type="submit" size="lg">{BRAND.rsvp.going}</Button>
            </form>
          )}
        </div>

        {isPast && myRsvp && (
          <div className="mt-stack-xl border-t-4 border-on-background pt-stack-lg">
            <Link
              href={`/events/${event.id}/feedback`}
              className="font-mono text-label-mono uppercase underline underline-offset-4 hover:text-primary transition-colors"
            >
              {BRAND.feedback.heading} →
            </Link>
          </div>
        )}

        <div className="mt-stack-xl border-t-4 border-on-background pt-stack-lg">
          <p className="font-mono text-label-data uppercase text-on-surface-variant">
            Share this event
          </p>
          <div className="mt-3 flex gap-4">
            <ShareButton label="COPY LINK" />
            <ShareButton label="TWEET" />
            <ShareButton label="WHATSAPP" />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function MetaBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-label-data font-semibold uppercase tracking-widest text-on-surface-variant">
        {label}
      </p>
      <div className="mt-2 font-mono text-label-mono uppercase text-foreground space-y-0.5">
        {children}
      </div>
    </div>
  );
}

function ShareButton({ label }: { label: string }) {
  return (
    <button className="border-2 border-on-background px-4 py-2 font-mono text-label-data font-semibold uppercase transition-colors hover:bg-secondary-container hard-shadow hard-shadow-hover">
      {label}
    </button>
  );
}
