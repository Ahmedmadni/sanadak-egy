/**
 * Password recovery helpers are pure and do not inspect or expose auth tokens.
 * The Supabase Auth client is responsible for exchanging and validating links.
 */
export type NewPasswordError = "length" | "mismatch" | null;

export function validateNewPassword(password: string, confirmation: string): NewPasswordError {
  if (password.length < 12 || password.length > 72) return "length";
  if (password !== confirmation) return "mismatch";
  return null;
}

export function passwordRecoveryRedirect(origin: string): string {
  const url = new URL(origin);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) {
    throw new Error("Password recovery requires HTTPS or localhost");
  }
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Password recovery requires a plain site origin");
  }
  return `${url.origin}/reset-password`;
}

/**
 * Only a real authenticated Supabase recovery session permits updating a
 * password. This URL check is a callback HINT, never proof of authorization.
 */
export function isRecoveryCallbackUrl(search: string, hash: string): boolean {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ""));
  return (
    (query.get("type") === "recovery" && Boolean(query.get("token_hash"))) ||
    Boolean(query.get("code")) ||
    (fragment.get("type") === "recovery" && Boolean(fragment.get("access_token")))
  );
}


/**
 * A current login session is never evidence that a password-recovery link was
 * authenticated. Only a Supabase PASSWORD_RECOVERY event (or a successful
 * verifyOtp response handled by the caller) may unlock the reset form.
 */
export function isVerifiedRecoveryAuthEvent(
  event: string,
  hasRecoveryCallback: boolean,
  sessionUserId: string | null | undefined,
): boolean {
  return hasRecoveryCallback &&
    event === "PASSWORD_RECOVERY" &&
    typeof sessionUserId === "string" &&
    sessionUserId.length > 0;
}

/** Prevent a post-verification account switch from updating another user. */
export function isSameRecoveryUser(
  verifiedUserId: string | null,
  currentUserId: string | null | undefined,
): boolean {
  return !!verifiedUserId && verifiedUserId === currentUserId;
}
