import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

// S1 code-contract smoke checks. They are NOT browser/RLS integration tests.
const source = (path: string) => readFileSync(path, "utf8");

describe("staging order/booking client contracts", () => {
  const route = source("src/routes/store.$slug.tsx");
  const order = source("src/components/sanadak/StoreCartCheckout.tsx");
  const booking = source("src/components/sanadak/BookingDialog.tsx");

  it("routes storefront checkout through the authoritative create_order RPC", () => {
    assert.match(route, /<StoreCartCheckout\b/);
    assert.match(order, /supabase\.rpc\(["']create_order["']/);
    assert.match(order, /_tenant:\s*tenantId/);
    assert.match(order, /_items:\s*cart\.map/);
    assert.match(order, /if \(error\) throw error/);
    assert.match(order, /const receipt = data\?\.\[0\]/);
    assert.doesNotMatch(order, /\.from\(["'](?:orders|order_items)["']\)\.insert\(/);
  });

  it("routes bookings through create_booking after availability lookup", () => {
    assert.match(route, /<BookingDialog\b/);
    assert.match(booking, /supabase\.rpc\(["']get_booking_availability["']/);
    assert.match(booking, /supabase\.rpc\(["']create_booking["']/);
    assert.match(booking, /_tenant:\s*tenantId/);
    assert.match(booking, /_slot_start:\s*slotAt/);
    assert.doesNotMatch(booking, /\.from\(["']bookings["']\)\.insert\(/);
  });

  it("identifies the legacy global WhatsApp cart as non-authoritative", () => {
    const root = source("src/routes/__root.tsx");
    const cart = source("src/components/sanadak/CartSheet.tsx");
    assert.match(root, /<CartSheet\s*\/>/);
    assert.match(cart, /openWhatsApp\(/);
    assert.doesNotMatch(cart, /supabase\.rpc\(["']create_order["']/);
  });
});
