import { describe, it, expect } from "vitest";
import { normalizeEmails, validateEventForm } from "@/lib/validators";

describe("normalizeEmails", () => {
  it("splits on commas/newlines, lowercases, trims, dedupes, drops invalid", () => {
    const out = normalizeEmails("A@x.com, a@x.com\n  B@y.com \n notanemail");
    expect(out).toEqual(["a@x.com", "b@y.com"]);
  });
  it("returns [] for empty input", () => {
    expect(normalizeEmails("")).toEqual([]);
  });
});

type EventFormInput = Parameters<typeof validateEventForm>[0];

describe("validateEventForm register rules", () => {
  it("requires register_url when mode is external", () => {
    const { errors } = validateEventForm({
      title: "T", description: "D", event_type: "online",
      starts_at: "2030-01-01T10:00", ends_at: "2030-01-01T11:00",
      register_mode: "external", register_url: "",
    } as Partial<EventFormInput> as EventFormInput);
    expect(errors.register_url).toBeTruthy();
  });
  it("rejects register_url when mode is native", () => {
    const { errors } = validateEventForm({
      title: "T", description: "D", event_type: "online",
      starts_at: "2030-01-01T10:00", ends_at: "2030-01-01T11:00",
      register_mode: "native", register_url: "https://x.com",
    } as Partial<EventFormInput> as EventFormInput);
    expect(errors.register_url).toBeTruthy();
  });
  it("accepts a valid https register_url when mode is external", () => {
    const { errors } = validateEventForm({
      title: "T", description: "D", event_type: "online",
      starts_at: "2030-01-01T10:00", ends_at: "2030-01-01T11:00",
      register_mode: "external", register_url: "https://lu.ma/event",
    } as Partial<EventFormInput> as EventFormInput);
    expect(errors.register_url).toBeFalsy();
  });
  it("accepts empty register_url when mode is native", () => {
    const { errors } = validateEventForm({
      title: "T", description: "D", event_type: "online",
      starts_at: "2030-01-01T10:00", ends_at: "2030-01-01T11:00",
      register_mode: "native", register_url: "",
    } as Partial<EventFormInput> as EventFormInput);
    expect(errors.register_url).toBeFalsy();
  });
});
