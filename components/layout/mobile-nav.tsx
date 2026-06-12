"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, Calendar, PlusSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "EVENTS", icon: Calendar },
  { href: "/organise", label: "ORGANISE", icon: PlusSquare },
  { href: "/me", label: "MY EVENTS", icon: User },
  { href: "/past", label: "PAST", icon: Archive },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t-4 border-on-background bg-background md:hidden">
      {navItems.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 py-2 font-mono text-label-data font-semibold uppercase",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
