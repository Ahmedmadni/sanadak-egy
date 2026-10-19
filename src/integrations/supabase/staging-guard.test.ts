import { describe, expect, test } from "bun:test";
import { assertStagingSupabaseUrl } from "./staging-guard";

const production = "lkkxrdxdlkovphjlrcak";
const staging = "abcdefghijklmnopqrst";

describe("Staging project isolation guard", () => {
  test("accepts only a matching isolated HTTPS Supabase project", () => {
    expect(() => assertStagingSupabaseUrl(`https://${staging}.supabase.co`, staging)).not.toThrow();
    expect(() => assertStagingSupabaseUrl(`https://${staging}.supabase.co/`, staging)).not.toThrow();
  });
  test("refuses the real production URL even if configured as staging", () => {
    expect(() => assertStagingSupabaseUrl(`https://${production}.supabase.co`, production)).toThrow();
    expect(() => assertStagingSupabaseUrl(`https://${production}.supabase.co`, staging)).toThrow();
  });
  test("refuses mismatched/absent or invalid project references", () => {
    expect(() => assertStagingSupabaseUrl(`https://${staging}.supabase.co`, undefined)).toThrow();
    expect(() => assertStagingSupabaseUrl(`https://${staging}.supabase.co`, "missing")).toThrow();
    expect(() => assertStagingSupabaseUrl(`https://${staging}.supabase.co`, "zyxwvutsrqponmlkjihg")).toThrow();
  });
  test("rejects insecure and deceptive URLs and embedded credentials", () => {
    for (const url of [
      `http://${staging}.supabase.co`,
      `https://${staging}.supabase.co.evil.example`,
      `https://${staging}.supabase.co@evil.example`,
      `https://${staging}.supabase.co:443/abc`,
      `https://${staging}.supabase.co/?foo=bar`,
    ]) expect(() => assertStagingSupabaseUrl(url, staging)).toThrow();
  });
});
