/**
 * Never hand an arbitrary query-string URL to post-login navigation.
 * The auth page only returns to existing first-party authenticated screens.
 */
const CUSTOMER_PATHS = new Set([
  "/",
  "/business",
  "/bookings",
  "/orders",
  "/notifications",
  "/reviews",
]);

const PRIVILEGED_PATHS = new Set(["/admin", "/super"]);

export function safeAuthDestination(redirect: unknown, isAdmin: boolean): string {
  const fallback = isAdmin ? "/admin" : "/";
  if (typeof redirect !== "string" || redirect.length > 100) return fallback;
  if (CUSTOMER_PATHS.has(redirect)) return redirect;
  if (isAdmin && PRIVILEGED_PATHS.has(redirect)) return redirect;
  return fallback;
}
