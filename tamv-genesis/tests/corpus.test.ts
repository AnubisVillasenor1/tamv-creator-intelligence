import test from "node:test";
import assert from "node:assert/strict";

import {
  countTopics,
  kindOf,
  licenseOf,
  renderCorpusCatalog,
  sensitivePolicyHolds,
  sensitivityOf,
  shouldSkip,
  summarizeCorpus,
  withExtractedChars,
  type CorpusEntry,
} from "../src/corpus.ts";

const digest = (seed: string) => "sha256:" + seed.repeat(64).slice(0, 64);

function entry(overrides: Partial<CorpusEntry>): CorpusEntry {
  return {
    path: "notes.md",
    sha256: digest("a"),
    bytes: 100,
    kind: "document",
    ext: "md",
    sensitivity: "P3-normal",
    license: "unknown",
    content: "extracted",
    ...overrides,
  };
}

test("sensitivity is decided from the name before any read", () => {
  assert.equal(sensitivityOf("RECUPERACION-GITHUB-OsoPanda1.md"), "P0-credential");
  assert.equal(sensitivityOf("backup/.env"), "P0-credential");
  assert.equal(sensitivityOf("notes/.env.example"), "P0-credential");
  assert.equal(sensitivityOf("logs/run.log"), "P0-credential");
  assert.equal(sensitivityOf("XCLUSIVE by TAMV ONLINE NETWORK.md"), "P1-restricted");
  assert.equal(sensitivityOf("assets/photo.jpg"), "P2-media");
  assert.equal(sensitivityOf("docs/governance.md"), "P3-normal");
});

test("kind and license classification are stable", () => {
  assert.equal(kindOf("a/b/c.PDF"), "document");
  assert.equal(kindOf("app/src/main.ts"), "code");
  assert.equal(kindOf("media/clip.mp4"), "video");
  assert.equal(kindOf("unknown.bin"), "other");
  assert.equal(licenseOf("LICENSE"), "declared");
  assert.equal(licenseOf("NOTICE.md"), "declared");
  assert.equal(licenseOf("ISABELLA-VERSION-TERMINUS-V6-main.zip"), "third-party");
  assert.equal(licenseOf("photo.jpg"), "unknown");
});

test("dependency and OS noise never enters the corpus", () => {
  assert.equal(shouldSkip("node_modules/pkg/index.js"), true);
  assert.equal(shouldSkip("app/node_modules/pkg/index.js"), true);
  assert.equal(shouldSkip("repo/.git/config"), true);
  assert.equal(shouldSkip("docs/desktop.ini"), true);
  assert.equal(shouldSkip("_audit-tci/README.md"), true);
  assert.equal(shouldSkip("docs/CORPUS-CATALOG.md"), false);
});

test("summary counts kinds, content, duplicates and topics", () => {
  const entries = [
    entry({ path: "a.md", sha256: digest("a"), bytes: 100 }),
    entry({ path: "copy.md", sha256: digest("a"), bytes: 100 }),
    entry({ path: "b.jpg", sha256: digest("b"), bytes: 200, kind: "image", ext: "jpg", sensitivity: "P2-media", content: "binary" }),
    entry({ path: "secret.md", sha256: digest("c"), bytes: 50, sensitivity: "P0-credential", content: "withheld" }),
    entry({ path: "empty.md", sha256: digest("d"), bytes: 0, content: "empty" }),
  ];
  const base = summarizeCorpus(entries, {
    generatedAt: "2026-11-13T00:00:00Z",
    rootLabel: "fixture",
    hashes: { inventory: digest("e"), textIndex: digest("f") },
  });
  const summary = withExtractedChars(base, 1234, countTopics("TAMV e Isabella, gobernanza"));

  assert.equal(summary.files, 5);
  assert.equal(summary.bytes, 450);
  assert.equal(summary.byKind.document, 4);
  assert.equal(summary.byKind.image, 1);
  assert.equal(summary.content.extracted, 2);
  assert.equal(summary.content.withheld, 1);
  assert.equal(summary.content.binary, 1);
  assert.equal(summary.content.empty, 1);
  assert.equal(summary.duplicates.groups, 1);
  assert.equal(summary.duplicates.redundantBytes, 100);
  assert.equal(summary.sensitive.withheld, 1);
  assert.equal(summary.sensitive.extracted, 0);
  assert.equal(summary.topics.tamv, 1);
  assert.equal(summary.content.extractedChars, 1234);
  assert.equal(sensitivePolicyHolds(summary), true);
});

test("the withhold policy fails closed if a sensitive file is marked extracted", () => {
  const base = summarizeCorpus([entry({ path: ".env", sensitivity: "P0-credential", content: "withheld" })], {
    generatedAt: "2026-11-13T00:00:00Z",
    rootLabel: "fixture",
    hashes: { inventory: digest("a"), textIndex: digest("b") },
  });
  assert.equal(sensitivePolicyHolds(base), true);
  assert.equal(sensitivePolicyHolds({ ...base, sensitive: { ...base.sensitive, extracted: 1 } }), false);
  assert.equal(
    sensitivePolicyHolds({ ...base, content: { ...base.content, withheld: 0 } }),
    false,
  );
});

test("the public catalogue never prints source paths", () => {
  const secretPath = "RECUPERACION-GITHUB-OsoPanda1.md";
  const summary = summarizeCorpus([entry({ path: secretPath, sensitivity: "P0-credential", content: "withheld" })], {
    generatedAt: "2026-11-13T00:00:00Z",
    rootLabel: "fixture",
    hashes: { inventory: digest("a"), textIndex: digest("b") },
  });
  const catalog = renderCorpusCatalog(summary);
  assert.equal(catalog.includes(secretPath), false);
  assert.match(catalog, /P0-credential/);
  assert.match(catalog, /bytes opacos/);
});
