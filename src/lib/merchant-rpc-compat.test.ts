import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { missingMerchantRpc, withMerchantRpcFallback } from "./merchant-rpc-compat";

describe("Gate 19 merchant RPC transition", () => {
  it("uses an installed merchant RPC without touching legacy table mutations", async () => {
    let legacyCalls = 0;
    const result = await withMerchantRpcFallback("request_tenant_onboarding",
      () => Promise.resolve({ data: "tenant-id", error: null }),
      () => { legacyCalls++; return Promise.resolve({ data: "legacy-id", error: null }); },
    );
    assert.equal(result.data, "tenant-id");
    assert.equal(legacyCalls, 0);
  });

  it("allows an explicit missing-procedure fallback before Gate 19 migration", async () => {
    const attempts: string[] = [];
    const result = await withMerchantRpcFallback("update_tenant_profile",
      () => { attempts.push("rpc"); return Promise.resolve({ data: null, error: { code: "PGRST202", message: "Could not find function public.update_tenant_profile in schema cache" } }); },
      () => { attempts.push("legacy"); return Promise.resolve({ data: null, error: null }); },
    );
    assert.deepEqual(attempts, ["rpc", "legacy"]);
    assert.equal(result.error, null);
  });

  it("never uses legacy writes when strict post-Gate19 RPC mode is enabled", async () => {
    const attempts: string[] = [];
    const result = await withMerchantRpcFallback("request_tenant_onboarding",
      () => { attempts.push("rpc"); return Promise.resolve({ data: null, error: { code: "42883", message: "function request_tenant_onboarding not found" } }); },
      () => { attempts.push("legacy"); return Promise.resolve({ data: "id", error: null }); },
      { requireRpc: true },
    );
    assert.deepEqual(attempts, ["rpc"]);
    assert.equal(result.error?.code, "42883");
  });

  it("does not bypass RLS, permission failures or network errors", async () => {
    const errors = [
      { code: "42501", message: "permission denied for request_tenant_onboarding" },
      { code: "PGRST202", message: "Could not find function public.some_other_rpc" },
      { code: "PGRST301", message: "JWT expired" },
      { code: "503", message: "service unavailable" },
    ];
    for (const error of errors) {
      let legacyCalls = 0;
      const result = await withMerchantRpcFallback("request_tenant_onboarding",
        () => Promise.resolve({ data: null, error }),
        () => { legacyCalls++; return Promise.resolve({ data: "legacy-id", error: null }); },
      );
      assert.equal(legacyCalls, 0);
      assert.deepEqual(result.error, error);
    }
  });

  it("accepts only exact vetted merchant RPC names in the missing check", () => {
    assert.equal(missingMerchantRpc({ code: "PGRST202", message: "missing public.request_tenant_onboarding" }, "request_tenant_onboarding"), true);
    assert.equal(missingMerchantRpc({ code: "PGRST202", message: "missing public.unsafe_create_admin" }, "unsafe_create_admin"), false);
    assert.equal(missingMerchantRpc({ code: "42501", message: "permission denied for update_tenant_profile" }, "update_tenant_profile"), false);
  });
});
