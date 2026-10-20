// Read-only manifest validator for a future human-reviewed selective copy
// into the already existing Lovable Staging project. Never transfers files.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync("docs/staging-s1-reviewed-import-manifest.json", "utf8"));
assert.equal(manifest.source_branch, "staging/sanadak-isolated-s0");
assert.equal(manifest.destination_lovable_project, "a5ba6f1c-a324-4761-a604-2936a1f8f5cf");
assert.equal(manifest.destination_supabase_ref, "wnakrxkosofufxfqacrx");
assert.equal(manifest.source_copy_executed, false);
assert.equal(manifest.import_files.length > 150, true);
const seen=new Set();
for (const entry of manifest.import_files){
 const p=entry.path;
 assert.equal(seen.has(p),false,`Duplicate import file ${p}`);
 seen.add(p);
 assert.ok(p.startsWith("src/") || [
   ".prettierignore",".prettierrc","bun.lock","bunfig.toml","components.json",
   "eslint.config.js","package.json","tsconfig.json","vite.config.ts"
 ].includes(p), `Unexpected file in Staging copy: ${p}`);
 assert.ok(!p.includes(".env") && !p.startsWith("supabase/") &&
  !p.startsWith("docs/") && !p.startsWith("scripts/") &&
  !p.startsWith(".github/") && !p.startsWith(".lovable/"),
  `Never auto-copy environment, DB, CI, or docs files: ${p}`);
 assert.notEqual(p,"src/integrations/supabase/previewAuthStorage.ts",
  "Lovable's existing preview auth storage should be preserved");
 assert.ok(existsSync(p),`Missing source file ${p}`);
 const data=readFileSync(p);
 const sha=createHash("sha1")
   .update(`blob ${data.length}\0`).update(data).digest("hex");
 assert.equal(sha, entry.git_blob_sha,`Source changed since import review: ${p}`);
}
for(const name of [
 "src/integrations/supabase/client.ts",
 "src/integrations/supabase/client.server.ts",
 "src/integrations/supabase/auth-middleware.ts",
]){
 const src=readFileSync(name,"utf8");
 assert.match(src,/createSupabaseFetch\(/,`Missing Lovable opaque-key fetch adapter: ${name}`);
 assert.match(src,/assertStagingSupabaseUrl\(/,`Missing exact Staging backend guard: ${name}`);
}
const guard=readFileSync("src/integrations/supabase/staging-guard.ts","utf8");
assert.match(guard,/VERIFIED_STAGING_PROJECT_REF = "wnakrxkosofufxfqacrx"/);
const root=readFileSync("src/routes/__root.tsx","utf8");
assert.match(root,/STAGING ONLY/, "Staging page must be visibly labelled");
assert.match(root,/noindex, nofollow, noarchive/,
  "Staging pages must not be indexed by search engines");
const whatsApp=readFileSync("src/lib/whatsapp.ts","utf8");
assert.match(whatsApp,/MERCHANT_PHONE = "STAGING_DISABLED"/);
assert.doesNotMatch(whatsApp,/https:\/\/wa\.me\/\$\{MERCHANT_PHONE\}/,
  "Staging source must not send messages to external wa.me destinations");
console.log(`Staging read-only selective source import manifest: ${seen.size} source files verified; no production DB or credentials copied`);
