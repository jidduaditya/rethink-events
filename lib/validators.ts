import type { EventType, RegisterMode } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmails(raw: string): string[] {
  const seen = new Set<string>();
  for (const token of raw.split(/[,\n]/)) {
    const email = token.trim().toLowerCase();
    if (EMAIL_RE.test(email)) seen.add(email);
  }
  return [...seen];
}

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

type ValidationResult = {
  valid: boolean;
  errors: Partial<Record<keyof EventFormData, string>>;
};

export function validateEventForm(data: EventFormData): ValidationResult {
  const errors: ValidationResult["errors"] = {};

  // Title
  if (!data.title.trim()) {
    errors.title = "Title is required";
  } else if (data.title.length > 200) {
    errors.title = "Title must be under 200 characters";
  }

  // Description
  if (!data.description.trim()) {
    errors.description = "Description is required";
  } else if (data.description.length > 5000) {
    errors.description = "Description must be under 5000 characters";
  }

  // Dates
  if (!data.starts_at) {
    errors.starts_at = "Start date and time is required";
  } else if (new Date(data.starts_at) <= new Date()) {
    errors.starts_at = "Event must be in the future";
  }

  if (!data.ends_at) {
    errors.ends_at = "End date and time is required";
  } else if (data.starts_at && new Date(data.ends_at) <= new Date(data.starts_at)) {
    errors.ends_at = "End time must be after start time";
  }

  // Event type specific
  if (data.event_type === "online") {
    if (!data.meet_url?.trim()) {
      errors.meet_url = "Meeting URL is required for online events";
    } else {
      try {
        new URL(data.meet_url);
      } catch {
        errors.meet_url = "Must be a valid URL";
      }
    }
  }

  if (data.event_type === "offline") {
    if (!data.location_name?.trim()) {
      errors.location_name = "Venue name is required for offline events";
    }
  }

  // Capacity
  if (data.capacity?.trim()) {
    const cap = parseInt(data.capacity, 10);
    if (isNaN(cap) || cap < 1) {
      errors.capacity = "Capacity must be at least 1";
    }
  }

  // Registration mode
  if (data.register_mode === "external") {
    if (!data.register_url || !/^https?:\/\//.test(data.register_url)) {
      errors.register_url = "External events need a valid http(s) registration URL.";
    }
  } else if (data.register_url) {
    errors.register_url = "Native events must not have a registration URL.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
