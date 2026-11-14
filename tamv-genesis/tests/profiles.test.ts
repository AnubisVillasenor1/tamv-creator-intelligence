import test from "node:test";
import assert from "node:assert/strict";

import {
  auditProfiles,
  domainOf,
  normalizeProfile,
  normalizeRepo,
  renderProfilesMarkdown,
  summarizeProfile,
  type ProfileRepo,
  type ProfilesDocument,
  type RawRepo,
} from "../src/profiles.ts";

const NOW = new Date("2026-11-13T23:59:59Z");

function raw(overrides: Partial<RawRepo>): RawRepo {
  return {
    name: "repo",
    description: "TAMV governance",
    fork: false,
    language: "TypeScript",
    topics: ["tamv", "governance"],
    stargazers_count: 0,
    forks_count: 0,
    license: { spdx_id: "AGPL-3.0", name: "GNU Affero" },
    created_at: "2025-01-02T00:00:00Z",
    pushed_at: "2026-01-02T00:00:00Z",
    archived: false,
    homepage: null,
    ...overrides,
  };
}

test("repository metadata is normalized without inflating signals", () => {
  const repo = normalizeRepo(
    raw({
      name: " demo ",
      description: "  spaced   text  ",
      stargazers_count: -3,
      forks_count: 2.9,
      topics: ["tamv", "tamv", "ai"],
      license: { spdx_id: "NOASSERTION", name: "Custom" },
    }),
  );
  assert.equal(repo.name, "demo");
  assert.equal(repo.description, "spaced text");
  assert.equal(repo.stars, 0);
  assert.equal(repo.forks, 2);
  assert.deepEqual(repo.topics, ["ai", "tamv"]);
  assert.equal(repo.license, "Custom");
  assert.equal(repo.createdAt, "2025-01-02");
  assert.equal(repo.pushedAt, "2026-01-02");
});

test("domains separate restricted and third-party tooling from authored work", () => {
  assert.equal(domainOf({ name: "xclusive-by-TAMV-Online", description: "", topics: [] }), "restricted-vertical");
  assert.equal(domainOf({ name: "TeleGram-Scraper", description: "scraper", topics: [] }), "bots-scraping");
  assert.equal(domainOf({ name: "ISABELLA-VERSION-TERMINUS-V6", description: "", topics: [] }), "tamv-isabella");
  assert.equal(domainOf({ name: "visitarealdelmonte", description: "turismo", topics: [] }), "territory-tourism");
  assert.equal(domainOf({ name: "curso-musica", description: "", topics: [] }), "education-music");
  assert.equal(domainOf({ name: "my-landing-page", description: "", topics: [] }), "web-infrastructure");
  assert.equal(domainOf({ name: "zzz", description: "", topics: [] }), "other");
});

test("summary counts originals and forks separately", () => {
  const repos: ProfileRepo[] = [
    normalizeRepo(raw({ name: "a", stargazers_count: 2, forks_count: 1, created_at: "2026-01-01T00:00:00Z" })),
    normalizeRepo(raw({ name: "b", stargazers_count: 0, created_at: "2025-01-01T00:00:00Z" })),
    normalizeRepo(raw({ name: "forked", fork: true, stargazers_count: 10, forks_count: 5 })),
  ];
  const summary = summarizeProfile(repos);
  assert.equal(summary.total, 3);
  assert.equal(summary.originals, 2);
  assert.equal(summary.forks, 1);
  assert.equal(summary.originalStars, 2);
  assert.equal(summary.stars, 12);
  assert.equal(summary.zeroStarOriginals, 1);
  assert.equal(summary.createdByYear["2026"], 1);
  assert.equal(summary.createdByYear["2025"], 1);
  assert.equal(summary.licenses.declared, 2);
  assert.equal(summary.byDomain["tamv-isabella"], 3);
});

test("a consistent snapshot passes and a tampered total fails", () => {
  const profile = normalizeProfile({
    user: { login: "tester", name: "Tester", public_repos: 2, created_at: "2024-01-01T00:00:00Z" },
    repos: [raw({ name: "a" }), raw({ name: "b", fork: true })],
    capturedAt: "2026-11-13",
  });
  const doc: ProfilesDocument = {
    schema: "tamv.profiles.v1",
    capturedAt: "2026-11-13",
    method: "fixture",
    policy: "fixture",
    profiles: [profile],
  };
  assert.deepEqual(auditProfiles(doc, NOW), []);

  const tampered: ProfilesDocument = {
    ...doc,
    profiles: [{ ...profile, summary: { ...profile.summary, forks: 0 } }],
  };
  assert.ok(auditProfiles(tampered, NOW).some((problem) => problem.code === "count-mismatch"));
  assert.ok(
    auditProfiles({ ...doc, schema: "wrong" as ProfilesDocument["schema"] }, NOW).some(
      (problem) => problem.code === "schema-mismatch",
    ),
  );
});

test("the generated report separates forks, stars and authorship", () => {
  const profile = normalizeProfile({
    user: { login: "tester", name: "Tester", public_repos: 2 },
    repos: [
      raw({ name: "original-zero", stargazers_count: 0 }),
      raw({ name: "forked", fork: true, stargazers_count: 10 }),
    ],
    capturedAt: "2026-11-13",
  });
  const markdown = renderProfilesMarkdown({
    schema: "tamv.profiles.v1",
    capturedAt: "2026-11-13",
    method: "fixture",
    policy: "fixture",
    profiles: [profile],
  });
  assert.match(markdown, /tester/);
  assert.match(markdown, /fork no es obra propia/);
  assert.match(markdown, /1 de 1 originales tienen 0 estrellas/);
  assert.match(markdown, /Regla de lectura/);
  assert.match(markdown, /No sirve para acreditar horas/);
});
