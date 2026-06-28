const BADGE_CLASS: Record<string, string> = {
  draft: "border-outline text-on-surface-variant",
  pending_review:
    "border-secondary-container bg-secondary-container/30 text-on-secondary-container",
  published: "border-primary bg-primary/10 text-primary",
  cancelled: "border-error bg-error/10 text-error",
  taken_down: "border-outline text-on-surface-variant line-through",
};

const BADGE_LABEL: Record<string, string> = {
  draft: "DRAFT",
  pending_review: "PENDING REVIEW",
  published: "PUBLISHED",
  cancelled: "CANCELLED",
  taken_down: "TAKEN DOWN",
};

export function StateBadge({ state }: { state: string }) {
  const cls = BADGE_CLASS[state] ?? BADGE_CLASS.draft;
  const label = BADGE_LABEL[state] ?? state.toUpperCase().replace(/_/g, " ");
  return (
    <span
      className={`inline-block border-2 px-2 py-0.5 font-mono text-label-data font-semibold uppercase ${cls}`}
    >
      {label}
    </span>
  );
}
