#!/usr/bin/env node
/**
 * Regression tests for the PostgreSQL ledger probe's safety gates.
 * These cases must exit before any database connection is attempted.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const probe = fileURLToPath(new URL("./test-hypercore-ledger-postgres.mjs", import.meta.url));

function runProbe(overrides = {}) {
  const env = {
    ...process.env,
    TAMV_HYPERCORE_LEDGER_TEST: "1",
    TAMV_HYPERCORE_TEST_DATABASE_URL: "postgres://localhost:5432/tamv_ledger_test",
    TAMV_HYPERCORE_TEST_ALLOW_REMOTE: "",
    ...overrides,
  };
  return spawnSync(process.execPath, [probe], { encoding: "utf8", env, timeout: 5000 });
}

const cases = [
  {
    name: "requires explicit opt-in",
    env: { TAMV_HYPERCORE_LEDGER_TEST: "0" },
    expected: "set TAMV_HYPERCORE_LEDGER_TEST=1",
  },
  {
    name: "requires database URL",
    env: { TAMV_HYPERCORE_TEST_DATABASE_URL: "" },
    expected: "TAMV_HYPERCORE_TEST_DATABASE_URL is required",
  },
  {
    name: "rejects malformed database URL",
    env: { TAMV_HYPERCORE_TEST_DATABASE_URL: "not-a-url" },
    expected: "test database URL is invalid",
  },
  {
    name: "rejects non-PostgreSQL URL scheme",
    env: { TAMV_HYPERCORE_TEST_DATABASE_URL: "https://localhost/tamv_ledger_test" },
    expected: "must use postgres:// or postgresql://",
  },
  {
    name: "requires an explicit disposable database name",
    env: { TAMV_HYPERCORE_TEST_DATABASE_URL: "postgres://localhost:5432/tamvledger" },
    expected: "database name must contain test, disposable, or ci",
  },
  {
    name: "rejects production-like database names even with test token",
    env: { TAMV_HYPERCORE_TEST_DATABASE_URL: "postgres://localhost:5432/tamv_production_test" },
    expected: "looks like a shared or production environment",
  },
  {
    name: "requires explicit opt-in for remote database hosts",
    env: { TAMV_HYPERCORE_TEST_DATABASE_URL: "postgres://db.example.invalid:5432/tamv_ledger_test" },
    expected: "without TAMV_HYPERCORE_TEST_ALLOW_REMOTE=1",
  },
];

let failures = 0;
for (const testCase of cases) {
  const result = runProbe(testCase.env);
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  try {
    assert.equal(result.status, 64, `${testCase.name}: expected exit 64, got ${result.status}; output: ${output}`);
    assert.match(output, new RegExp(testCase.expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    console.log(`PASS: ${testCase.name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL: ${testCase.name}: ${error.message}`);
  }
}

if (failures > 0) {
  console.error(`${failures} ledger safety guard test(s) failed.`);
  process.exitCode = 1;
} else {
  console.log(`PASS: all ${cases.length} ledger safety guard tests passed without opening a database connection.`);
}
