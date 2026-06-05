"use client";

import { BRAND } from "@/lib/brand";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[60dvh] flex items-center justify-center p-stack-md">
      <div className="text-center">
        <h1 className="text-headline-lg font-serif font-bold text-on-background mb-6">
          {BRAND.errors.generic}
        </h1>
        <button
          onClick={reset}
          className="bg-primary text-on-primary border-2 border-on-background py-3 px-8 font-mono text-label-mono uppercase font-semibold hard-shadow hard-shadow-hover hard-shadow-active"
        >
          RELOAD
        </button>
      </div>
    </div>
  );
}
