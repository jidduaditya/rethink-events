import { describe, it, expect } from "vitest";
import { normalizeEmails } from "@/lib/validators";

describe("normalizeEmails", () => {
  it("splits on commas/newlines, lowercases, trims, dedupes, drops invalid", () => {
    const out = normalizeEmails("A@x.com, a@x.com\n  B@y.com \n notanemail");
    expect(out).toEqual(["a@x.com", "b@y.com"]);
  });
  it("returns [] for empty input", () => {
    expect(normalizeEmails("")).toEqual([]);
  });
});
