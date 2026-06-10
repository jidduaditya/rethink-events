"use client";

import { cn } from "@/lib/utils";
import type { FeedFilters } from "@/lib/feed-filters";

type FilterBarProps = {
  value: FeedFilters;
  cities: string[];
  onChange: (f: FeedFilters) => void;
};

const FORMAT_OPTIONS: { label: string; value: FeedFilters["format"] }[] = [
  { label: "All", value: "all" },
  { label: "Online", value: "online" },
  { label: "Offline", value: "offline" },
];

const WHEN_OPTIONS: { label: string; value: FeedFilters["when"] }[] = [
  { label: "All", value: "all" },
  { label: "Today", value: "today" },
  { label: "This week", value: "week" },
];

function Segmented<T extends string>({
  label,
  options,
  active,
  onSelect,
}: {
  label: string;
  options: { label: string; value: T }[];
  active: T;
  onSelect: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-label-data uppercase font-semibold text-on-surface-variant">
        {label}
      </span>
      <div className="flex border-2 border-on-background bg-surface">
        {options.map((opt, i) => {
          const isActive = opt.value === active;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              aria-pressed={isActive}
              className={cn(
                "min-h-[44px] px-4 font-mono text-label-mono uppercase font-semibold transition-colors",
                i > 0 && "border-l-2 border-on-background",
                isActive
                  ? "bg-primary text-on-primary hard-shadow"
                  : "bg-surface text-on-surface hover:bg-secondary-fixed"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FilterBar({ value, cities, onChange }: FilterBarProps) {
  return (
    <div className="mb-stack-xl flex flex-col gap-x-grid-gutter gap-y-stack-md border-2 border-on-background bg-surface-container p-grid-margin md:flex-row md:flex-wrap md:items-end">
      {/* City select */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="filter-city"
          className="font-mono text-label-data uppercase font-semibold text-on-surface-variant"
        >
          City
        </label>
        <select
          id="filter-city"
          value={value.city}
          onChange={(e) => onChange({ ...value, city: e.target.value })}
          className="min-h-[44px] border-2 border-on-background bg-surface px-3 font-mono text-label-mono uppercase font-semibold text-on-surface"
        >
          <option value="all">All cities</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>

      {/* Format segmented control */}
      <Segmented
        label="Format"
        options={FORMAT_OPTIONS}
        active={value.format}
        onSelect={(format) => onChange({ ...value, format })}
      />

      {/* When segmented control */}
      <Segmented
        label="When"
        options={WHEN_OPTIONS}
        active={value.when}
        onSelect={(when) => onChange({ ...value, when })}
      />
    </div>
  );
}
