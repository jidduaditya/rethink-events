// ponytail: Phase-0 placeholder home — proves the harvested design system + shell
// render. Real curated feed lands in Phase 1/3 (see plan slice 1.2 / 3.5).
import { AppShell } from "@/components/layout/app-shell";
import { BRAND } from "@/lib/brand";

export default function Home() {
  return (
    <AppShell>
      <section className="grid grid-cols-1 border-b-4 border-on-background lg:grid-cols-12">
        <div className="flex min-h-[480px] items-center border-on-background bg-secondary-container p-grid-margin lg:col-span-8 lg:border-r-4">
          <h1 className="font-serif text-display-lg font-black uppercase">
            {BRAND.hero.heading}
          </h1>
        </div>
        <div className="flex flex-col justify-center gap-stack-md bg-background p-grid-margin">
          <p className="font-mono text-label-mono uppercase text-on-surface-variant">
            {BRAND.tagline}
          </p>
          <p className="font-serif text-body-lg">
            The participation layer for the ReThink community. Foundation is up —
            feed, events, and RSVP land next.
          </p>
        </div>
      </section>

      <section className="bg-primary px-grid-margin py-stack-xl text-center text-on-primary">
        <p className="mx-auto max-w-5xl font-serif text-headline-lg font-black italic leading-tight">
          &ldquo;{BRAND.manifesto}&rdquo;
        </p>
      </section>
    </AppShell>
  );
}
