import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { missingStorefrontView, queryPublicStorefront, STOREFRONT_SOURCES } from "./public-storefront";

describe("Gate 19 public storefront read compatibility", () => {
  it("maps each public entity to a curated view", () => {
    assert.deepEqual(Object.values(STOREFRONT_SOURCES).map((v) => v.view), [
      "storefront_tenants",
      "storefront_catalog_items",
      "storefront_branches",
      "storefront_staff",
      "storefront_reviews",
    ]);
  });

  it("queries only the safe storefront view when the view exists", async () => {
    const attempts: string[] = [];
    const result = await queryPublicStorefront("tenants", (table) => {
      attempts.push(table);
      return Promise.resolve({ data: [{ id: "tenant-1" }], error: null });
    });
    assert.deepEqual(attempts, ["storefront_tenants"]);
    assert.deepEqual(result.data, [{ id: "tenant-1" }]);
  });

  it("allows a missing-view fallback only during pre-Gate-19 compatibility", async () => {
    const attempts: string[] = [];
    const result = await queryPublicStorefront("catalog", (table, legacy) => {
      attempts.push(table);
      return Promise.resolve(legacy
        ? { data: [{ id: "catalog-1" }], error: null }
        : { data: null, error: { code: "PGRST205", message: "Could not find the table 'public.storefront_catalog_items' in the schema cache" } });
    });
    assert.deepEqual(attempts, ["storefront_catalog_items", "catalog_items"]);
    assert.deepEqual(result.data, [{ id: "catalog-1" }]);
  });

  it("never falls back when post-migration strict mode is enabled", async () => {
    const attempts: string[] = [];
    const result = await queryPublicStorefront("reviews", (table) => {
      attempts.push(table);
      return Promise.resolve({ data: null, error: { code: "42P01", message: "relation storefront_reviews does not exist" } });
    }, { requireView: true });
    assert.deepEqual(attempts, ["storefront_reviews"]);
    assert.equal(result.error?.code, "42P01");
  });

  it("does not retry permission, network or internal-dependency errors against a base table", async () => {
    for (const failure of [
      { code: "42501", message: "permission denied for relation storefront_tenants" },
      { code: "PGRST301", message: "JWT expired" },
      { code: "42P01", message: "relation internal_visibility_table does not exist" },
      { code: "42P01", message: "relation tenants does not exist" },
      { code: "PGRST205", message: "Could not find the table 'public.storefront_reviews' in the schema cache" },
      { code: "503", message: "database unavailable" },
    ]) {
      const attempts: string[] = [];
      const result = await queryPublicStorefront("tenants", (table) => {
        attempts.push(table);
        return Promise.resolve({ data: null, error: failure });
      });
      assert.deepEqual(attempts, ["storefront_tenants"]);
      assert.deepEqual(result.error, failure);
    }
  });

  it("does not fall back after an empty but successful view query", async () => {
    const attempts: string[] = [];
    const result = await queryPublicStorefront("staff", (table) => {
      attempts.push(table);
      return Promise.resolve({ data: [], error: null });
    });
    assert.deepEqual(result.data, []);
    assert.deepEqual(attempts, ["storefront_staff"]);
  });

  it("recognizes only known, explicitly missing storefront views", () => {
    assert.equal(missingStorefrontView({ code: "42P01", message: 'relation "storefront_tenants" does not exist' }, "storefront_tenants"), true);
    assert.equal(missingStorefrontView({ code: "PGRST205", message: "Could not find the table 'public.storefront_tenants'" }, "storefront_tenants"), true);
    assert.equal(missingStorefrontView({ code: "42501", message: "permission denied for storefront_tenants" }, "storefront_tenants"), false);
    assert.equal(missingStorefrontView({ code: "42P01", message: "missing storefront_tenants" }, "storefront_secret"), false);
  });
});
