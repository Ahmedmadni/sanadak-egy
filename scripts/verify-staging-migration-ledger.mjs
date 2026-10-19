// Staging-only audit of the locally pinned migration file contents and
// manually recorded success boundary. Does NOT inspect/alter any database.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = "supabase/migrations";
const ledger = JSON.parse(readFileSync("supabase/verification/staging-baseline-ledger.json", "utf8"));
const files = readdirSync(root).filter((f) => f.endsWith(".sql")).sort();

assert.equal(ledger.environment, "Sanadak independent staging only");
assert.equal(ledger.project_id, "a5ba6f1c-a324-4761-a604-2936a1f8f5cf");
assert.equal(ledger.source_branch, "staging/sanadak-isolated-s0");
assert.equal(ledger.baseline_total, files.length);
assert.equal(ledger.baseline_total, 30);
assert.equal(ledger.baseline_completed, 13);
assert.equal(ledger.files.length, files.length);
assert.deepEqual(ledger.files.map((m) => m.file), files);
assert.equal(ledger.files[ledger.baseline_completed].file, "20260728045306_be350871-ac57-46a4-8d5b-75556305157b.sql");

for (const [i, item] of ledger.files.entries()) {
  assert.equal(item.order, i + 1);
  assert.equal(item.state, i < ledger.baseline_completed ? "applied-manually" : "pending",
    `Unexpected execution state for ${item.file}`);
  assert.match(item.git_blob_sha, /^[a-f0-9]{40}$/);
  const raw = readFileSync(join(root, item.file));
  const hash = createHash("sha1")
    .update(`blob ${raw.length}\0`)
    .update(raw)
    .digest("hex");
  assert.equal(hash, item.git_blob_sha, `Migration content changed since Staging ledger snapshot: ${item.file}`);
}
console.log(`Staging baseline ledger validated: ${ledger.baseline_completed}/${ledger.baseline_total} manually applied, remaining ${ledger.baseline_total - ledger.baseline_completed}`);
