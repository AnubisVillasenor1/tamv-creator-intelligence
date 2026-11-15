#!/usr/bin/env node
/**
 * Production environment preflight.
 * Never prints secret values. Presence/shape checks do not prove provider connectivity,
 * schema deployment, signature validity, or provenance.
 */
import { URL } from "node:url";

const strict = process.argv.includes("--strict");
const checks = [
  { group: "Runtime environment", key: "NODE_ENV", required: true, validate: (v) => v === "production" },
  { group: "Runtime environment", key: "TAMV_DEPLOYMENT_ENV", required: true, validate: (v) => {
    const vercelEnv = (process.env.VERCEL_ENV ?? "").trim().toLowerCase();
    const isVercelRuntime = Boolean((process.env.VERCEL ?? "").trim()) || Boolean((process.env.VERCEL_URL ?? "").trim());
    const targetIsProduction = isVercelRuntime ? vercelEnv === "production" : (!vercelEnv || vercelEnv === "production");
    return v.trim().toLowerCase() === "production" && targetIsProduction;
  } },
  { group: "Supabase identity and persistence", key: "SUPABASE_URL", required: true, validate: isHttpsUrl },
  { group: "Supabase identity and persistence", key: "SUPABASE_PUBLISHABLE_KEY", required: true },
  { group: "Supabase identity and persistence", key: "SUPABASE_SERVICE_ROLE_KEY", required: true },
  { group: "Governance", key: "TAMV_GOVERNANCE_ACTOR_SALT", required: true, validate: (v) => v.length >= 32 },
  { group: "AI inference", key: "LOVABLE_API_KEY", required: true },
  { group: "Distributed review quota", key: "UPSTASH_REDIS_REST_URL", required: true, validate: isHttpsUrl },
  { group: "Distributed review quota", key: "UPSTASH_REDIS_REST_TOKEN", required: true },
  { group: "Distributed review quota", key: "TAMV_REVIEW_QUOTA_KEY_SALT", required: true, validate: (v) => v.length >= 32 },
  { group: "Release verification", key: "TAMV_ATTRIBUTION_PUBLIC_KEY", required: true, validate: (v) => v.includes("BEGIN PUBLIC KEY") && v.includes("END PUBLIC KEY") },
  { group: "Release verification", key: "TAMV_CERTIFICATION_REQUIRED", required: true, validate: (v) => v === "true" },
];

function isHttpsUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

let failures = 0;
const groups = new Map();
for (const check of checks) {
  const value = process.env[check.key] ?? "";
  const present = value.trim().length > 0;
  const valid = present && (!check.validate || check.validate(value));
  if (!groups.has(check.group)) groups.set(check.group, []);
  groups.get(check.group).push({ key: check.key, valid });
  if (!valid && check.required) failures += 1;
}

console.log("TAMV production environment preflight (" + (strict ? "strict" : "advisory") + ")");
for (const [group, entries] of groups) {
  console.log("\n[" + group + "]");
  for (const entry of entries) console.log("  " + (entry.valid ? "OK " : "MISSING_OR_INVALID ") + entry.key);
}
console.log("\nResult: " + (failures === 0 ? "configuration shape passed" : failures + " required setting(s) missing or invalid"));
console.log("Presence checks do not validate credentials, remote connectivity, database schema, audit wiring, signed release artifacts, or build provenance.");
if (strict && failures > 0) process.exitCode = 1;
