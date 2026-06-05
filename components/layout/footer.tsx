import { BRAND } from "@/lib/brand";

export function Footer() {
  return (
    <footer className="border-t-4 border-on-background bg-on-background px-grid-margin py-stack-xl text-surface">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-stack-lg md:flex-row md:items-center md:justify-between">
        <span className="font-serif text-headline-lg font-black uppercase tracking-tighter">
          {BRAND.name}
        </span>

        <div className="flex flex-wrap gap-6">
          {BRAND.footer.links.map((link) => (
            <span
              key={link}
              className="cursor-default font-mono text-label-mono font-semibold uppercase text-surface/80 transition-colors hover:text-surface"
            >
              {link}
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-stack-lg max-w-[1600px]">
        <p className="font-mono text-label-data uppercase text-surface/70">
          {BRAND.footer.copyright}
        </p>
      </div>
    </footer>
  );
}
