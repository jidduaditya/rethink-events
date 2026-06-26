"use client";

import React, { useState } from "react";
import { useFeatureEvent } from "@/hooks/use-feature-event";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import type { Event, ProfileGoal, ProfileLevel } from "@/lib/types";

type Props = {
  event: Pick<
    Event,
    "id" | "featured_for_goal" | "featured_for_level" | "featured_for_city"
  >;
};

export function FeaturedForPanel({ event }: Props) {
  const [goal, setGoal] = useState<ProfileGoal | "">(event.featured_for_goal ?? "");
  const [level, setLevel] = useState<ProfileLevel | "">(event.featured_for_level ?? "");
  const [city, setCity] = useState(event.featured_for_city ?? "");

  const { mutate, isPending, isSuccess } = useFeatureEvent(event.id);
  const lastAction = React.useRef<"save" | "clear" | null>(null);

  const isActive = !!event.featured_for_goal;
  const canSave = goal !== "" && level !== "" && city !== "";

  const selectBase =
    "border-2 border-on-background bg-surface w-full p-3 font-mono text-label-mono uppercase font-semibold focus:border-primary outline-none appearance-none";

  function handleSave() {
    if (!canSave) return;
    lastAction.current = "save";
    mutate({
      featured_for_goal:  goal as ProfileGoal,
      featured_for_level: level as ProfileLevel,
      featured_for_city:  city,
    });
  }

  function handleClear() {
    lastAction.current = "clear";
    setGoal("");
    setLevel("");
    setCity("");
    mutate({ featured_for_goal: null, featured_for_level: null, featured_for_city: null });
  }

  return (
    <div className="border-t-4 border-on-background mt-stack-md pt-stack-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-mono text-label-mono uppercase font-semibold text-on-surface-variant">
          FEATURE FOR AUDIENCE
        </h3>
        {isActive && (
          <span className="border border-primary px-2 py-0.5 font-mono text-label-data uppercase font-semibold text-primary">
            ACTIVE
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block font-mono text-label-data uppercase font-semibold text-on-surface-variant mb-2">
            GOAL
          </label>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value as ProfileGoal)}
            className={selectBase}
          >
            <option value="">— None —</option>
            {BRAND.profile.goals.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-mono text-label-data uppercase font-semibold text-on-surface-variant mb-2">
            LEVEL
          </label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as ProfileLevel)}
            className={selectBase}
          >
            <option value="">— None —</option>
            {BRAND.profile.levels.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-mono text-label-data uppercase font-semibold text-on-surface-variant mb-2">
            CITY
          </label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={selectBase}
          >
            <option value="">— None —</option>
            {BRAND.cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={!canSave || isPending}
          className={cn(
            "border-2 border-on-background px-6 py-2 font-mono text-label-mono uppercase font-semibold hard-shadow hard-shadow-hover hard-shadow-active bg-primary text-on-primary",
            (!canSave || isPending) && "opacity-50 pointer-events-none"
          )}
        >
          {isPending && lastAction.current === "save"
            ? BRAND.profile.submitting
            : isSuccess && lastAction.current === "save"
            ? "SAVED"
            : "FEATURE EVENT"}
        </button>
        {isActive && (
          <button
            onClick={handleClear}
            disabled={isPending}
            className="border-2 border-on-background px-6 py-2 font-mono text-label-mono uppercase font-semibold bg-surface text-on-surface hard-shadow hard-shadow-hover hard-shadow-active"
          >
            CLEAR
          </button>
        )}
      </div>
    </div>
  );
}
