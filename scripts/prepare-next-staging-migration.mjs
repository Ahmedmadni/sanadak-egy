// Prepare the single next Staging baseline SQL file. No DB connection,
// credentials, filesystem mutation, or migration bookkeeping changes.
// Only consume the generated SQL in the verified Staging project after
// manual review. Never auto-apply this output.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = "supabase/migrations";
const ledger = JSON.parse(readFileSync("supabase/verification/staging-baseline-ledger.json", "utf8"));
const next = ledger.files[ledger.baseline_completed];
assert.ok(next, "No pending Staging baseline migration");
assert.equal(next.order, ledger.baseline_completed + 1);
assert.equal(next.state, "pending");
assert.equal(ledger.project_id, "a5ba6f1c-a324-4761-a604-2936a1f8f5cf");
assert.equal(ledger.baseline_completed, 13, "Review and update execution ledger before preparing next SQL");
const source = readFileSync(join(root, next.file));
const digest = createHash("sha1").update(`blob ${source.length}\0`).update(source).digest("hex");
assert.equal(digest, next.git_blob_sha, "The next migration has changed: STOP and review");

const text = source.toString("utf8");
const embeddedTransaction = /^\s*BEGIN\s*;\s*$/mi.test(text) || /^\s*COMMIT\s*;\s*$/mi.test(text);
assert.equal(embeddedTransaction, false,
  "The next migration has an embedded transaction; review manually before composing");

const guard = `DO $staging_guard$ BEGIN
  IF current_database() <> 'postgres'
    OR inet_server_addr()::text <> '2a05:d018:10e0:3301:ec65:1759:a8e9:e6e5/128'
    OR to_regclass('public.tenants') IS NULL
    OR to_regclass('public.activity_types') IS NULL
    OR to_regclass('public.tenant_documents') IS NULL
    OR to_regprocedure('private.is_tenant_member(uuid,uuid,text)') IS NULL
    OR to_regclass('supabase_migrations.schema_migrations') IS NOT NULL
    OR EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'user_roles'
        AND policyname = 'First admin bootstrap'
    )
  THEN
    RAISE EXCEPTION 'STOP: NOT THE VERIFIED SANADAK STAGING S1 ENVIRONMENT';
  END IF;
END $staging_guard$;`;

if (process.argv.includes("--check")) {
  console.log(`Ready to prepare Staging-only migration #${next.order}: ${next.file}; SQL blob hash verified`);
} else {
  // stdout is a reviewable SQL artifact, never executed by this script.
  process.stdout.write(
    `-- SANADAK STAGING ONLY; DO NOT RUN ON PRODUCTION.\n` +
    `-- Lovable staging project: ${ledger.project_id}\n` +
    `-- Staging baseline file #${next.order} / ${ledger.baseline_total}: ${next.file}\n` +
    `-- Git blob SHA: ${digest}\n` +
    `-- PRECONDITION: Run ` + "`" + `staging-s1-resume-readonly.sql` + "`" +
    ` and verify independently before applying this output.\n` +
    `BEGIN;\n${guard}\n${text}\nCOMMIT;\n`
  );
}
