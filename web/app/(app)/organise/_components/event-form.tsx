"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { type ActionState } from "../actions";

const TAG_LABELS: Record<string, string> = {
  beginner: "BEGINNER",
  interview_prep: "INTERVIEW PREP",
  ai_pm: "AI PM",
  build: "BUILD",
  resume: "RESUME",
};

type DefaultValues = {
  title?: string | null;
  description?: string | null;
  city?: string | null;
  venue?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  capacity?: number | null;
  tags?: string[] | null;
};

// datetime-local input requires "YYYY-MM-DDTHH:MM" format.
// DB stores full ISO strings; slice to 16 chars for the input default value.
function toDatetimeLocal(iso?: string | null) {
  return iso ? iso.slice(0, 16) : "";
}

const inputClass =
  "w-full border-2 border-on-background bg-background px-3 py-2 font-sans text-body-md focus:outline-none focus:ring-2 focus:ring-primary";

export function EventForm({
  action,
  defaultValues,
  submitLabel = BRAND.create.publish,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues?: DefaultValues;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  const fieldError = (field: string) => state?.error?.fieldErrors[field]?.[0];

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state?.error?.formErrors?.length ? (
        <p className="border-2 border-error bg-error/10 px-4 py-3 font-mono text-label-mono text-error">
          {state.error.formErrors[0]}
        </p>
      ) : null}

      {/* Title */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="title"
          className="font-mono text-label-mono font-semibold uppercase"
        >
          TITLE *
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={defaultValues?.title ?? ""}
          className={inputClass}
        />
        {fieldError("title") && (
          <p className="font-mono text-label-data text-error">{fieldError("title")}</p>
        )}
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="description"
          className="font-mono text-label-mono font-semibold uppercase"
        >
          DESCRIPTION
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={defaultValues?.description ?? ""}
          placeholder={BRAND.create.descriptionPlaceholder}
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* City */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="city"
          className="font-mono text-label-mono font-semibold uppercase"
        >
          CITY *
        </label>
        <select
          id="city"
          name="city"
          required
          defaultValue={defaultValues?.city ?? ""}
          className={inputClass}
        >
          <option value="" disabled>
            Select city
          </option>
          {BRAND.cities.map((c) => (
            <option key={c} value={c.toLowerCase()}>
              {c}
            </option>
          ))}
        </select>
        {fieldError("city") && (
          <p className="font-mono text-label-data text-error">{fieldError("city")}</p>
        )}
      </div>

      {/* Venue */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="venue"
          className="font-mono text-label-mono font-semibold uppercase"
        >
          VENUE
        </label>
        <input
          id="venue"
          name="venue"
          type="text"
          defaultValue={defaultValues?.venue ?? ""}
          className={inputClass}
        />
      </div>

      {/* Starts / Ends */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="starts_at"
            className="font-mono text-label-mono font-semibold uppercase"
          >
            STARTS *
          </label>
          <input
            id="starts_at"
            name="starts_at"
            type="datetime-local"
            required
            defaultValue={toDatetimeLocal(defaultValues?.starts_at)}
            className={inputClass}
          />
          {fieldError("starts_at") && (
            <p className="font-mono text-label-data text-error">
              {fieldError("starts_at")}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="ends_at"
            className="font-mono text-label-mono font-semibold uppercase"
          >
            ENDS *
          </label>
          <input
            id="ends_at"
            name="ends_at"
            type="datetime-local"
            required
            defaultValue={toDatetimeLocal(defaultValues?.ends_at)}
            className={inputClass}
          />
          {fieldError("ends_at") && (
            <p className="font-mono text-label-data text-error">
              {fieldError("ends_at")}
            </p>
          )}
        </div>
      </div>

      {/* Capacity */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="capacity"
          className="font-mono text-label-mono font-semibold uppercase"
        >
          CAPACITY (OPTIONAL)
        </label>
        <input
          id="capacity"
          name="capacity"
          type="number"
          min="1"
          defaultValue={defaultValues?.capacity ?? ""}
          className={inputClass}
        />
        {fieldError("capacity") && (
          <p className="font-mono text-label-data text-error">
            {fieldError("capacity")}
          </p>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-col gap-2">
        <span className="font-mono text-label-mono font-semibold uppercase">
          TAGS
        </span>
        <div className="flex flex-wrap gap-3">
          {Object.entries(TAG_LABELS).map(([value, label]) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 border-2 border-on-background px-3 py-1.5 font-mono text-label-mono font-semibold uppercase has-[:checked]:bg-secondary-container has-[:checked]:text-on-secondary-container"
            >
              <input
                type="checkbox"
                name="tags"
                value={value}
                defaultChecked={defaultValues?.tags?.includes(value) ?? false}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="pt-2">
        <Button type="submit" disabled={pending} size="lg">
          {pending ? "SAVING..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
