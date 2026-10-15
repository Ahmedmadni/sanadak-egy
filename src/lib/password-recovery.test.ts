import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isRecoveryCallbackUrl,
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
});
