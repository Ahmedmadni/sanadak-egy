import { describe, expect, test } from "bun:test";
import { isSavedLine, restoreCart, variantOptions } from "./store-cart";

function catalogItem(
  id: string,
  stock: number | null = 10,
  variants: unknown = [],
  currency = "EGP",
) {
  return {
    id,
    name: `Product ${id}`,
    price: 25,
    currency,
    stock,
    variants,
  };
}

describe("catalog variant validation", () => {
  test("handles malformed input, whitespace and duplicate labels", () => {
    expect(variantOptions(null)).toEqual([]);
    expect(variantOptions({ label: "invalid" })).toEqual([]);
    expect(variantOptions([" Red ", { label: "Red" }, { label: " Blue " }, 0])).toEqual([
      "Red",
      "Blue",
    ]);
  });
});

describe("persisted cart input validation", () => {
  test("rejects malformed quantities and legacy rows without variant", () => {
    expect(isSavedLine({ id: "a", qty: 1, variant: null })).toBe(true);
    for (const qty of [0, -1, 100, 2.5, Infinity, NaN, "1"]) {
      expect(isSavedLine({ id: "a", qty, variant: null })).toBe(false);
    }
    expect(isSavedLine({ id: " ", qty: 1, variant: null })).toBe(false);
    expect(isSavedLine({ id: "a", qty: 1 })).toBe(false);
  });
});

describe("store cart restoration", () => {
  test("uses current catalog prices and ignores browser-controlled amounts", () => {
    const [line] = restoreCart(
      [{ id: "a", qty: 2, variant: null, price: 0, currency: "USD", name: "forged" }],
      [catalogItem("a")],
    );
    expect(line).toMatchObject({ id: "a", name: "Product a", qty: 2, price: 25, currency: "EGP" });
    expect("variants" in line).toBe(false);
  });

  test("ignores deleted and out-of-stock catalog entries", () => {
    expect(restoreCart([
      { id: "missing", qty: 1, variant: null },
      { id: "sold-out", qty: 1, variant: null },
    ], [catalogItem("sold-out", 0)])).toEqual([]);
  });

  test("rejects selections removed from the current catalog", () => {
    expect(restoreCart([
      { id: "a", qty: 1, variant: "Medium" },
    ], [catalogItem("a", 5, ["Small", "Large"])])).toEqual([]);
    expect(restoreCart([
      { id: "a", qty: 1, variant: "Large" },
    ], [catalogItem("a", 5, ["Small", "Large"])])[0].variant).toBe("Large");
  });

  test("merges duplicate lines without exceeding shared inventory across variants", () => {
    const lines = restoreCart([
      { id: "a", qty: 3, variant: "Small" },
      { id: "a", qty: 4, variant: "Small" },
      { id: "a", qty: 8, variant: "Large" },
    ], [catalogItem("a", 10, ["Small", "Large"])]);
    expect(lines.map(({ variant, qty }) => ({ variant, qty }))).toEqual([
      { variant: "Small", qty: 7 },
      { variant: "Large", qty: 3 },
    ]);
  });

  test("caps untracked inventory at the checkout limit", () => {
    const lines = restoreCart([
      { id: "a", qty: 90, variant: null },
      { id: "a", qty: 90, variant: null },
    ], [catalogItem("a", null)]);
    expect(lines).toHaveLength(1);
    expect(lines[0].qty).toBe(99);
  });

  test("does not restore mixed currencies in one order", () => {
    const lines = restoreCart([
      { id: "a", qty: 1, variant: null },
      { id: "b", qty: 1, variant: null },
    ], [catalogItem("a"), catalogItem("b", 8, [], "USD")]);
    expect(lines.map((line) => line.id)).toEqual(["a"]);
  });

  test("limits distinct cart lines and ignores non-array browser state", () => {
    const items = Array.from({ length: 55 }, (_, index) => catalogItem(`p${index}`));
    const saved = items.map((item) => ({ id: item.id, qty: 1, variant: null }));
    expect(restoreCart(saved, items)).toHaveLength(50);
    expect(restoreCart({ cart: saved }, items)).toEqual([]);
  });
});
