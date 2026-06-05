"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";
import { PageThemeToggle } from "./page-theme-toggle";

const navLinks = [
  { href: "/", label: "EVENTS" },
  { href: "/organise", label: "ORGANISE" },
  { href: "/me", label: "MY EVENTS" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 flex h-20 items-center justify-between border-b-4 border-on-background bg-background px-grid-margin">
      <Link
        href="/"
        className="font-serif text-headline-lg font-black uppercase tracking-tighter text-foreground"
      >
        {BRAND.name}
      </Link>

      <div className="hidden items-center gap-6 md:flex">
        {navLinks.map((link) => {
          const isActive =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "font-mono text-label-mono font-semibold uppercase transition-colors",
                isActive
                  ? "text-primary underline decoration-4 underline-offset-8"
                  : "text-foreground hover:bg-secondary-container hover:px-2 hover:py-1"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      <div className="hidden md:block">
        <PageThemeToggle />
      </div>
    </nav>
  );
}
