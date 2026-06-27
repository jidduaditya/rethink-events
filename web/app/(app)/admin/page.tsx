import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { MOCK_EVENTS } from "@/lib/mock";

// ponytail: Phase 1 — visual scaffold. Real admin queue + trust toggle + takedown lands in slice 3.2.

const pendingEvents = MOCK_EVENTS.filter((e) => e.state === "pending_review");
const allEvents = MOCK_EVENTS;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  }).toUpperCase();
}

export default function AdminPage() {
  return (
    <AppShell>
      <div className="px-grid-margin py-stack-xl">
        <h1 className="font-serif text-headline-lg font-black uppercase border-b-4 border-on-background pb-stack-lg">
          ADMIN
        </h1>

        {/* stats */}
        <div className="mt-stack-lg grid grid-cols-2 gap-4 border-2 border-on-background md:grid-cols-4">
          <AdminStat label="PENDING" value={String(pendingEvents.length)} accent />
          <AdminStat label="PUBLISHED" value={String(allEvents.filter((e) => e.state === "published").length)} />
          <AdminStat label="TOTAL EVENTS" value={String(allEvents.length)} />
          <AdminStat label="TRUSTED HOSTS" value="—" />
        </div>

        {/* pending queue */}
        <section className="mt-stack-xl">
          <h2 className="font-mono text-label-mono font-semibold uppercase tracking-widest text-on-surface-variant border-l-4 border-primary pl-3">
            PENDING REVIEW ({pendingEvents.length})
          </h2>

          {pendingEvents.length === 0 ? (
            <p className="mt-stack-lg font-mono text-label-mono uppercase text-on-surface-variant">
              Queue empty.
            </p>
          ) : (
            <div className="mt-stack-lg divide-y-2 divide-on-background border-2 border-on-background">
              {pendingEvents.map((event) => (
                <div key={event.id} className="flex items-center gap-4 p-5">
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-headline-md font-black uppercase truncate">{event.title}</p>
                    <p className="mt-0.5 font-mono text-label-data uppercase text-on-surface-variant">
                      {event.host_name} · {event.city.toUpperCase()} · {formatDate(event.starts_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm">APPROVE</Button>
                    <Button size="sm" variant="destructive">REJECT</Button>
                    <Link href={`/e/${event.id}`}>
                      <Button size="sm" variant="ghost">VIEW ↗</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* all events */}
        <section className="mt-stack-xl pb-stack-xl">
          <h2 className="font-mono text-label-mono font-semibold uppercase tracking-widest text-on-surface-variant border-l-4 border-primary pl-3">
            ALL EVENTS ({allEvents.length})
          </h2>
          <div className="mt-stack-lg divide-y-2 divide-on-background border-2 border-on-background">
            {allEvents.map((event) => (
              <div key={event.id} className="flex items-center gap-4 p-4">
                <span className="shrink-0 border border-outline px-2 py-0.5 font-mono text-label-data uppercase text-on-surface-variant">
                  {event.state.replace(/_/g, " ")}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-label-mono font-semibold uppercase truncate">{event.title}</p>
                  <p className="font-mono text-label-data uppercase text-on-surface-variant">
                    {event.host_name} · {event.city.toUpperCase()}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {event.state === "published" && (
                    <Button size="sm" variant="destructive">TAKE DOWN</Button>
                  )}
                  <Link href={`/e/${event.id}`}>
                    <Button size="sm" variant="ghost">VIEW ↗</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function AdminStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`border-r-2 border-on-background p-5 last:border-r-0 ${accent ? "bg-primary text-on-primary" : ""}`}>
      <p className={`font-mono text-label-data uppercase tracking-widest ${accent ? "text-on-primary/70" : "text-on-surface-variant"}`}>
        {label}
      </p>
      <p className="mt-1 font-serif text-headline-md font-black uppercase">{value}</p>
    </div>
  );
}
