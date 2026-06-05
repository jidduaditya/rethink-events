import Link from "next/link";
import { BRAND } from "@/lib/brand";

export default function EventNotFound() {
  return (
    <div className="dot-grid flex min-h-[60dvh] items-center justify-center p-stack-md">
      <div className="text-center">
        <h1 className="mb-stack-md font-serif text-headline-lg font-bold text-on-background">
          {BRAND.errors.notFound}
        </h1>
        <Link
          href="/"
          className="inline-block border-2 border-on-background bg-surface px-8 py-3 font-mono text-label-mono uppercase font-semibold hard-shadow hard-shadow-hover hard-shadow-active"
        >
          BACK TO FEED
        </Link>
      </div>
    </div>
  );
}
