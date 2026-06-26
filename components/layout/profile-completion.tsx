"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/brand";
import type { Profile, ProfileGoal, ProfileLevel } from "@/lib/types";

type Props = {
  profile: Pick<Profile, "id" | "full_name" | "goal" | "level">;
};

export function ProfileCompletion({ profile }: Props) {
  const router = useRouter();
  const nameAlreadySet = profile.full_name !== "";

  const [fullName, setFullName] = useState(profile.full_name);
  const [goal, setGoal] = useState<ProfileGoal | "">(profile.goal ?? "");
  const [level, setLevel] = useState<ProfileLevel | "">(profile.level ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    !loading &&
    (nameAlreadySet || fullName.trim() !== "") &&
    goal !== "" &&
    level !== "";

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        ...(nameAlreadySet ? {} : { full_name: fullName.trim() }),
        goal,
        level,
      })
      .eq("id", profile.id);

    setLoading(false);

    if (updateError) {
      setError("Something went wrong. Try again.");
      return;
    }

    router.refresh();
  }, [canSubmit, nameAlreadySet, fullName, goal, level, profile.id, router]);

  const heading = nameAlreadySet
    ? BRAND.profile.headingGoalOnly
    : BRAND.profile.headingNew;

  return (
    <div className="min-h-dvh flex items-center justify-center p-stack-md dot-grid">
      <div className="border-4 border-on-background hard-shadow bg-surface p-stack-lg w-full max-w-[420px]">
        <h2 className="text-headline-md font-serif font-bold text-on-background mb-6">
          {heading}
        </h2>

        {!nameAlreadySet && (
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
              placeholder={BRAND.profile.namePlaceholder}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="border-2 border-on-background bg-surface w-full p-3 font-sans text-body-md focus:border-primary outline-none"
            />
          </div>
        )}

        <div className="mb-4">
          <label
            htmlFor="goal"
            className="text-label-mono font-mono uppercase font-semibold text-on-background block mb-2"
          >
            {BRAND.profile.goalLabel}
          </label>
          <select
            id="goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value as ProfileGoal)}
            className="border-2 border-on-background bg-surface w-full p-3 font-sans text-body-md focus:border-primary outline-none appearance-none"
          >
            <option value="" disabled>
              Pick one
            </option>
            {BRAND.profile.goals.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label
            htmlFor="level"
            className="text-label-mono font-mono uppercase font-semibold text-on-background block mb-2"
          >
            {BRAND.profile.levelLabel}
          </label>
          <select
            id="level"
            value={level}
            onChange={(e) => setLevel(e.target.value as ProfileLevel)}
            className="border-2 border-on-background bg-surface w-full p-3 font-sans text-body-md focus:border-primary outline-none appearance-none"
          >
            <option value="" disabled>
              Pick one
            </option>
            {BRAND.profile.levels.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-body-md font-sans text-[#b00020] mb-4">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="bg-primary text-on-primary border-2 border-on-background w-full py-3 font-mono text-label-mono uppercase font-semibold hard-shadow hard-shadow-hover hard-shadow-active disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? BRAND.profile.submitting : BRAND.profile.submit}
        </button>
      </div>
    </div>
  );
}
