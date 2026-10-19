// Staging-only fail-closed protection. This file must never be merged to
// production main without deliberately removing the staging-only guard.
const PRODUCTION_PROJECT_REF = "lkkxrdxdlkovphjlrcak";
const SUPABASE_REF_PATTERN = /^[a-z0-9]{20}$/;

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

  const projectRef = configuredProjectRef?.trim().toLowerCase();
  if (!projectRef || !SUPABASE_REF_PATTERN.test(projectRef)) {
    throw new Error("Staging Supabase project reference is missing or invalid");
  }

  if (projectRef === PRODUCTION_PROJECT_REF || url.toLowerCase().includes(PRODUCTION_PROJECT_REF)) {
    throw new Error("Staging cannot connect to the production Supabase project");
  }

  if (parsed.protocol !== "https:" ||
      parsed.hostname.toLowerCase() !== `${projectRef}.supabase.co` ||
      parsed.username || parsed.password || parsed.port || parsed.pathname !== "/" ||
      parsed.search || parsed.hash) {
    throw new Error("Staging Supabase URL does not match its isolated project reference");
  }
}
