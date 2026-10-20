import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertStagingSupabaseUrl } from "./staging-guard";

const production = "lkkxrdxdlkovphjlrcak";
const staging = "wnakrxkosofufxfqacrx";

describe("Staging project isolation guard", () => {
  it("accepts only a matching isolated HTTPS Supabase project", () => {
    assert.doesNotThrow(() => assertStagingSupabaseUrl(`https://${staging}.supabase.co`, staging));
    assert.doesNotThrow(() => assertStagingSupabaseUrl(`https://${staging}.supabase.co/`, staging));
  });
  it("refuses the real production URL even if configured as staging", () => {
    assert.throws(() => assertStagingSupabaseUrl(`https://${production}.supabase.co`, production));
    assert.throws(() => assertStagingSupabaseUrl(`https://${production}.supabase.co`, staging));
  });
  it("refuses a third-party Supabase project even with a matching URL and ref", () => {
    const unrelated = "abcdefghijklmnopqrst";
    assert.throws(() => assertStagingSupabaseUrl(`https://${unrelated}.supabase.co`, unrelated));
  });
  it("refuses mismatched/absent or invalid project references", () => {
    assert.throws(() => assertStagingSupabaseUrl(`https://${staging}.supabase.co`, undefined));
    assert.throws(() => assertStagingSupabaseUrl(`https://${staging}.supabase.co`, "missing"));
    assert.throws(() => assertStagingSupabaseUrl(`https://${staging}.supabase.co`, "zyxwvutsrqponmlkjihg"));
  });
  it("rejects insecure and deceptive URLs and embedded credentials", () => {
    for (const url of [
      `http://${staging}.supabase.co`,
      `https://${staging}.supabase.co.evil.example`,
      `https://${staging}.supabase.co@evil.example`,
      `https://${staging}.supabase.co:443/abc`,
      `https://${staging}.supabase.co/?foo=bar`,
    ]) assert.throws(() => assertStagingSupabaseUrl(url, staging));
  });
});
