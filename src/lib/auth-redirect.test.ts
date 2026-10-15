import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { safeAuthDestination } from "./auth-redirect";

describe("auth return path validation", () => {
  it("allows supported first-party destinations", () => {
    assert.equal(safeAuthDestination("/business", false), "/business");
    assert.equal(safeAuthDestination("/bookings", false), "/bookings");
    assert.equal(safeAuthDestination("/orders", false), "/orders");
    assert.equal(safeAuthDestination("/notifications", false), "/notifications");
    assert.equal(safeAuthDestination("/reviews", false), "/reviews");
  });

  it("uses a role-specific fallback when no redirect exists", () => {
    assert.equal(safeAuthDestination(undefined, false), "/");
    assert.equal(safeAuthDestination(undefined, true), "/admin");
  });

  it("does not redirect a nonadministrator to admin-only paths", () => {
    assert.equal(safeAuthDestination("/admin", false), "/");
    assert.equal(safeAuthDestination("/super", false), "/");
    assert.equal(safeAuthDestination("/admin", true), "/admin");
  });

  it("rejects external, encoded, path traversal and arbitrary URLs", () => {
    for (const value of [
      "//evil.example", "https://evil.example", "\\\\evil.example",
      "/%2f%2fevil.example", "/admin?next=https://evil.example",
      "/../admin", "/auth", "\n/business", " /business", "/unknown",
      "javascript:alert(1)", "/business#somewhere", 42,
    ]) {
      assert.equal(safeAuthDestination(value, false), "/");
    }
  });
});
