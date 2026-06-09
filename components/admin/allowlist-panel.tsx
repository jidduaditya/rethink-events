"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useAllowlist, useAllowlistMutations } from "@/hooks/use-allowlist";
import { normalizeEmails } from "@/lib/validators";

export function AllowlistPanel() {
  const { data: entries = [], isLoading } = useAllowlist();
  const { add, remove } = useAllowlistMutations();
  const [raw, setRaw] = useState("");

  function handleAdd() {
    const emails = normalizeEmails(raw);
    if (emails.length === 0) return;
    add.mutate(emails, { onSuccess: () => setRaw("") });
  }

  return (
    <section className="border-4 border-on-background bg-surface p-stack-lg hard-shadow">
      <h2 className="mb-stack-md font-serif text-headline-md font-bold uppercase">
        Whitelist
      </h2>
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder="Paste emails, comma or newline separated"
        rows={3}
        className="w-full border-2 border-on-background bg-surface p-3 font-sans text-body-md focus:border-primary focus:ring-0"
      />
      <button
        onClick={handleAdd}
        disabled={add.isPending || normalizeEmails(raw).length === 0}
        className="mt-stack-sm border-2 border-on-background bg-primary px-5 py-2 font-mono text-label-mono uppercase text-on-primary hard-shadow hard-shadow-hover disabled:opacity-50"
      >
        {add.isPending ? "Adding..." : `Add ${normalizeEmails(raw).length || ""}`.trim()}
      </button>

      <ul className="mt-stack-lg divide-y-2 divide-on-background border-t-2 border-on-background">
        {isLoading && <li className="py-3 font-mono text-label-data">Loading...</li>}
        {entries.map((e) => (
          <li key={e.id} className="flex items-center justify-between py-2">
            <span className="font-mono text-label-data">{e.email}</span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-label-data uppercase text-on-surface-variant">
                {e.source}
              </span>
              <button onClick={() => remove.mutate(e.id)} aria-label={`Remove ${e.email}`}>
                <Trash2 className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
