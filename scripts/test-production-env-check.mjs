#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const checker = resolve(root, "scripts/check-production-env.mjs");
const baseEnv = { PATH: process.env.PATH ?? "", NODE_ENV: "test" };

const missing = spawnSync(process.execPath, [checker, "--strict"], {
  cwd: root, encoding: "utf8", env: baseEnv,
});
assert.notEqual(missing.status, 0, "strict mode must fail when required configuration is absent");
assert.match(missing.stdout, /SUPABASE_SERVICE_ROLE_KEY/);
assert.doesNotMatch(missing.stdout, /test-secret-do-not-print/);

const configuredEnv = {
  ...baseEnv,
  NODE_ENV: "production",
  TAMV_DEPLOYMENT_ENV: "production",
  VERCEL: "1",
  VERCEL_URL: "tamv-production.example.vercel.app",
  VERCEL_ENV: "production",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
  SUPABASE_SERVICE_ROLE_KEY: "test-secret-do-not-print",
  TAMV_GOVERNANCE_ACTOR_SALT: "a".repeat(40),
  LOVABLE_API_KEY: "test-lovable-key",
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "test-redis-token",
  TAMV_REVIEW_QUOTA_KEY_SALT: "b".repeat(40),
  TAMV_CAPABILITY_QUOTA_KEY_SALT: "c".repeat(40),
  TAMV_ATTRIBUTION_PUBLIC_KEY: "-----BEGIN PUBLIC KEY-----\\nTEST\\n-----END PUBLIC KEY-----",
  TAMV_RELEASE_MANIFEST_SHA256: "sha256:" + "a".repeat(64),
  TAMV_CERTIFICATION_REQUIRED: "true",
};
const valid = spawnSync(process.execPath, [checker, "--strict"], {
  cwd: root, encoding: "utf8", env: configuredEnv,
});
assert.equal(valid.status, 0, valid.stderr || valid.stdout);
assert.match(valid.stdout, /configuration shape passed/);
assert.doesNotMatch(valid.stdout, /test-secret-do-not-print|test-redis-token|test-lovable-key/);

const invalidUrl = spawnSync(process.execPath, [checker, "--strict"], {
  cwd: root, encoding: "utf8", env: { ...configuredEnv, SUPABASE_URL: "http://example.supabase.co" },
});
assert.notEqual(invalidUrl.status, 0, "non-HTTPS Supabase URL must fail strict mode");
assert.match(invalidUrl.stdout, /MISSING_OR_INVALID SUPABASE_URL/);

const nonProductionTarget = spawnSync(process.execPath, [checker, "--strict"], {
  cwd: root, encoding: "utf8", env: { ...configuredEnv, VERCEL_ENV: "preview" },
});
assert.notEqual(nonProductionTarget.status, 0, "Preview must not pass the production-only preflight");
assert.match(nonProductionTarget.stdout, /MISSING_OR_INVALID TAMV_DEPLOYMENT_ENV/);

const wrongExplicitTarget = spawnSync(process.execPath, [checker, "--strict"], {
  cwd: root, encoding: "utf8", env: { ...configuredEnv, TAMV_DEPLOYMENT_ENV: "staging" },
});
assert.notEqual(wrongExplicitTarget.status, 0, "staging must not pass the production-only preflight");
assert.match(wrongExplicitTarget.stdout, /MISSING_OR_INVALID TAMV_DEPLOYMENT_ENV/);

const unknownVercelTarget = spawnSync(process.execPath, [checker, "--strict"], {
  cwd: root, encoding: "utf8", env: { ...configuredEnv, VERCEL_ENV: "" },
});
assert.notEqual(unknownVercelTarget.status, 0, "Vercel runtime with unknown target must not pass strict production preflight");
assert.match(unknownVercelTarget.stdout, /MISSING_OR_INVALID TAMV_DEPLOYMENT_ENV/);

const missingCapabilitySalt = spawnSync(process.execPath, [checker, "--strict"], {
  cwd: root, encoding: "utf8", env: { ...configuredEnv, TAMV_CAPABILITY_QUOTA_KEY_SALT: "" },
});
assert.notEqual(missingCapabilitySalt.status, 0);
assert.match(missingCapabilitySalt.stdout, /MISSING_OR_INVALID TAMV_CAPABILITY_QUOTA_KEY_SALT/);

const missingApprovedRelease = spawnSync(process.execPath, [checker, "--strict"], {
  cwd: root, encoding: "utf8", env: { ...configuredEnv, TAMV_RELEASE_MANIFEST_SHA256: "" },
});
assert.notEqual(missingApprovedRelease.status, 0);
assert.match(missingApprovedRelease.stdout, /MISSING_OR_INVALID TAMV_RELEASE_MANIFEST_SHA256/);

console.log("Production environment preflight tests passed (8 scenarios).");
