"use client";

import { createClient } from "@/lib/supabase/client";

export default function NotAllowedPage() {
  async function signOut() {
    await createClient().auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="dot-grid flex min-h-dvh flex-col items-center justify-center bg-surface px-grid-margin text-center">
      <div className="border-4 border-on-background bg-surface p-stack-xl hard-shadow max-w-lg">
        <h1 className="font-serif text-headline-lg font-black uppercase text-on-background">
          Not on the list yet
        </h1>
        <p className="mt-stack-md font-sans text-body-lg text-on-surface-variant">
          This app is currently open to Rethink Premium members only. If you think
          this is a mistake, reach out to the Rethink team.
        </p>
        <button
          onClick={signOut}
          className="mt-stack-lg border-2 border-on-background bg-primary px-6 py-3 font-mono text-label-mono uppercase text-on-primary hard-shadow hard-shadow-hover"
        >
          Use a different email
        </button>
      </div>
    </div>
  );
}
