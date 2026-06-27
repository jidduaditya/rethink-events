import { describe, it, expect } from "vitest";
import { getRouteAuth } from "@/lib/proxy-auth";

describe("getRouteAuth", () => {
  it("marks /admin as admin-only", () => {
    expect(getRouteAuth("/admin")).toBe("admin");
  });

  it("marks /admin/* as admin-only", () => {
    expect(getRouteAuth("/admin/events")).toBe("admin");
    expect(getRouteAuth("/admin/users/123")).toBe("admin");
  });

  it("marks /organise as auth-required", () => {
    expect(getRouteAuth("/organise")).toBe("auth");
  });

  it("marks /organise/* as auth-required", () => {
    expect(getRouteAuth("/organise/new")).toBe("auth");
    expect(getRouteAuth("/organise/abc/edit")).toBe("auth");
    expect(getRouteAuth("/organise/abc/run")).toBe("auth");
  });

  it("marks /ticket/* as auth-required", () => {
    expect(getRouteAuth("/ticket/abc-123")).toBe("auth");
  });

  it("marks / as public", () => {
    expect(getRouteAuth("/")).toBe("public");
  });

  it("marks /e/* as public (anon event pages)", () => {
    expect(getRouteAuth("/e/some-event-id")).toBe("public");
  });

  it("marks /login as public", () => {
    expect(getRouteAuth("/login")).toBe("public");
  });

  it("marks /onboarding as public", () => {
    expect(getRouteAuth("/onboarding")).toBe("public");
  });

  it("does not match /ticketing as auth", () => {
    expect(getRouteAuth("/ticketing")).toBe("public");
  });

  it("does not match /organiser as auth", () => {
    expect(getRouteAuth("/organiser")).toBe("public");
  });
});
