"use client";

import { BRAND } from "@/lib/brand";

export default function RootError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-stack-lg">
      <h1 className="font-serif text-headline-lg font-bold uppercase text-on-surface">
        {BRAND.errors.generic}
      </h1>
      <button
        onClick={reset}
        className="mt-stack-lg border-2 border-on-background bg-primary px-8 py-3 font-mono text-label-mono font-semibold uppercase text-on-primary hard-shadow hard-shadow-hover hard-shadow-active transition-transform"
      >
        RELOAD
      </button>
    </div>
  );
}
