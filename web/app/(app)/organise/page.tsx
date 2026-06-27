import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { MOCK_EVENTS, MOCK_ME } from "@/lib/mock";

// ponytail: Phase 1 — visual scaffold. Real host dashboard wired in slice 3.1.

const myEvents = MOCK_EVENTS; // In Phase 3.1 filter by auth user's host_id

const STATE_LABEL: Record<string, string> = {
  draft: "DRAFT",
  pending_review: "IN REVIEW",
  published: "LIVE",
  cancelled: "CANCELLED",
  taken_down: "TAKEN DOWN",
};

const STATE_STYLE: Record<string, string> = {
  draft: "border-outline text-on-surface-variant",
  pending_review: "border-primary bg-primary text-on-primary",
  published: "border-secondary-container bg-secondary-container text-on-secondary-container",
  cancelled: "border-error text-error",
  taken_down: "border-on-surface-variant text-on-surface-variant",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  }).toUpperCase();
}

export default function OrganisePage() {
  return (
    <AppShell>
      <div className="px-grid-margin py-stack-xl">
        {/* header */}
        <div className="flex items-center justify-between border-b-4 border-on-background pb-stack-lg">
          <div>
            <h1 className="font-serif text-headline-lg font-black uppercase">ORGANISE</h1>
            <p className="mt-1 font-mono text-label-mono uppercase text-on-surface-variant">
              {MOCK_ME.full_name} · {myEvents.length} events
            </p>
          </div>
          <Link href="/organise/new">
            <Button>{BRAND.create.publish.replace("PUBLISH ", "NEW ")}</Button>
          </Link>
        </div>

        {/* event list */}
        {myEvents.length === 0 ? (
          <div className="mt-stack-xl text-center">
            <p className="font-serif text-headline-md text-on-surface-variant">
              No events yet.
            </p>
            <Link href="/organise/new" className="mt-stack-lg inline-block">
              <Button size="lg">HOST YOUR FIRST EVENT</Button>
            </Link>
          </div>
        ) : (
          <div className="mt-stack-lg divide-y-2 divide-on-background border-2 border-on-background">
            {myEvents.map((event) => (
              <div key={event.id} className="flex items-center gap-4 p-5 hover:bg-surface-container-low transition-colors">
                {/* state pill */}
                <span
                  className={`shrink-0 border-2 px-3 py-1 font-mono text-label-data font-semibold uppercase ${STATE_STYLE[event.state]}`}
                >
                  {STATE_LABEL[event.state] ?? event.state}
                </span>

                {/* title + meta */}
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-headline-md font-black uppercase truncate">
                    {event.title}
                  </p>
                  <p className="mt-0.5 font-mono text-label-data uppercase text-on-surface-variant">
                    {formatDate(event.starts_at)} · {event.city.toUpperCase()}
                    {event.capacity != null && ` · ${event.going_count ?? 0}/${event.capacity} GOING`}
                  </p>
                </div>

                {/* actions */}
                <div className="flex shrink-0 gap-2">
                  {event.state === "published" && (
                    <Link href={`/organise/${event.id}/run`}>
                      <Button size="sm" variant="secondary">RUN</Button>
                    </Link>
                  )}
                  <Link href={`/organise/${event.id}/edit`}>
                    <Button size="sm" variant="outline">EDIT</Button>
                  </Link>
                  <Link href={`/e/${event.id}`}>
                    <Button size="sm" variant="ghost">VIEW ↗</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
