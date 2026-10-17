/**
 * Gate 19A/19C transition: call the validated merchant RPC where installed.
 *
 * Legacy direct-table access is available only while the RPC itself has not
 * been installed (PGRST202 / 42883). An authorization error MUST NOT result
 * in retrying a broader table INSERT/UPDATE.
 *
 * After Gate 19A/19C migration succeeds, set the required-RPC frontend
 * feature flag to true so a missing procedure always fails closed.
 */
export type MerchantMutationError = { code?: string; message?: string } | null;
export type MerchantMutationResult<T> = { data: T | null; error: MerchantMutationError };

const RPC_NAMES = new Set(["request_tenant_onboarding", "update_tenant_profile"]);

export function missingMerchantRpc(error: MerchantMutationError, rpcName: string): boolean {
  return !!error &&
    RPC_NAMES.has(rpcName) &&
    (error.code === "PGRST202" || error.code === "42883") &&
    (error.message ?? "").includes(rpcName);
}

export async function withMerchantRpcFallback<T>(
  rpcName: "request_tenant_onboarding" | "update_tenant_profile",
  runRpc: () => PromiseLike<MerchantMutationResult<T>>,
  runLegacy: () => PromiseLike<MerchantMutationResult<T>>,
  options: { requireRpc?: boolean } = {},
): Promise<MerchantMutationResult<T>> {
  const result = await runRpc();
  if (!result.error) return result;
  if (!options.requireRpc && missingMerchantRpc(result.error, rpcName)) {
    return await runLegacy();
  }
  return result;
}

export const merchantRpcsRequired =
  import.meta.env.VITE_SANADAK_TENANT_RPCS_REQUIRED === "true";
