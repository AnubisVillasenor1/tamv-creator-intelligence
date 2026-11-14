/**
 * TAMV GENESIS Ω — public kernel surface.
 *
 * Everything exported here is deterministic and side-effect free. Filesystem,
 * clock and hashing are injected by the caller so the same code runs in the
 * browser, the CLI and the test suite.
 */

export * from "./types.ts";
export * from "./evidence.ts";
export * from "./claims.ts";
export * from "./capabilities.ts";
export * from "./workledger.ts";
export * from "./scorecard.ts";
export * from "./knowledge.ts";
export * from "./policy.ts";
export * from "./corpus.ts";
export * from "./profiles.ts";
export * from "./sovereign/index.ts";

export const GENESIS_VERSION = "2.0.0";
export const GENESIS_SCHEMA = "tamv.genesis.bundle.v1";
