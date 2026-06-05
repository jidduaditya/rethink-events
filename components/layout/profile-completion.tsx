"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ProfileCompletion({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    const trimmed = fullName.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ full_name: trimmed })
      .eq("id", profileId);

    setLoading(false);

    if (updateError) {
      setError("Something went wrong. Try again.");
      return;
    }

    router.refresh();
  }, [fullName, loading, profileId, router]);

  return (
    <div className="min-h-dvh flex items-center justify-center p-stack-md dot-grid">
      <div className="border-4 border-on-background hard-shadow bg-surface p-stack-lg w-full max-w-[400px]">
        <h2 className="text-headline-md font-serif font-bold text-on-background mb-6">
          What should we call you?
        </h2>

        <div className="mb-4">
          <label
            htmlFor="full_name"
            className="text-label-mono font-mono uppercase font-semibold text-on-background block mb-2"
          >
            FULL NAME
          </label>
          <input
            id="full_name"
            type="text"
            autoComplete="name"
            placeholder="Your name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            className="border-2 border-on-background bg-surface w-full p-3 font-sans text-body-md focus:border-primary outline-none"
          />
        </div>

        {error && (
          <p className="text-body-md font-sans text-[#b00020] mb-4">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !fullName.trim()}
          className="bg-primary text-on-primary border-2 border-on-background w-full py-3 font-mono text-label-mono uppercase font-semibold hard-shadow hard-shadow-hover hard-shadow-active disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? "SAVING..." : "LET'S GO"}
        </button>
      </div>
    </div>
  );
}
