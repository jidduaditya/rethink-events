"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";
import { PageThemeToggle } from "./page-theme-toggle";
import { createClient } from "@/lib/supabase/client";

const navLinks = [
  { href: "/", label: "EVENTS" },
  { href: "/me", label: "MY EVENTS" },
];

function useProfile() {
  const supabase = createClient();
  return useQuery({
    queryKey: ["profile", "me"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", session.user.id)
        .single();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

function ProfileMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: profile } = useProfile();
  const supabase = createClient();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!profile) return null;

  const initials = profile.full_name
    ? profile.full_name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center border-2 border-on-background bg-primary font-mono text-label-data font-semibold uppercase text-on-primary hard-shadow hard-shadow-hover hard-shadow-active"
        aria-label="Profile menu"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 border-4 border-on-background bg-background hard-shadow z-50">
          <div className="border-b-2 border-on-background px-4 py-3">
            <p className="font-mono text-label-data font-semibold uppercase text-on-surface truncate">
              {profile.full_name}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-3 text-left font-mono text-label-data font-semibold uppercase text-foreground hover:bg-secondary-container transition-colors"
          >
            LOGOUT
          </button>
        </div>
      )}
    </div>
  );
}

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

      <div className="hidden items-center gap-3 md:flex">
        <PageThemeToggle />
        <ProfileMenu />
      </div>
    </nav>
  );
}
