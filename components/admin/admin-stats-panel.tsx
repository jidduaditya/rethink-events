"use client";

type AdminStatsPanelProps = {
  totalEvents: number;
  totalMembers: number;
  pendingCount: number;
};

type StatCardProps = {
  label: string;
  value: number;
  accentClass: string;
};

function StatCard({ label, value, accentClass }: StatCardProps) {
  return (
    <div className="group relative border-4 border-on-background hard-shadow-black p-stack-lg overflow-hidden transition-transform hover:-translate-x-px hover:-translate-y-px">
      {/* Color reveal on hover */}
      <div
        className={`absolute inset-x-0 bottom-0 h-0 group-hover:h-full transition-all duration-300 ${accentClass} -z-0`}
      />

      <div className="relative z-10">
        <p className="font-mono text-label-mono uppercase font-semibold text-on-surface-variant mb-2">
          {label}
        </p>
        <p className="font-serif text-headline-lg font-black text-on-surface">
          {value}
        </p>
      </div>
    </div>
  );
}

export function AdminStatsPanel({
  totalEvents,
  totalMembers,
  pendingCount,
}: AdminStatsPanelProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-grid-gutter">
      <StatCard
        label="TOTAL EVENTS"
        value={totalEvents}
        accentClass="bg-primary"
      />
      <StatCard
        label="TOTAL MEMBERS"
        value={totalMembers}
        accentClass="bg-secondary-container"
      />
      <StatCard
        label="PENDING REVIEW"
        value={pendingCount}
        accentClass="bg-tertiary"
      />
    </div>
  );
}
