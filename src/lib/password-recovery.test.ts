import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isRecoveryCallbackUrl,
  isSameRecoveryUser,
  isVerifiedRecoveryAuthEvent,
  passwordRecoveryRedirect,
  validateNewPassword,
} from "./password-recovery";

describe("password recovery", () => {
  it("requires a passphrase between 12 and 72 characters and confirmation", () => {
    assert.equal(validateNewPassword("short", "short"), "length");
    assert.equal(validateNewPassword("x".repeat(73), "x".repeat(73)), "length");
    assert.equal(validateNewPassword("long-enough-passphrase", "wrong-passphrase"), "mismatch");
    assert.equal(validateNewPassword("long-enough-passphrase", "long-enough-passphrase"), null);
    assert.equal(validateNewPassword("a".repeat(12), "a".repeat(12)), null);
  });

  it("builds a same-origin recovery callback without leaking session tokens", () => {
    assert.equal(passwordRecoveryRedirect("https://sanadak.example"), "https://sanadak.example/reset-password");
    assert.equal(passwordRecoveryRedirect("http://localhost:3000"), "http://localhost:3000/reset-password");
    assert.throws(() => passwordRecoveryRedirect("http://sanadak.example"), /HTTPS/);
    assert.throws(() => passwordRecoveryRedirect("https://evil.example/path"), /plain site origin/);
    assert.throws(() => passwordRecoveryRedirect("https://user:pass@sanadak.example"), /plain site origin/);
  });

  it("recognizes recovery callback signals but never treats arbitrary URLs as proof", () => {
    assert.equal(isRecoveryCallbackUrl("?code=some-pkce-code", ""), true);
    assert.equal(isRecoveryCallbackUrl("?token_hash=abc&type=recovery", ""), true);
    assert.equal(isRecoveryCallbackUrl("", "#access_token=abc&type=recovery"), true);
    assert.equal(isRecoveryCallbackUrl("?type=recovery", ""), false);
    assert.equal(isRecoveryCallbackUrl("", "#type=recovery"), false);
    assert.equal(isRecoveryCallbackUrl("?next=https://evil.example", "#access_token=abc"), false);
  });

  it("refuses to authorize a recovery form from an existing normal login", () => {
    assert.equal(isVerifiedRecoveryAuthEvent("INITIAL_SESSION", true, "user-a"), false);
    assert.equal(isVerifiedRecoveryAuthEvent("SIGNED_IN", true, "user-a"), false);
    assert.equal(isVerifiedRecoveryAuthEvent("TOKEN_REFRESHED", true, "user-a"), false);
    assert.equal(isVerifiedRecoveryAuthEvent("USER_UPDATED", true, "user-a"), false);
  });

  it("requires a genuine recovery event with the recovery URL and user", () => {
    assert.equal(isVerifiedRecoveryAuthEvent("PASSWORD_RECOVERY", true, "user-a"), true);
    assert.equal(isVerifiedRecoveryAuthEvent("PASSWORD_RECOVERY", false, "user-a"), false);
    assert.equal(isVerifiedRecoveryAuthEvent("PASSWORD_RECOVERY", true, null), false);
    assert.equal(isVerifiedRecoveryAuthEvent("PASSWORD_RECOVERY", true, ""), false);
  });

  it("blocks a password update when account identity has changed", () => {
    assert.equal(isSameRecoveryUser("user-a", "user-a"), true);
    assert.equal(isSameRecoveryUser("user-a", "user-b"), false);
    assert.equal(isSameRecoveryUser(null, "user-a"), false);
    assert.equal(isSameRecoveryUser("user-a", null), false);
  });

});
