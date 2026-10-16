import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const sql = readFileSync(
  new URL("../../supabase/verification/gate-31_read_only_preflight.sql", import.meta.url),
  "utf8",
);

describe("Gate 31 database preflight contract", () => {
  it("is read-only SQL, with no DDL, data writes or executable blocks", () => {
    const withoutComments = sql.replace(/^\s*--[^\n]*$/gm, "");
    // Ignore quoted data labels such as 'UPDATE' in permission checks.
    const executable = withoutComments.replace(/'(?:''|[^'])*'/g, "''");
    assert.doesNotMatch(
      executable,
      /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP|CREATE|GRANT|REVOKE|MERGE|CALL|EXECUTE|COPY|VACUUM|DO)\b/i,
    );
    assert.doesNotMatch(executable, /\b(?:pg_sleep|dblink|http_post|net\.http_post)\s*\(/i);
    assert.equal((executable.match(/\bSELECT\b/gi) ?? []).length, 6);
  });

  it("covers the prerequisite surfaces for each Gate 19 phase", () => {
    for (const expected of [
      "01_environment", "02_relations", "03_columns",
      "04_functions", "05_rls_policies", "06_storage_buckets",
      "tenants", "tenant_documents", "catalog_items",
      "storefront_tenants", "request_tenant_onboarding",
      "admin_verify_tenant_payment", "private", "pg_policies",
      "allowed_mime_types", "anon_insert",
    ]) {
      assert.ok(sql.includes(expected), `Missing preflight coverage: ${expected}`);
    }
  });

  it("does not include row-level identities, file paths or order payloads", () => {
    assert.doesNotMatch(sql, /\b(?:auth\.users|storage\.objects|customer_phone|customer_address|customer_name|raw_user_meta_data|email_address|access_token|refresh_token)\b/i);
    assert.doesNotMatch(sql, /SELECT\s+\*/i);
  });
});
