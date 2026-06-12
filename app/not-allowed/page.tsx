// Public page — no auth required, no dead end.
// Shown when a logged-in user is not on the allowlist,
// or directly by visitors who want to understand the product.

import Link from "next/link";

export default function NotAllowedPage() {
  return (
    <div className="dot-grid flex min-h-dvh flex-col items-center justify-center bg-surface px-grid-margin text-center">
      <div className="max-w-lg border-4 border-on-background bg-surface p-stack-xl hard-shadow">
        {/* Wordmark */}
        <p className="mb-stack-md font-mono text-label-mono font-semibold uppercase text-on-surface-variant">
          RETHINK EVENTS
        </p>

        {/* Primary message */}
        <h1 className="font-serif text-headline-lg font-black uppercase text-on-background">
          THE EVENTS LAYER OF THE RETHINK ECOSYSTEM.
        </h1>
        <p className="mt-stack-md font-mono text-label-mono uppercase text-on-surface-variant">
          MEMBERS ONLY, FOR NOW.
        </p>

        {/* Separator */}
        <div className="my-stack-lg border-t-2 border-on-background" />

        {/* Actions */}
        <div className="flex flex-col gap-stack-sm">
          {/* Primary: log in if already a member */}
          <Link
            href="/login"
            className="block border-4 border-on-background bg-secondary-container px-6 py-4 font-mono text-label-mono font-semibold uppercase text-on-background hard-shadow hard-shadow-hover hard-shadow-active"
          >
            MEMBER? LOG IN
          </Link>

          {/* Secondary: find out about Rethink */}
          <a
            href="#"
            rel="noopener noreferrer"
            className="block border-2 border-on-background bg-surface px-6 py-3 font-mono text-label-mono font-semibold uppercase text-on-surface-variant hard-shadow hard-shadow-hover"
          >
            LEARN ABOUT RETHINK
          </a>
        </div>
      </div>
    </div>
  );
}
