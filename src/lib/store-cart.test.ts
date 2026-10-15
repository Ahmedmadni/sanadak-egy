import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSavedLine, restoreCart, variantOptions } from "./store-cart";

function catalogItem(
  id: string,
  stock: number | null = 10,
  variants: unknown = [],
  currency = "EGP",
) {
  return { id, name: `Product ${id}`, price: 25, currency, stock, variants };
}

describe("catalog variant validation", () => {
  it("handles malformed input, whitespace and duplicate labels", () => {
    assert.deepEqual(variantOptions(null), []);
    assert.deepEqual(variantOptions({ label: "invalid" }), []);
    assert.deepEqual(variantOptions([" Red ", { label: "Red" }, { label: " Blue " }, 0]), [
      "Red",
      "Blue",
    ]);
  });
});

describe("persisted cart input validation", () => {
  it("rejects malformed quantities and legacy rows without variant", () => {
    assert.equal(isSavedLine({ id: "a", qty: 1, variant: null }), true);
    for (const qty of [0, -1, 100, 2.5, Infinity, NaN, "1"]) {
      assert.equal(isSavedLine({ id: "a", qty, variant: null }), false);
    }
    assert.equal(isSavedLine({ id: " ", qty: 1, variant: null }), false);
    assert.equal(isSavedLine({ id: "a", qty: 1 }), false);
  });
});

describe("store cart restoration", () => {
  it("takes prices from current catalog, not browser state", () => {
    const lines = restoreCart(
      [{ id: "a", qty: 2, variant: null, price: 0, currency: "USD", name: "forged" }],
      [catalogItem("a")],
    );
    assert.equal(lines.length, 1);
    assert.deepEqual(
      { id: lines[0].id, name: lines[0].name, qty: lines[0].qty, price: lines[0].price, currency: lines[0].currency },
      { id: "a", name: "Product a", qty: 2, price: 25, currency: "EGP" },
    );
    assert.equal("variants" in lines[0], false);
  });

  it("ignores deleted and out-of-stock catalog entries", () => {
    assert.deepEqual(
      restoreCart([
        { id: "missing", qty: 1, variant: null },
        { id: "sold-out", qty: 1, variant: null },
      ], [catalogItem("sold-out", 0)]),
      [],
    );
  });

  it("rejects selections removed from the current catalog", () => {
    assert.deepEqual(
      restoreCart([{ id: "a", qty: 1, variant: "Medium" }], [catalogItem("a", 5, ["Small", "Large"])]),
      [],
    );
    const lines = restoreCart(
      [{ id: "a", qty: 1, variant: "Large" }],
      [catalogItem("a", 5, ["Small", "Large"])],
    );
    assert.equal(lines[0].variant, "Large");
  });

  it("merges duplicate lines without exceeding shared stock across variants", () => {
    const lines = restoreCart([
      { id: "a", qty: 3, variant: "Small" },
      { id: "a", qty: 4, variant: "Small" },
      { id: "a", qty: 8, variant: "Large" },
    ], [catalogItem("a", 10, ["Small", "Large"])]);
    assert.deepEqual(lines.map(({ variant, qty }) => ({ variant, qty })), [
      { variant: "Small", qty: 7 },
      { variant: "Large", qty: 3 },
    ]);
  });

  it("caps untracked inventory at the checkout limit", () => {
    const lines = restoreCart([
      { id: "a", qty: 90, variant: null },
      { id: "a", qty: 90, variant: null },
    ], [catalogItem("a", null)]);
    assert.equal(lines.length, 1);
    assert.equal(lines[0].qty, 99);
  });

  it("does not restore mixed currencies in one order", () => {
    const lines = restoreCart([
      { id: "a", qty: 1, variant: null },
      { id: "b", qty: 1, variant: null },
    ], [catalogItem("a"), catalogItem("b", 8, [], "USD")]);
    assert.deepEqual(lines.map((line) => line.id), ["a"]);
  });

  it("limits distinct cart lines and ignores non-array browser state", () => {
    const items = Array.from({ length: 55 }, (_, index) => catalogItem(`p${index}`));
    const saved = items.map((item) => ({ id: item.id, qty: 1, variant: null }));
    assert.equal(restoreCart(saved, items).length, 50);
    assert.deepEqual(restoreCart({ cart: saved }, items), []);
  });
});
