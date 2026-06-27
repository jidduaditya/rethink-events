import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a UTC date for display in a given timezone.
 * Returns an object with date and time parts for flexible rendering.
 */
export function formatEventTime(
  utcDate: string | Date,
  timezone: string = "Asia/Kolkata"
) {
  const d = typeof utcDate === "string" ? new Date(utcDate) : utcDate;

  const date = d.toLocaleDateString("en-IN", {
    timeZone: timezone,
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const time = d.toLocaleTimeString("en-IN", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const full = d.toLocaleDateString("en-IN", {
    timeZone: timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return { date, time, full };
}
