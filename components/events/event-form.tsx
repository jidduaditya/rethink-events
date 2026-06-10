"use client";

import { useState, useCallback, type FormEvent } from "react";
import { Wifi, MapPin } from "lucide-react";
import type { Event, EventType, RegisterMode } from "@/lib/types";
import { validateEventForm } from "@/lib/validators";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

type EventFormData = {
  title: string;
  description: string;
  event_type: EventType;
  starts_at: string;
  ends_at: string;
  meet_url: string;
  location_name: string;
  location_address: string;
  capacity: string;
  city: string;
  image_url: string;
  speaker_name: string;
  speaker_bio: string;
  speaker_photo_url: string;
  register_mode: RegisterMode;
  register_url: string;
};

export type PreparedEventData = {
  title: string;
  description: string;
  event_type: EventType;
  starts_at: string;
  ends_at: string;
  timezone: string;
  meet_url: string | null;
  location_name: string | null;
  location_address: string | null;
  capacity: number | null;
  city: string | null;
  image_url: string | null;
  speaker_name: string | null;
  speaker_bio: string | null;
  speaker_photo_url: string | null;
  register_mode: RegisterMode;
  register_url: string | null;
};

function prepareFormData(form: EventFormData): PreparedEventData {
  const trimOrNull = (v: string) => (v.trim() ? v.trim() : null);
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    event_type: form.event_type,
    starts_at: new Date(form.starts_at).toISOString(),
    ends_at: new Date(form.ends_at).toISOString(),
    timezone: "Asia/Kolkata",
    meet_url: form.event_type === "online" ? form.meet_url.trim() : null,
    location_name: form.event_type === "offline" ? form.location_name.trim() : null,
    location_address: form.event_type === "offline" && form.location_address.trim() ? form.location_address.trim() : null,
    capacity: form.capacity.trim() ? parseInt(form.capacity, 10) : null,
    city: trimOrNull(form.city),
    image_url: trimOrNull(form.image_url),
    speaker_name: trimOrNull(form.speaker_name),
    speaker_bio: trimOrNull(form.speaker_bio),
    speaker_photo_url: trimOrNull(form.speaker_photo_url),
    register_mode: form.register_mode,
    register_url: form.register_mode === "external" ? trimOrNull(form.register_url) : null,
  };
}

type EventFormProps = {
  event?: Event;
  onSubmit: (data: PreparedEventData) => void;
  isSubmitting: boolean;
};

function toLocalDatetime(utc: string): string {
  if (!utc) return "";
  const d = new Date(utc);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export function EventForm({ event, onSubmit, isSubmitting }: EventFormProps) {
  const [form, setForm] = useState<EventFormData>({
    title: event?.title ?? "",
    description: event?.description ?? "",
    event_type: event?.event_type ?? "offline",
    starts_at: event?.starts_at ? toLocalDatetime(event.starts_at) : "",
    ends_at: event?.ends_at ? toLocalDatetime(event.ends_at) : "",
    meet_url: event?.meet_url ?? "",
    location_name: event?.location_name ?? "",
    location_address: event?.location_address ?? "",
    capacity: event?.capacity?.toString() ?? "",
    city: event?.city ?? "",
    image_url: event?.image_url ?? "",
    speaker_name: event?.speaker_name ?? "",
    speaker_bio: event?.speaker_bio ?? "",
    speaker_photo_url: event?.speaker_photo_url ?? "",
    register_mode: event?.register_mode ?? "native",
    register_url: event?.register_url ?? "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof EventFormData, string>>>({});

  const update = useCallback(
    <K extends keyof EventFormData>(field: K, value: EventFormData[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    []
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const result = validateEventForm(form);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    onSubmit(prepareFormData(form));
  };

  const isValid = form.title.trim() && form.description.trim() && form.starts_at && form.ends_at;

  const inputBase =
    "w-full border-2 border-on-background bg-surface px-4 py-3 text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none";

  return (
    <form
      onSubmit={handleSubmit}
      className="border-4 border-on-background hard-shadow bg-surface p-stack-lg max-w-3xl mx-auto"
    >
      {/* Title */}
      <div className="mb-6">
        <label className="block font-mono text-label-mono uppercase font-semibold text-on-surface-variant mb-2">
          EVENT NAME
        </label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          className={inputBase}
          maxLength={200}
        />
        {errors.title && (
          <p className="mt-1 text-error text-label-data font-mono">{errors.title}</p>
        )}
      </div>

      {/* Description */}
      <div className="mb-6">
        <label className="block font-mono text-label-mono uppercase font-semibold text-on-surface-variant mb-2">
          DESCRIPTION
        </label>
        <textarea
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder={BRAND.create.descriptionPlaceholder}
          rows={4}
          className={cn(inputBase, "resize-y")}
          maxLength={5000}
        />
        {errors.description && (
          <p className="mt-1 text-error text-label-data font-mono">{errors.description}</p>
        )}
      </div>

      {/* Date and Time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block font-mono text-label-mono uppercase font-semibold text-on-surface-variant mb-2">
            STARTS AT
          </label>
          <input
            type="datetime-local"
            value={form.starts_at}
            onChange={(e) => update("starts_at", e.target.value)}
            className={inputBase}
          />
          {errors.starts_at && (
            <p className="mt-1 text-error text-label-data font-mono">{errors.starts_at}</p>
          )}
        </div>
        <div>
          <label className="block font-mono text-label-mono uppercase font-semibold text-on-surface-variant mb-2">
            ENDS AT
          </label>
          <input
            type="datetime-local"
            value={form.ends_at}
            onChange={(e) => update("ends_at", e.target.value)}
            className={inputBase}
          />
          {errors.ends_at && (
            <p className="mt-1 text-error text-label-data font-mono">{errors.ends_at}</p>
          )}
        </div>
      </div>

      {/* City + Image URL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block font-mono text-label-mono uppercase font-semibold text-on-surface-variant mb-2">
            CITY (OPTIONAL)
          </label>
          <input
            type="text"
            list="city-options"
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            placeholder="Bangalore"
            className={inputBase}
            maxLength={100}
          />
          <datalist id="city-options">
            {BRAND.cities.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="block font-mono text-label-mono uppercase font-semibold text-on-surface-variant mb-2">
            IMAGE URL (OPTIONAL)
          </label>
          <input
            type="url"
            value={form.image_url}
            onChange={(e) => update("image_url", e.target.value)}
            placeholder="https://..."
            className={inputBase}
          />
        </div>
      </div>

      {/* Event Format toggle */}
      <div className="mb-6">
        <label className="block font-mono text-label-mono uppercase font-semibold text-on-surface-variant mb-2">
          EVENT FORMAT
        </label>
        <div className="flex gap-0">
          <button
            type="button"
            onClick={() => update("event_type", "online")}
            className={cn(
              "flex items-center gap-2 px-6 py-3 font-mono text-label-mono uppercase font-semibold transition-colors",
              form.event_type === "online"
                ? "bg-primary text-on-primary"
                : "bg-surface border-2 border-on-background"
            )}
          >
            <Wifi className="h-4 w-4" />
            ONLINE
          </button>
          <button
            type="button"
            onClick={() => update("event_type", "offline")}
            className={cn(
              "flex items-center gap-2 px-6 py-3 font-mono text-label-mono uppercase font-semibold transition-colors",
              form.event_type === "offline"
                ? "bg-on-background text-surface"
                : "bg-surface border-2 border-on-background"
            )}
          >
            <MapPin className="h-4 w-4" />
            OFFLINE
          </button>
        </div>
      </div>

      {/* Conditional fields based on event type */}
      {form.event_type === "online" && (
        <div className="mb-6">
          <label className="block font-mono text-label-mono uppercase font-semibold text-on-surface-variant mb-2">
            MEETING URL
          </label>
          <input
            type="url"
            value={form.meet_url}
            onChange={(e) => update("meet_url", e.target.value)}
            placeholder="https://meet.google.com/..."
            className={inputBase}
          />
          {errors.meet_url && (
            <p className="mt-1 text-error text-label-data font-mono">{errors.meet_url}</p>
          )}
        </div>
      )}

      {form.event_type === "offline" && (
        <>
          <div className="mb-6">
            <label className="block font-mono text-label-mono uppercase font-semibold text-on-surface-variant mb-2">
              VENUE NAME
            </label>
            <input
              type="text"
              value={form.location_name}
              onChange={(e) => update("location_name", e.target.value)}
              className={inputBase}
            />
            {errors.location_name && (
              <p className="mt-1 text-error text-label-data font-mono">
                {errors.location_name}
              </p>
            )}
          </div>
          <div className="mb-6">
            <label className="block font-mono text-label-mono uppercase font-semibold text-on-surface-variant mb-2">
              VENUE ADDRESS (OPTIONAL)
            </label>
            <input
              type="text"
              value={form.location_address}
              onChange={(e) => update("location_address", e.target.value)}
              className={inputBase}
            />
          </div>
        </>
      )}

      {/* Capacity */}
      <div className="mb-6">
        <label className="block font-mono text-label-mono uppercase font-semibold text-on-surface-variant mb-2">
          CAPACITY (OPTIONAL)
        </label>
        <input
          type="number"
          min={1}
          value={form.capacity}
          onChange={(e) => update("capacity", e.target.value)}
          className={cn(inputBase, "max-w-[200px]")}
        />
        {errors.capacity && (
          <p className="mt-1 text-error text-label-data font-mono">{errors.capacity}</p>
        )}
      </div>

      {/* Speaker block */}
      <div className="mb-6">
        <label className="block font-mono text-label-mono uppercase font-semibold text-on-surface-variant mb-2">
          SPEAKER NAME (OPTIONAL)
        </label>
        <input
          type="text"
          value={form.speaker_name}
          onChange={(e) => update("speaker_name", e.target.value)}
          className={inputBase}
          maxLength={200}
        />
      </div>
      <div className="mb-6">
        <label className="block font-mono text-label-mono uppercase font-semibold text-on-surface-variant mb-2">
          SPEAKER BIO (OPTIONAL)
        </label>
        <textarea
          value={form.speaker_bio}
          onChange={(e) => update("speaker_bio", e.target.value)}
          rows={3}
          className={cn(inputBase, "resize-y")}
          maxLength={2000}
        />
      </div>
      <div className="mb-6">
        <label className="block font-mono text-label-mono uppercase font-semibold text-on-surface-variant mb-2">
          SPEAKER PHOTO URL (OPTIONAL)
        </label>
        <input
          type="url"
          value={form.speaker_photo_url}
          onChange={(e) => update("speaker_photo_url", e.target.value)}
          placeholder="https://..."
          className={inputBase}
        />
      </div>

      {/* Register mode toggle */}
      <div className="mb-6">
        <label className="block font-mono text-label-mono uppercase font-semibold text-on-surface-variant mb-2">
          REGISTRATION
        </label>
        <div className="flex gap-0">
          <button
            type="button"
            onClick={() => {
              update("register_mode", "native");
              update("register_url", "");
            }}
            className={cn(
              "px-6 py-3 font-mono text-label-mono uppercase font-semibold transition-colors",
              form.register_mode === "native"
                ? "bg-primary text-on-primary"
                : "bg-surface border-2 border-on-background"
            )}
          >
            RSVP HERE
          </button>
          <button
            type="button"
            onClick={() => update("register_mode", "external")}
            className={cn(
              "px-6 py-3 font-mono text-label-mono uppercase font-semibold transition-colors",
              form.register_mode === "external"
                ? "bg-on-background text-surface"
                : "bg-surface border-2 border-on-background"
            )}
          >
            EXTERNAL LINK
          </button>
        </div>
        {form.register_mode !== "external" && errors.register_url && (
          <p className="mt-1 text-error text-label-data font-mono">{errors.register_url}</p>
        )}
      </div>

      {form.register_mode === "external" && (
        <div className="mb-8">
          <label className="block font-mono text-label-mono uppercase font-semibold text-on-surface-variant mb-2">
            REGISTRATION URL
          </label>
          <input
            type="url"
            value={form.register_url}
            onChange={(e) => update("register_url", e.target.value)}
            placeholder="https://lu.ma/..."
            className={inputBase}
          />
          {errors.register_url && (
            <p className="mt-1 text-error text-label-data font-mono">{errors.register_url}</p>
          )}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!isValid || isSubmitting}
        className={cn(
          "bg-secondary-container text-on-secondary-container border-2 border-on-background w-full py-3 font-mono text-label-mono uppercase font-semibold hard-shadow hard-shadow-hover hard-shadow-active transition-transform",
          (!isValid || isSubmitting) && "opacity-50 pointer-events-none"
        )}
      >
        {isSubmitting
          ? "SUBMITTING..."
          : event
            ? "SAVE CHANGES"
            : BRAND.create.publish}
      </button>
    </form>
  );
}
