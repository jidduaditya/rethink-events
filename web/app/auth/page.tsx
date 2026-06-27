"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";

// ponytail: Phase 1 — static form. Email OTP via Supabase wires in slice 3.1.

export default function AuthPage() {
  const [sent, setSent] = useState(false);

  return (
    <AppShell>
      <div className="mx-auto max-w-md px-grid-margin py-stack-xl">
        <h1 className="font-serif text-headline-lg font-black uppercase">
          {sent ? "CHECK YOUR EMAIL" : "SIGN IN"}
        </h1>
        <p className="mt-stack-sm font-mono text-label-mono uppercase text-on-surface-variant">
          {sent
            ? "We sent a magic link. Click it to sign in."
            : "We use email magic links — no password needed."}
        </p>

        {!sent ? (
          <form
            className="mt-stack-xl flex flex-col gap-stack-lg"
            onSubmit={(e) => { e.preventDefault(); setSent(true); }}
          >
            <div className="flex flex-col gap-2">
              <label className="font-mono text-label-mono font-semibold uppercase tracking-widest text-on-surface-variant">
                EMAIL
              </label>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                required
                className="input-base"
              />
            </div>
            <Button type="submit" size="lg">{BRAND.hero.authButton}</Button>
          </form>
        ) : (
          <div className="mt-stack-xl border-4 border-on-background bg-secondary-container p-8 text-center hard-shadow">
            <p className="font-mono text-label-mono font-semibold uppercase text-on-secondary-container">
              MAGIC LINK SENT
            </p>
            <p className="mt-2 font-mono text-label-data uppercase text-on-secondary-container">
              Close this tab and click the link in your inbox.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
