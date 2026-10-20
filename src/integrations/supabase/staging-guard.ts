// SANADAK STAGING ONLY. Never merge this pin into production.
// This expected project ref was independently checked against this exact
// project's supabase/config.toml AND its VITE_SUPABASE_URL in Lovable Staging.
// Keep supabase/config.toml in this GitHub branch as a fail-closed CLI sentinel:
// manual migration history is not registered; do NOT enable automatic db push.
export const EXPECTED_STAGING_SUPABASE_REF = "wnakrxkosofufxfqacrx";
const PRODUCTION_PROJECT_REF = "lkkxrdxdlkovphjlrcak";

export function assertStagingSupabaseUrl(
  url: string,
  configuredProjectRef: string | undefined,
): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Staging Supabase URL is invalid");
  }

  const configuredRef = configuredProjectRef?.trim().toLowerCase();
  if (configuredRef && configuredRef !== EXPECTED_STAGING_SUPABASE_REF) {
    throw new Error("Supabase project ref does not match the approved Staging backend");
  }
  if (
    EXPECTED_STAGING_SUPABASE_REF === PRODUCTION_PROJECT_REF ||
    url.toLowerCase().includes(PRODUCTION_PROJECT_REF)
  ) {
    throw new Error("Staging cannot connect to production Supabase");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname.toLowerCase() !== `${EXPECTED_STAGING_SUPABASE_REF}.supabase.co` ||
    parsed.username || parsed.password || parsed.port ||
    parsed.pathname !== "/" || parsed.search || parsed.hash
  ) {
    throw new Error("Staging Supabase URL does not match the verified project");
  }
}
