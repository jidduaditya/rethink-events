import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { MOCK_EVENTS } from "@/lib/mock";

// ponytail: Phase 1 — visual scaffold. Real attendee list via event_attendees() + check-in + broadcast land in slice 3.6.

// Mock attendees for the run view
const MOCK_ATTENDEES = [
  { id: "a1", full_name: "Aarav Shah", email: "aarav@test.com", checked_in: true },
  { id: "a2", full_name: "Meera Pillai", email: "meera@test.com", checked_in: false },
  { id: "a3", full_name: "Rohan Kapoor", email: "rohan@test.com", checked_in: false },
  { id: "a4", full_name: "Siya Joshi", email: "siya@test.com", checked_in: true },
  { id: "a5", full_name: "Dev Malhotra", email: "dev@test.com", checked_in: false },
];

export default async function RunEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = MOCK_EVENTS.find((e) => e.id === id);
  if (!event) notFound();

  const checkedIn = MOCK_ATTENDEES.filter((a) => a.checked_in).length;

  return (
    <AppShell>
      <div className="px-grid-margin py-stack-xl">
        {/* header */}
        <div className="flex flex-col gap-2 border-b-4 border-on-background pb-stack-lg md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-mono text-label-mono uppercase text-on-surface-variant">
              RUN VIEW
            </p>
            <h1 className="font-serif text-headline-lg font-black uppercase leading-tight">
              {event.title}
            </h1>
          </div>
          <div className="flex gap-3">
            <Link href={`/organise/${id}/edit`}>
              <Button variant="outline" size="sm">EDIT</Button>
            </Link>
            <Link href="/organise">
              <Button variant="ghost" size="sm">← DASHBOARD</Button>
            </Link>
          </div>
        </div>

        {/* stats row */}
        <div className="mt-stack-lg grid grid-cols-2 gap-4 border-2 border-on-background md:grid-cols-4">
          <Stat label="GOING" value={String(MOCK_ATTENDEES.length)} />
          <Stat label="CHECKED IN" value={`${checkedIn}/${MOCK_ATTENDEES.length}`} />
          {event.capacity != null && (
            <Stat label="CAPACITY" value={String(event.capacity)} />
          )}
          <Stat label="CITY" value={event.city.toUpperCase()} />
        </div>

        {/* broadcast */}
        <div className="mt-stack-xl border-2 border-on-background p-6">
          <p className="font-mono text-label-mono font-semibold uppercase">BROADCAST MESSAGE</p>
          <p className="mt-1 font-mono text-label-data uppercase text-on-surface-variant">
            Sent to all attendees via email. One-time only.
          </p>
          <textarea
            rows={3}
            placeholder="e.g. Venue changed to Level 2. See you soon!"
            className="input-base mt-4 resize-none w-full"
          />
          <div className="mt-3">
            <Button size="sm">SEND TO ALL</Button>
          </div>
        </div>

        {/* attendee list */}
        <div className="mt-stack-xl">
          <p className="font-mono text-label-mono font-semibold uppercase">ATTENDEES</p>
          <div className="mt-stack-lg divide-y-2 divide-on-background border-2 border-on-background">
            {MOCK_ATTENDEES.map((a) => (
              <div key={a.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1">
                  <p className="font-mono text-label-mono font-semibold uppercase">{a.full_name}</p>
                  <p className="font-mono text-label-data uppercase text-on-surface-variant">{a.email}</p>
                </div>
                <Button
                  size="sm"
                  variant={a.checked_in ? "secondary" : "outline"}
                >
                  {a.checked_in ? "CHECKED IN ✓" : "CHECK IN"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r-2 border-on-background p-5 last:border-r-0">
      <p className="font-mono text-label-data uppercase tracking-widest text-on-surface-variant">{label}</p>
      <p className="mt-1 font-serif text-headline-md font-black uppercase">{value}</p>
    </div>
  );
}
