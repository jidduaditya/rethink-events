import Link from "next/link";

type EmptyStateProps = {
  message: string;
  actionLabel?: string;
  actionHref?: string;
};

export function EmptyState({ message, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <p className="font-mono text-label-mono uppercase text-on-surface-variant text-center">
        {message}
      </p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="bg-secondary-container text-on-secondary-container border-2 border-on-background py-3 px-6 font-mono text-label-mono uppercase hard-shadow hard-shadow-hover hard-shadow-active transition-transform inline-block"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
