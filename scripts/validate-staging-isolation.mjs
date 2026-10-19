// Staging branch only: fail CI if a future import/rebase reintroduces
// production Supabase linkage or unsafe historical admin bootstrap SQL.
// This is a source safety check, not proof of deployed database isolation.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const config = read("supabase/config.toml");
assert.match(config, /^project_id = "STAGING_REF_UNVERIFIED_DO_NOT_RUN"$/m,
  "Staging config must remain fail-closed until verified");
assert.doesNotMatch(config, /lkkxrdxdlkovphjlrcak/,
  "Staging CLI config points at production");

const neutralized = [
  "20260701184446_fcf96731-4573-4597-8383-8179fbe1a8d0.sql",
  "20260713043610_3a9a95e5-4d83-4c25-8d7d-c0fc38db3e99.sql",
  "20260713044233_fe8078a7-8bfe-4333-a1de-28c3da0d384b.sql",
  "20260728045306_be350871-ac57-46a4-8d5b-75556305157b.sql",
];
for (const file of neutralized) {
  const content = read(`supabase/migrations/${file}`);
  assert.match(content, /STAGING ONLY/, `Missing staging marker in ${file}`);
  assert.match(content, /SELECT 1 AS staging_/, `No-op is missing in ${file}`);
  assert.doesNotMatch(content, /^\s*INSERT\s+INTO\s+public\.user_roles/mi,
    `Real-account admin bootstrap returned in ${file}`);
  assert.doesNotMatch(content, /^\s*CREATE\s+POLICY/mi,
    `Admin self-claim policy returned in ${file}`);
}

for (const file of [
  "src/integrations/supabase/client.ts",
  "src/integrations/supabase/client.server.ts",
  "src/integrations/supabase/auth-middleware.ts",
]) {
  const source = read(file);
  assert.match(source, /import \{ assertStagingSupabaseUrl \}/,
    `Staging guard import missing from ${file}`);
  assert.match(source, /assertStagingSupabaseUrl\(/,
    `Staging guard call missing from ${file}`);
}
const guard = read("src/integrations/supabase/staging-guard.ts");
assert.match(guard, /PRODUCTION_PROJECT_REF = "lkkxrdxdlkovphjlrcak"/,
  "Staging guard does not recognize production ref");
assert.match(guard, /parsed\.hostname\.toLowerCase\(\)/,
  "Staging URL host validation removed");
console.log("Staging source isolation safeguards: PASS");
