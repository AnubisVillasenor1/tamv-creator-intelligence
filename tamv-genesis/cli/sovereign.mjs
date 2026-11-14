#!/usr/bin/env node
/**
 * TAMV GENESIS Ω — sovereignty console.
 *
 * Commands:
 *   audit    run every check and print a report (exit 1 on failed blocking check)
 *   verify   re-derive the work-ledger chain and manifest hashes
 *   score    print the scorecard computed from the dimensions
 *   report   write docs/audit/2026-11-13/GENERATED.md
 *   corpus   print local corpus aggregates (no paths)
 *   profiles print GitHub profile aggregates
 *   seal     verify the v3 pack seal structure and content (signature state reported)
 *   build    write dist/genesis.json plus a SHA-256 manifest
 *   packet   build and print the external review artifact
 *
 * Usage: node --experimental-strip-types tamv-genesis/cli/sovereign.mjs <command>
 */

import { createHash, createPublicKey, verify as verifySignature } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assessCapability,
  assessClaim,
  auditKnowledgeSources,
  auditLedger,
  auditProfiles,
  compileScorecard,
  detectCapabilityDrift,
  findConflicts,
  formatScorecard,
  sensitivePolicyHolds,
  summarizeClaims,
  verifyLedger,
  GENESIS_SCHEMA,
  GENESIS_VERSION,
} from "../src/index.ts";
import { canonicalJson } from "../src/sovereign/canonical.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "..");
const REPO_ROOT = resolve(PACKAGE_ROOT, "..");
const DATA = join(PACKAGE_ROOT, "data");

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function readJson(name) {
  const raw = readFileSync(join(DATA, name), "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

function readRepo(relative) {
  return readFileSync(join(REPO_ROOT, relative), "utf8");
}

function existsRepo(relative) {
  return existsSync(join(REPO_ROOT, relative));
}

const identity = readJson("identity.json");
const capabilitiesDoc = readJson("capabilities.json");
const claimsDoc = readJson("claims.json");
const ledger = readJson("work-ledger.json");
const scorecardDoc = readJson("scorecard.json");
const knowledgeDoc = readJson("knowledge-sources.json");
const packDoc = JSON.parse(readRepo("tamv-pack/pack.json"));

const capabilities = capabilitiesDoc.capabilities;

/* ------------------------------------------------------------------ */
/* checks                                                              */
/* ------------------------------------------------------------------ */

function certifyManifest() {
  const manifest = JSON.parse(readRepo("tamv-attribution.json"));
  const signature = readRepo("tamv-attribution.sig").trim();
  const mismatches = [];
  for (const [path, expected] of Object.entries(manifest.integrity.files)) {
    if (!existsRepo(path)) {
      mismatches.push({ path, problem: "missing" });
      continue;
    }
    const actual = "sha256:" + sha256(readFileSync(join(REPO_ROOT, path)));
    if (actual !== expected) mismatches.push({ path, problem: "mismatch" });
  }
  return {
    hashesValid: mismatches.length === 0,
    signatureState: signature === "UNSIGNED_RELEASE_PENDING" ? "unsigned" : "signed",
    signed: signature !== "UNSIGNED_RELEASE_PENDING" && signature.length > 0,
    mismatches,
    protectedFiles: Object.keys(manifest.integrity.files).length,
  };
}

function checkCapabilityVocabulary() {
  const policySource = readRepo("src/lib/hypercore-turbo/policy.ts");
  const union = policySource.match(/export type GovernedCapability =([\s\S]*?);/);
  const policyIds = union
    ? [...union[1].matchAll(/"([^"]+)"/g)].map((match) => match[1])
    : [];
  const routeIds = [];
  for (const file of readdirSync(join(REPO_ROOT, "src/routes"))) {
    if (!file.endsWith(".ts") && !file.endsWith(".tsx")) continue;
    const source = readFileSync(join(REPO_ROOT, "src/routes", file), "utf8");
    for (const match of source.matchAll(/unavailableTamvCapabilityResponse\("([^"]+)"\)/g)) {
      routeIds.push(match[1]);
    }
  }
  const drift = detectCapabilityDrift(policyIds, routeIds);
  const catalogDrift = detectCapabilityDrift(
    policyIds,
    capabilities.map((entry) => entry.id),
  );
  return {
    policyIds,
    routeIds,
    // Route ids that the policy does not declare: the dangerous direction.
    drift,
    catalogDrift,
    routeUndeclared: drift.undeclared,
    policyMissingFromCatalog: catalogDrift.missing,
  };
}

function checkSkillInventory() {
  const skills = packDoc.skills ?? [];
  const dirs = existsSync(join(REPO_ROOT, "tamv-pack/skills"))
    ? readdirSync(join(REPO_ROOT, "tamv-pack/skills")).filter((entry) =>
        statSync(join(REPO_ROOT, "tamv-pack/skills", entry)).isDirectory(),
      )
    : [];
  const registry = readRepo("src/lib/skill-registry.ts");
  const registryIds = [...registry.matchAll(/"id":\s*"([^"]+)"/g)].map((match) => match[1]);
  const placeholder = (registry.match(/Consultar contrato del skill/g) ?? []).length;
  return {
    declared: skills.length,
    folders: dirs.length,
    registry: registryIds.length,
    duplicates: skills.filter((id, index) => skills.indexOf(id) !== index),
    missingFolders: skills.filter((id) => !dirs.includes(id)),
    placeholderFields: placeholder,
  };
}

function checkVersionAndLinks() {
  const ui = readRepo("src/routes/index.tsx");
  const version = ui.match(/PACK v([0-9]+\.[0-9]+\.[0-9]+)/)?.[1] ?? null;
  // `git clone` accepts the trailing `.git`; it is the same repository.
  const normalize = (link) => link.replace(/\.git$/, "").replace(/\/$/, "");
  const links = [...ui.matchAll(/https:\/\/github\.com\/[^"'\s<]+/g)].map((match) => match[0]);
  const expected = normalize(identity.canonical.repository);
  return {
    declaredVersion: packDoc.version,
    uiVersion: version,
    versionMatches: version === packDoc.version,
    links,
    linksCanonical: links.length > 0 && links.every((link) => normalize(link) === expected),
  };
}

function checkClaims() {
  const assessments = claimsDoc.claims.map((claim) => ({
    claim,
    assessment: assessClaim(claim, new Date("2026-11-13T00:00:00Z")),
  }));
  const overreach = assessments.filter(
    (entry) =>
      entry.claim.status !== entry.assessment.effectiveStatus &&
      entry.claim.status !== "contradicted" &&
      entry.claim.status !== "retracted",
  );
  const summary = summarizeClaims(claimsDoc.claims, new Date("2026-11-13T00:00:00Z"));
  return { assessments, overreach, summary, conflicts: findConflicts(claimsDoc.claims) };
}

function checkLedger() {
  const verification = verifyLedger(ledger, sha256);
  const findings = auditLedger(ledger);
  return { verification, findings };
}

function checkScorecard() {
  const compiled = compileScorecard({
    subject: scorecardDoc.subject,
    generatedAt: scorecardDoc.generatedAt,
    verdict: scorecardDoc.verdict,
    dimensions: scorecardDoc.dimensions,
    gates: scorecardDoc.gates,
  });
  const drift =
    Math.abs(compiled.scorecard.weightedScore - scorecardDoc.weightedScore) > 0.05;
  return { ...compiled, drift, declaredScore: scorecardDoc.weightedScore };
}

function checkKnowledge() {
  const problems = auditKnowledgeSources(knowledgeDoc.sources);
  const excluded = knowledgeDoc.sources.filter((source) => source.use === "excluded");
  return { problems, excluded };
}

function checkLicensing() {
  const notice = existsRepo("NOTICE") ? readRepo("NOTICE") : "";
  const license = existsRepo("LICENSE") ? readRepo("LICENSE") : "";
  const map = existsRepo("LICENSE-MAP.md");
  return {
    notice: notice.includes("AGPL-3.0-only"),
    fullLicense: license.includes("GNU AFFERO GENERAL PUBLIC LICENSE"),
    licenseMap: map,
  };
}

function checkReviewGuard() {
  const guard = existsRepo("src/lib/review-guard.ts") ? readRepo("src/lib/review-guard.ts") : "";
  const fn = readRepo("src/lib/content.functions.ts");
  return {
    guardPresent: guard.length > 0,
    timeout: /TIMEOUT_MS|AbortSignal\.timeout|timeoutMs/.test(guard),
    quota: /takeToken|quota|limit/i.test(guard),
    authMiddleware: /requireSupabaseAuth/.test(fn),
    certificationGate: /requireTamvCertification/.test(fn),
  };
}

function checkErrorCorrelation() {
  const capture = readRepo("src/lib/error-capture.ts");
  const server = readRepo("src/server.ts");
  return {
    asyncLocalStorage: /AsyncLocalStorage/.test(capture),
    requestScope: /runWithErrorCapture/.test(server),
  };
}

const DIGEST = /^sha256:[a-f0-9]{64}$/;

function readData(name) {
  const path = join(DATA, name);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
}

function checkProfiles() {
  const doc = readData("github-profiles.json");
  if (!doc) {
    return { doc: null, problems: [{ login: "*", code: "count-mismatch", detail: "github-profiles.json ausente" }] };
  }
  return { doc, problems: auditProfiles(doc, new Date("2026-11-13T23:59:59Z")) };
}

function checkLocalCorpus() {
  const summary = readData("local-corpus-summary.json");
  if (!summary) return { summary: null, problems: ["local-corpus-summary.json ausente"] };
  const problems = [];
  if (summary.schema !== "tamv.corpus.summary.v1") problems.push(`schema=${summary.schema}`);
  if (!Number.isInteger(summary.files) || summary.files <= 0) problems.push("files inválido");
  if (!Number.isInteger(summary.bytes) || summary.bytes <= 0) problems.push("bytes inválido");

  const content = summary.content ?? {};
  const counted =
    (content.extracted ?? 0) + (content.withheld ?? 0) + (content.binary ?? 0) + (content.failed ?? 0) + (content.empty ?? 0);
  if (counted !== summary.files) problems.push(`contenido=${counted}≠${summary.files}`);

  const kinds = Object.values(summary.byKind ?? {}).reduce((total, value) => total + value, 0);
  if (kinds !== summary.files) problems.push(`tipos=${kinds}≠${summary.files}`);
  const sensitivity = Object.values(summary.bySensitivity ?? {}).reduce((total, value) => total + value, 0);
  if (sensitivity !== summary.files) problems.push(`sensibilidad=${sensitivity}≠${summary.files}`);

  if (!sensitivePolicyHolds(summary)) problems.push("P0/P1 con contenido extraído");
  if (!DIGEST.test(summary.hashes?.inventory ?? "")) problems.push("hash de inventario inválido");
  if (!DIGEST.test(summary.hashes?.textIndex ?? "")) problems.push("hash de índice de texto inválido");
  if (!Array.isArray(summary.exclusions) || !summary.exclusions.includes("node_modules") || !summary.exclusions.includes("_audit-tci")) {
    problems.push("exclusiones mínimas ausentes");
  }
  return { summary, problems };
}

const SECRET_PATTERNS = [
  ["github-token", /gh[pousr]_[A-Za-z0-9]{36,}/],
  ["github-fine-grained", /github_pat_[A-Za-z0-9_]{50,}/],
  ["openai-key", /\bsk-[A-Za-z0-9]{32,}\b/],
  ["slack-token", /xox[baprs]-[A-Za-z0-9-]{10,}/],
  ["aws-key", /\bAKIA[0-9A-Z]{16}\b/],
  ["private-key", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ["assigned-secret", /(?:password|passwd|contrase[nñ]a|api[_-]?key|secret|token)\s*[:=]\s*["'][^"'\s]{16,}["']/i],
];

function checkSensitiveGovernance() {
  const leaks = [];
  let scanned = 0;
  const roots = [
    "README.md",
    "AGENTS.md",
    "skills.sh.json",
    "docs",
    "tamv-genesis/data",
    "tamv-genesis/src",
    "tamv-genesis/scripts",
    "tamv-genesis/v3",
    "tamv-pack/skills",
  ];
  const textExtensions = /\.(?:md|json|ts|tsx|mjs|js|ya?ml|txt|sh|ps1|toml)$/i;
  const skipDirs = new Set(["node_modules", ".git", "dist", ".corpus"]);
  const visit = (relativePath) => {
    const absolute = join(REPO_ROOT, relativePath);
    if (!existsSync(absolute)) return;
    const stats = statSync(absolute);
    if (stats.isDirectory()) {
      for (const entry of readdirSync(absolute)) {
        if (skipDirs.has(entry)) continue;
        visit(join(relativePath, entry));
      }
      return;
    }
    if (!textExtensions.test(relativePath) || stats.size > 512 * 1024) return;
    // The detector itself contains the patterns; it is not a leak.
    if (relativePath === join("tamv-genesis", "cli", "sovereign.mjs")) return;
    scanned += 1;
    const lines = readRepo(relativePath).split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      for (const [kind, pattern] of SECRET_PATTERNS) {
        if (pattern.test(lines[index])) leaks.push({ path: relativePath, line: index + 1, kind });
      }
    }
  };
  for (const root of roots) visit(root);

  const restricted = knowledgeDoc.sources.filter((source) => source.sensitivity === "restricted");
  const restrictedExcluded = restricted.every((source) => source.use === "excluded");
  return { leaks, scanned, restricted: restricted.length, restrictedExcluded };
}

/* ------------------------------------------------------------------ */
/* v3 seal                                                             */
/* ------------------------------------------------------------------ */

function listRegularFiles(root) {
  const output = [];
  const visit = (relative) => {
    const absolute = resolve(root, relative);
    if (!existsSync(absolute)) return;
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      const next = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) visit(next);
      else if (entry.isFile()) output.push(next);
    }
  };
  visit("");
  return output.sort();
}

function checkV3Seal() {
  const packPath = join(PACKAGE_ROOT, "v3", "pack.json");
  const sealPath = join(PACKAGE_ROOT, "v3", "seals", "pack-seal.json");
  if (!existsSync(packPath) || !existsSync(sealPath)) {
    return { ok: false, skills: 0, signature: "missing", detail: "Falta pack.json o pack-seal.json de v3." };
  }
  const pack = JSON.parse(readFileSync(packPath, "utf8"));
  const seal = JSON.parse(readFileSync(sealPath, "utf8"));
  if (pack.schema !== "tamv.creator-intelligence.pack.v3" || seal.schema !== "tamv.pack-seal.v1") {
    return { ok: false, skills: 0, signature: "invalid", detail: "El esquema de v3 no coincide." };
  }
  const declaredIds = pack.publicSkills.map((skill) => skill.id).sort();
  const presentIds = readdirSync(join(PACKAGE_ROOT, "v3", "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  if (declaredIds.length !== 4 || JSON.stringify(declaredIds) !== JSON.stringify(presentIds)) {
    return {
      ok: false,
      skills: presentIds.length,
      signature: "n/a",
      detail: `Las cuatro skills públicas no coinciden: manifiesto=${declaredIds.join(",")} carpetas=${presentIds.join(",")}.`,
    };
  }

  const computed = [];
  for (const skill of pack.publicSkills) {
    const root = join(PACKAGE_ROOT, "v3", skill.path);
    const files = listRegularFiles(root);
    if (!files.includes("SKILL.md") || files.some((path) => path.includes(".."))) {
      return { ok: false, skills: declaredIds.length, signature: "n/a", detail: `La skill ${skill.id} no tiene SKILL.md válido.` };
    }
    const digests = files.map((path) => {
      const content = readFileSync(join(root, path));
      return { path, sha256: `sha256:${sha256(content)}`, bytes: content.byteLength };
    });
    const capabilities = [...skill.capabilities].sort();
    const entry = {
      id: skill.id,
      path: skill.path,
      requiresConsent: skill.requiresConsent === true,
      capabilities,
      files: digests,
    };
    computed.push({
      id: skill.id,
      path: skill.path,
      root: `sha256:${sha256(canonicalJson(entry))}`,
      files: digests,
    });
  }
  computed.sort((left, right) => left.id.localeCompare(right.id));

  for (const entry of computed) {
    const sealed = seal.skills.find((skill) => skill.id === entry.id);
    if (!sealed || sealed.root !== entry.root || sealed.path !== entry.path) {
      return { ok: false, skills: computed.length, signature: "n/a", detail: `La raíz de ${entry.id} no coincide con el sello.` };
    }
  }
  const computedRoot = `sha256:${sha256(canonicalJson({
    schema: seal.schema,
    pack: seal.pack,
    version: seal.version,
    issuedAt: seal.issuedAt,
    skills: seal.skills.map(({ id, path, root }) => ({ id, path, root })),
    internalContracts: seal.internalContracts ?? null,
  }))}`;
  if (computedRoot !== seal.root) {
    return { ok: false, skills: computed.length, signature: "n/a", detail: "La raíz del paquete no coincide con el sello." };
  }

  const signature = seal.signature ?? {};
  if (signature.state === "UNSIGNED_RELEASE_PENDING") {
    return { ok: true, skills: computed.length, signature: "unsigned", detail: `Raíz ${seal.root}; firma=UNSIGNED_RELEASE_PENDING (runtime fail-closed).` };
  }
  const publicPem = (process.env.TAMV_V3_PUBLIC_KEY ?? "").replace(/\\n/g, "\n").trim();
  if (!publicPem) {
    return { ok: true, skills: computed.length, signature: "unverified", detail: `Raíz ${seal.root}; firma presente pero sin TAMV_V3_PUBLIC_KEY para verificarla.` };
  }
  try {
    const payload = { ...seal };
    delete payload.signature;
    const valid = verifySignature(
      null,
      Buffer.from(canonicalJson(payload), "utf8"),
      createPublicKey(publicPem),
      Buffer.from(signature.value, "base64url"),
    );
    return {
      ok: valid,
      skills: computed.length,
      signature: valid ? "verified" : "invalid",
      detail: valid ? `Raíz ${seal.root}; firma Ed25519 verificada.` : "La firma Ed25519 no autentica el sello v3.",
    };
  } catch (error) {
    return { ok: false, skills: computed.length, signature: "invalid", detail: `No se pudo verificar la firma: ${error.message}` };
  }
}

/* ------------------------------------------------------------------ */
/* audit                                                               */
/* ------------------------------------------------------------------ */

function runAudit() {
  const certification = certifyManifest();
  const vocabulary = checkCapabilityVocabulary();
  const skills = checkSkillInventory();
  const version = checkVersionAndLinks();
  const claims = checkClaims();
  const ledgerCheck = checkLedger();
  const score = checkScorecard();
  const knowledge = checkKnowledge();
  const licensing = checkLicensing();
  const review = checkReviewGuard();
  const errors = checkErrorCorrelation();
  const profiles = checkProfiles();
  const corpus = checkLocalCorpus();
  const sensitive = checkSensitiveGovernance();
  const v3Seal = checkV3Seal();

  const capabilityAssessments = capabilities.map((capability) =>
    assessCapability(capability, {
      certificationValid: certification.signed && certification.hashesValid,
      killSwitchActive: false,
      now: new Date("2026-11-13T00:00:00Z"),
    }),
  );

  const checks = [];
  const push = (id, label, status, detail, blocking = false) =>
    checks.push({ id, label, status, detail, blocking });

  push(
    "K-01",
    "Integridad de los 22 archivos protegidos",
    certification.hashesValid ? "pass" : "fail",
    certification.hashesValid
      ? `${certification.protectedFiles} archivos coinciden con el manifiesto.`
      : `${certification.mismatches.length} archivos no coinciden: ${certification.mismatches.map((entry) => entry.path).join(", ")}`,
    true,
  );
  push(
    "K-02",
    "Firma del release",
    certification.signed ? "pass" : "fail",
    certification.signed
      ? "Firma presente."
      : "tamv-attribution.sig = UNSIGNED_RELEASE_PENDING. Honesto, pero bloquea toda capacidad premium.",
    true,
  );
  push(
    "K-03",
    "Vocabulario de capacidades",
    vocabulary.routeUndeclared.length === 0 && vocabulary.policyMissingFromCatalog.length === 0 ? "pass" : "fail",
    `política=${vocabulary.policyIds.length} rutas=${vocabulary.routeIds.length} rutas-fuera-de-política=${vocabulary.routeUndeclared.join(",") || "ninguna"} política-ausente-del-catálogo=${vocabulary.policyMissingFromCatalog.join(",") || "ninguna"}`,
    true,
  );
  push(
    "K-04",
    "Catálogo genesis vs política",
    vocabulary.catalogDrift.undeclared.length === 0 ? "pass" : "warn",
    `capacidades adicionales fuera de la allowlist=${vocabulary.catalogDrift.undeclared.join(",") || "ninguna"}`,
  );
  push(
    "K-05",
    "Inventario de skills",
    skills.declared === skills.folders && skills.duplicates.length === 0 ? "pass" : "fail",
    `manifiesto=${skills.declared} carpetas=${skills.folders} registro=${skills.registry} duplicados=${skills.duplicates.length}`,
  );
  push(
    "K-06",
    "Contratos de skill completos",
    skills.placeholderFields === 0 ? "pass" : "warn",
    `${skills.placeholderFields} campos usan «Consultar contrato del skill».`,
  );
  push(
    "K-07",
    "Versión y enlaces canónicos",
    version.versionMatches && version.linksCanonical ? "pass" : "fail",
    `UI=${version.uiVersion ?? "sin versión"} manifiesto=${version.declaredVersion} enlaces=${version.links.length}`,
  );
  push(
    "K-08",
    "Claims sin sobreafirmación",
    claims.overreach.length === 0 ? "pass" : "fail",
    claims.overreach.length === 0
      ? `${claims.summary.total} claims; ${claims.summary.byStatus.verified} verificados; ${claims.summary.byStatus.contradicted} contradichos.`
      : claims.overreach.map((entry) => `${entry.claim.id}: ${entry.claim.status}→${entry.assessment.effectiveStatus}`).join("; "),
    true,
  );
  push(
    "K-09",
    "Cadena del work ledger",
    ledgerCheck.verification.valid ? "pass" : "fail",
    ledgerCheck.verification.valid ? `${ledger.integrity.entries} entradas verificadas.` : ledgerCheck.verification.problems.join(", "),
    true,
  );
  push(
    "K-10",
    "Consistencia del ledger",
    ledgerCheck.findings.some((finding) => finding.code === "window-inconsistent" || finding.code === "hours-not-monotonic")
      ? "fail"
      : "warn",
    ledgerCheck.findings.map((finding) => finding.code).join(", "),
  );
  push(
    "K-11",
    "Scorecard reproducible",
    !score.drift && score.problems.length === 0 ? "pass" : "fail",
    `calculado=${score.scorecard.weightedScore} declarado=${score.declaredScore}`,
  );
  push(
    "K-12",
    "Gobernanza del corpus",
    knowledge.problems.length === 0 ? "pass" : "fail",
    knowledge.problems.length === 0
      ? `${knowledgeDoc.sources.length} fuentes; ${knowledge.excluded.length} excluidas.`
      : knowledge.problems.map((problem) => `${problem.id}:${problem.code}`).join(", "),
    true,
  );
  push(
    "K-13",
    "Licencia única",
    licensing.notice && licensing.fullLicense && licensing.licenseMap ? "pass" : "fail",
    `NOTICE=${licensing.notice} LICENSE=${licensing.fullLicense} MAP=${licensing.licenseMap}`,
  );
  push(
    "K-14",
    "Revisión con autenticación y cuota",
    review.authMiddleware && review.certificationGate && review.quota && review.timeout ? "pass" : "fail",
    `auth=${review.authMiddleware} cert=${review.certificationGate} quota=${review.quota} timeout=${review.timeout}`,
    true,
  );
  push(
    "K-15",
    "Correlación de errores por petición",
    errors.asyncLocalStorage && errors.requestScope ? "pass" : "fail",
    `ALS=${errors.asyncLocalStorage} scope=${errors.requestScope}`,
  );
  push(
    "K-16",
    "Inventario de perfiles GitHub",
    profiles.problems.length === 0 ? "pass" : "fail",
    profiles.problems.length === 0
      ? `${profiles.doc.profiles.length} perfiles; ${profiles.doc.profiles.reduce((total, profile) => total + profile.summary.total, 0)} repos; ${profiles.doc.profiles.reduce((total, profile) => total + profile.summary.forks, 0)} forks; ${profiles.doc.profiles.reduce((total, profile) => total + profile.summary.zeroStarOriginals, 0)} originales con 0 estrellas.`
      : profiles.problems.map((problem) => `${problem.login}:${problem.code}(${problem.detail})`).join("; "),
  );
  push(
    "K-17",
    "Inventario del corpus local",
    corpus.problems.length === 0 ? "pass" : "fail",
    corpus.problems.length === 0
      ? `${corpus.summary.files} archivos; ${corpus.summary.sensitive.withheld} retenidos (P0=${corpus.summary.sensitive.p0}, P1=${corpus.summary.sensitive.p1}); extraídos=${corpus.summary.sensitive.extracted}.`
      : corpus.problems.join("; "),
    true,
  );
  push(
    "K-18",
    "Gobernanza de material sensible",
    sensitive.leaks.length === 0 && sensitive.restrictedExcluded ? "pass" : "fail",
    `${sensitive.scanned} archivos escaneados; ${sensitive.leaks.length} patrones de secreto; restringidos excluidos=${sensitive.restrictedExcluded} (${sensitive.restricted}).${sensitive.leaks.length > 0 ? ` ${sensitive.leaks.map((leak) => `${leak.path}:${leak.line}:${leak.kind}`).join(", ")}` : ""}`,
    true,
  );
  push(
    "K-19",
    "Sello criptográfico del paquete v3",
    v3Seal.ok ? "pass" : "fail",
    v3Seal.detail,
    true,
  );

  return {
    generatedAt: "2026-11-13T00:00:00Z",
    version: GENESIS_VERSION,
    certification,
    vocabulary,
    skills,
    versionCheck: version,
    claims,
    ledger: ledgerCheck,
    score,
    knowledge,
    licensing,
    review,
    errors,
    profiles,
    corpus,
    sensitive,
    seal: v3Seal,
    capabilityAssessments,
    checks,
  };
}

function printAudit(result) {
  const line = (status) => (status === "pass" ? "PASS" : status === "warn" ? "WARN" : "FAIL");
  console.log(`TAMV GENESIS Ω ${result.version} — auditoría ${result.generatedAt}`);
  console.log("");
  for (const check of result.checks) {
    console.log(`${line(check.status).padEnd(4)} ${check.id} ${check.label}`);
    console.log(`     ${check.detail}`);
  }
  console.log("");
  console.log("Capacidades:");
  for (const assessment of result.capabilityAssessments) {
    console.log(
      `  ${assessment.id.padEnd(22)} ${assessment.earned.padEnd(13)} declarado ${assessment.declared.padEnd(13)} ${assessment.runnable ? "runnable" : "blocked"}`,
    );
  }
  console.log("");
  const failures = result.checks.filter((check) => check.status === "fail");
  const blocking = failures.filter((check) => check.blocking);
  console.log(`${failures.length} fallos (${blocking.length} bloqueantes), ${result.checks.filter((check) => check.status === "warn").length} advertencias.`);
  return blocking.length === 0 ? 0 : 1;
}

/* ------------------------------------------------------------------ */
/* bundle                                                              */
/* ------------------------------------------------------------------ */

function buildBundle() {
  const audit = runAudit();
  const bundle = {
    schema: GENESIS_SCHEMA,
    version: GENESIS_VERSION,
    generatedAt: audit.generatedAt,
    identity,
    capabilities: capabilities.map((capability) => ({
      ...capability,
      assessment: audit.capabilityAssessments.find((entry) => entry.id === capability.id),
    })),
    claims: audit.claims.assessments.map(({ claim, assessment }) => ({ ...claim, assessment })),
    claimSummary: audit.claims.summary,
    conflicts: audit.claims.conflicts,
    workLedger: ledger,
    scorecard: audit.score.scorecard,
    knowledge: {
      policy: knowledgeDoc.policy,
      sources: knowledgeDoc.sources,
      excluded: audit.knowledge.excluded.map((source) => source.id),
    },
    profiles: audit.profiles.doc,
    corpus: audit.corpus.summary,
    checks: audit.checks,
    certification: audit.certification,
  };
  const serialized = JSON.stringify(bundle, null, 2);
  const dist = join(PACKAGE_ROOT, "dist");
  mkdirSync(dist, { recursive: true });
  writeFileSync(join(dist, "genesis.json"), serialized, "utf8");

  // Public projection: no file paths, no corpus notes, no restricted metadata.
  const publicBundle = {
    schema: "tamv.genesis.public.v1",
    version: GENESIS_VERSION,
    generatedAt: audit.generatedAt,
    identity: {
      subject: identity.subject,
      canonical: identity.canonical,
    },
    scorecard: audit.score.scorecard,
    claims: audit.claims.assessments.map(({ claim, assessment }) => ({
      id: claim.id,
      statement: claim.statement,
      status: claim.status,
      effectiveStatus: assessment.effectiveStatus,
      confidence: claim.confidence,
      domain: claim.domain,
      owner: claim.owner,
      evidenceCount: assessment.evidenceCount,
      independent: assessment.independent,
      issues: assessment.issues,
      whatWouldChangeIt: claim.whatWouldChangeIt,
    })),
    claimSummary: audit.claims.summary,
    capabilities: capabilities.map((capability) => {
      const assessment = audit.capabilityAssessments.find((entry) => entry.id === capability.id);
      return {
        id: capability.id,
        label: capability.label,
        summary: capability.summary,
        maturity: capability.maturity,
        earnedMaturity: assessment?.earned ?? capability.maturity,
        riskTier: capability.riskTier,
        requiresConsent: capability.requiresConsent,
        runnable: assessment?.runnable ?? false,
        blockedBy: capability.blockedBy,
        nextGate: capability.nextGate,
      };
    }),
    workLedger: {
      subject: ledger.subject,
      claim: ledger.claim,
      provenanceChain: ledger.provenanceChain.map((entry) => ({
        date: entry.date,
        hours: entry.hours,
        statement: entry.statement,
        sourceId: entry.source.id,
        status: entry.status,
      })),
      windows: ledger.windows,
      attestations: ledger.attestations,
      independentHours: ledger.attestations
        .filter((entry) => (entry.tier === "T3" || entry.tier === "T4") && entry.status === "verified")
        .reduce((total, entry) => total + entry.hours, 0),
      integrity: ledger.integrity,
    },
    knowledge: {
      total: knowledgeDoc.sources.length,
      excluded: audit.knowledge.excluded.length,
      sensitive: knowledgeDoc.sources.filter(
        (source) => source.sensitivity === "confidential" || source.sensitivity === "restricted",
      ).length,
      policy: knowledgeDoc.policy,
    },
    profiles: audit.profiles.doc
      ? {
          schema: audit.profiles.doc.schema,
          capturedAt: audit.profiles.doc.capturedAt,
          method: audit.profiles.doc.method,
          policy: audit.profiles.doc.policy,
          profiles: audit.profiles.doc.profiles.map((profile) => {
            const { repos, ...rest } = profile;
            return { ...rest, repoCount: repos.length };
          }),
        }
      : null,
    corpus: audit.corpus.summary,
    certification: audit.certification,
    checks: audit.checks,
  };
  const publicSerialized = JSON.stringify(publicBundle, null, 2);
  writeFileSync(join(dist, "public.json"), publicSerialized, "utf8");

  // Review packet: the artifact an external reviewer can hash-check without
  // trusting this repository. It carries no private evidence, only pointers.
  const packetSerialized = buildReviewPacket(audit);
  writeFileSync(join(dist, "review-packet.json"), packetSerialized, "utf8");

  const manifest = {
    schema: "tamv.genesis.manifest.v1",
    generatedAt: audit.generatedAt,
    files: {
      "genesis.json": "sha256:" + sha256(serialized),
      "public.json": "sha256:" + sha256(publicSerialized),
      "review-packet.json": "sha256:" + sha256(packetSerialized),
    },
  };
  writeFileSync(join(dist, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log(`Bundle escrito en ${join(dist, "genesis.json")}`);
  console.log(`Proyección pública ${join(dist, "public.json")}`);
  console.log(`Paquete de evaluación ${join(dist, "review-packet.json")}`);
  console.log(`SHA-256 ${manifest.files["genesis.json"]}`);
  return bundle;
}

function buildReviewPacket(audit) {
  const artifacts = [
    "LICENSE",
    "NOTICE",
    "LICENSE-MAP.md",
    "README.md",
    "tamv-attribution.json",
    "tamv-attribution.sig",
    "tamv-genesis/data/identity.json",
    "tamv-genesis/data/claims.json",
    "tamv-genesis/data/capabilities.json",
    "tamv-genesis/data/work-ledger.json",
    "tamv-genesis/data/scorecard.json",
    "tamv-genesis/data/knowledge-sources.json",
    "tamv-genesis/data/github-profiles.json",
    "tamv-genesis/data/local-corpus-summary.json",
    "docs/audit/2026-11-13/EXECUTIVE-SUMMARY.md",
    "docs/audit/2026-11-13/FINDINGS.md",
    "docs/audit/2026-11-13/WORK-LEDGER.md",
    "docs/audit/2026-11-13/EVIDENCE-INDEX.md",
    "docs/PROFILES.md",
    "docs/CORPUS-CATALOG.md",
    "docs/PUBLISHING.md",
    "docs/ACADEMIC-EVALUATION.md",
    "docs/SOVEREIGN-V3.md",
    "skills.sh.json",
    "tamv-genesis/v3/pack.json",
    "tamv-genesis/v3/seals/pack-seal.json",
    "tamv-genesis/v3/skills/tamv-creator-os/SKILL.md",
    "tamv-genesis/v3/skills/tamv-audio-intelligence/SKILL.md",
    "tamv-genesis/v3/skills/tamv-growth-engine/SKILL.md",
    "tamv-genesis/v3/skills/tamv-sovereign-platform/SKILL.md",
    "tamv-genesis/src/sovereign/canonical.ts",
    "tamv-genesis/src/sovereign/digest.ts",
    "tamv-genesis/src/sovereign/keys.ts",
    "tamv-genesis/src/sovereign/hybrid.ts",
    "tamv-genesis/src/sovereign/seal.ts",
    "tamv-genesis/scripts/v3-seal.mjs",
    "tamv-genesis/scripts/v3-hybrid.mjs",
    "tamv-genesis/tests/sovereign.test.ts",
  ]
    .map((path) => {
      try {
        const content = readRepo(path);
        return { path, sha256: "sha256:" + sha256(content), bytes: Buffer.byteLength(content, "utf8") };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const independentHours = ledger.attestations
    .filter((entry) => (entry.tier === "T3" || entry.tier === "T4") && entry.status === "verified")
    .reduce((total, entry) => total + entry.hours, 0);

  const packet = {
    schema: "tamv.genesis.review-packet.v1",
    version: GENESIS_VERSION,
    generatedAt: audit.generatedAt,
    purpose:
      "Paquete de evaluación para revisión externa. No es una certificación, un dictamen legal ni una validación académica.",
    subject: { identity: identity.subject, canonical: identity.canonical },
    scorecard: audit.score.scorecard,
    claims: audit.claims.assessments.map(({ claim, assessment }) => ({
      id: claim.id,
      statement: claim.statement,
      status: claim.status,
      effectiveStatus: assessment.effectiveStatus,
      confidence: claim.confidence,
      evidenceCount: assessment.evidenceCount,
      independent: assessment.independent,
      whatWouldChangeIt: claim.whatWouldChangeIt,
    })),
    claimSummary: audit.claims.summary,
    capabilities: audit.capabilityAssessments,
    workLedger: {
      claim: ledger.claim,
      independentHours,
      chainHead: ledger.integrity.chainHead,
      entries: ledger.integrity.entries,
      findings: audit.ledger.findings,
    },
    knowledge: {
      total: knowledgeDoc.sources.length,
      excluded: audit.knowledge.excluded.length,
      policy: knowledgeDoc.policy,
    },
    profiles: audit.profiles.doc
      ? {
          capturedAt: audit.profiles.doc.capturedAt,
          policy: audit.profiles.doc.policy,
          profiles: audit.profiles.doc.profiles.map((profile) => ({
            login: profile.login,
            htmlUrl: profile.htmlUrl,
            summary: profile.summary,
          })),
        }
      : null,
    corpus: audit.corpus.summary,
    certification: audit.certification,
    seal: audit.seal,
    checks: audit.checks,
    reproduction: [
      "node scripts/tamv-certification.mjs --check",
      "node --experimental-strip-types tamv-genesis/cli/sovereign.mjs audit",
      "node --experimental-strip-types tamv-genesis/cli/sovereign.mjs verify",
      "node --experimental-strip-types tamv-genesis/cli/sovereign.mjs report",
      "node --experimental-strip-types tamv-genesis/cli/sovereign.mjs seal",
      "node --experimental-strip-types --test tamv-genesis/tests/*.test.ts",
      "node --experimental-strip-types tamv-genesis/scripts/v3-seal.mjs --verify",
      "npx skills add AnubisVillasenor1/tamv-creator-intelligence --list",
    ],
    artifacts,
    limitations: [
      "El release está sin firma Ed25519; las capacidades certificadas permanecen bloqueadas.",
      "El sello v3 está sin firma (UNSIGNED_RELEASE_PENDING); sin TAMV_V3_PUBLIC_KEY solo se verifica su estructura, no su autoría.",
      "Ningún software distribuido al cliente es 'imposible de piratear': el sello rechaza copias parciales o alteradas, no la copia completa del texto público.",
      "Las 24,000 horas son un claim autobiográfico no verificado, sin atestación independiente.",
      "No existe ledger durable append-only ni RLS multi-tenant implementada.",
      "No hay SBOM, attestation SLSA ni pruebas de carga y failover.",
      "La adopción en skills.sh no constituye validación académica ni revisión por pares.",
      "El marco de evaluación (pesos, tiers y umbrales) lo define el proyecto; la auditoría interna no es independiente ni puede validarse a sí misma.",
      "El corpus externo no se distribuye; se referencia por hash y conserva sus licencias.",
      "El inventario local es un agregado dependiente del árbol del autor; el detalle con rutas queda fuera de Git y no es evidencia portable de terceros.",
      "Los perfiles de GitHub se capturan por API pública: los forks no son autoría y las estrellas no son revisión, adopción ni horas.",
    ],
  };
  return JSON.stringify(packet, null, 2);
}

/* ------------------------------------------------------------------ */
/* main                                                                */
/* ------------------------------------------------------------------ */

const command = process.argv[2] ?? "audit";

if (command === "audit") {
  process.exitCode = printAudit(runAudit());
} else if (command === "verify") {
  const audit = runAudit();
  const { verification } = audit.ledger;
  console.log(`ledger: ${verification.valid ? "válido" : "inválido"} (${verification.actual})`);
  console.log(`manifiesto: ${audit.certification.hashesValid ? "hashes válidos" : "hashes alterados"}`);
  console.log(`firma: ${audit.certification.signatureState}`);
  process.exitCode = verification.valid && audit.certification.hashesValid ? 0 : 1;
} else if (command === "score") {
  console.log(formatScorecard(runAudit().score.scorecard));
} else if (command === "report") {
  const audit = runAudit();
  const lines = [];
  lines.push("# Evidencia generada — TAMV GENESIS Ω");
  lines.push("");
  lines.push(`Generado: ${audit.generatedAt}. No editar a mano: \`node --experimental-strip-types tamv-genesis/cli/sovereign.mjs report\`.`);
  lines.push("");
  lines.push("## Chequeos");
  lines.push("");
  lines.push("| ID | Chequeo | Estado | Detalle |");
  lines.push("|---|---|---|---|");
  for (const check of audit.checks) {
    lines.push(`| ${check.id} | ${check.label} | ${check.status} | ${check.detail.replace(/\|/g, "\\|")} |`);
  }
  lines.push("");
  lines.push("## Claims");
  lines.push("");
  lines.push("| ID | Estado | Efectivo | Evidencias | Independiente | Dominio |");
  lines.push("|---|---|---|---:|---|---|");
  for (const { claim, assessment } of audit.claims.assessments) {
    lines.push(
      `| ${claim.id} | ${claim.status} | ${assessment.effectiveStatus} | ${assessment.evidenceCount} | ${assessment.independent ? "sí" : "no"} | ${claim.domain} |`,
    );
  }
  lines.push("");
  lines.push("## Capacidades");
  lines.push("");
  lines.push("| ID | Declarado | Logrado | Ejecutable | Bloqueos |");
  lines.push("|---|---|---|---|---|");
  for (const assessment of audit.capabilityAssessments) {
    const capability = capabilities.find((entry) => entry.id === assessment.id);
    lines.push(
      `| ${assessment.id} | ${assessment.declared} | ${assessment.earned} | ${assessment.runnable ? "sí" : "no"} | ${(capability?.blockedBy ?? []).join(", ") || "ninguno"} |`,
    );
  }
  lines.push("");
  lines.push("## Perfiles GitHub");
  lines.push("");
  if (audit.profiles.doc) {
    lines.push("| Perfil | Repos | Originales | Forks | Estrellas (orig.) | Originales con 0 estrellas |");
    lines.push("|---|---:|---:|---:|---:|---:|");
    for (const profile of audit.profiles.doc.profiles) {
      const summary = profile.summary;
      lines.push(
        `| ${profile.login} | ${summary.total} | ${summary.originals} | ${summary.forks} | ${summary.originalStars} | ${summary.zeroStarOriginals} |`,
      );
    }
  } else {
    lines.push("Sin inventario de perfiles.");
  }
  lines.push("");
  lines.push("## Corpus local");
  lines.push("");
  if (audit.corpus.summary) {
    const corpus = audit.corpus.summary;
    lines.push("| Métrica | Valor |");
    lines.push("|---|---:|");
    lines.push(`| Archivos | ${corpus.files} |`);
    lines.push(`| Bytes | ${corpus.bytes} |`);
    lines.push(`| Extraídos | ${corpus.content.extracted} |`);
    lines.push(`| Retenidos P0/P1 | ${corpus.sensitive.withheld} |`);
    lines.push(`| Duplicados (grupos) | ${corpus.duplicates.groups} |`);
    lines.push(`| Caracteres extraídos | ${corpus.content.extractedChars} |`);
  } else {
    lines.push("Sin resumen de corpus.");
  }
  lines.push("");
  lines.push(formatScorecard(audit.score.scorecard));
  lines.push("");
  lines.push("## Ledger de trabajo");
  lines.push("");
  lines.push("| Hallazgo | Detalle |");
  lines.push("|---|---|");
  for (const finding of audit.ledger.findings) {
    lines.push(`| ${finding.code} | ${finding.detail.replace(/\|/g, "\\|")} |`);
  }
  const out = join(REPO_ROOT, "docs/audit/2026-11-13/GENERATED.md");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, lines.join("\n") + "\n", "utf8");
  console.log(`Informe escrito en ${out}`);
} else if (command === "corpus") {
  const audit = runAudit();
  const summary = audit.corpus.summary;
  if (!summary) {
    console.error("Sin data/local-corpus-summary.json. Ejecuta tamv-genesis/scripts/corpus-inventory.mjs.");
    process.exitCode = 1;
  } else {
    console.log("Corpus local — agregados (sin rutas)");
    console.log(`  archivos      ${summary.files}`);
    console.log(`  bytes         ${summary.bytes}`);
    console.log(`  extraídos     ${summary.content.extracted} (${summary.content.extractedChars} caracteres)`);
    console.log(`  retenidos     ${summary.sensitive.withheld} (P0=${summary.sensitive.p0}, P1=${summary.sensitive.p1})`);
    console.log(`  duplicados    ${summary.duplicates.groups} grupos / ${summary.duplicates.redundantBytes} bytes`);
    console.log(`  política      ${audit.corpus.problems.length === 0 ? "válida" : audit.corpus.problems.join("; ")}`);
    console.log("  temas         " + Object.entries(summary.topics).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([topic, count]) => `${topic}=${count}`).join(", "));
  }
} else if (command === "profiles") {
  const audit = runAudit();
  if (!audit.profiles.doc) {
    console.error("Sin data/github-profiles.json. Ejecuta tamv-genesis/scripts/profile-inventory.mjs.");
    process.exitCode = 1;
  } else {
    for (const profile of audit.profiles.doc.profiles) {
      const summary = profile.summary;
      console.log(
        `${profile.login}: ${summary.total} repos (${summary.originals} originales, ${summary.forks} forks), ${summary.originalStars} estrellas de originales, ${summary.zeroStarOriginals} con 0 estrellas.`,
      );
    }
    console.log(`Validación: ${audit.profiles.problems.length === 0 ? "consistente" : audit.profiles.problems.map((problem) => problem.code).join(", ")}`);
  }
} else if (command === "seal") {
  const { seal } = runAudit();
  console.log(`skills=${seal.skills} firma=${seal.signature}`);
  console.log(seal.detail);
  if (!seal.ok) process.exitCode = 1;
} else if (command === "build" || command === "packet") {
  const bundle = buildBundle();
  if (command === "packet") {
    console.log("");
    console.log("Paquete de evaluación listo: tamv-genesis/dist/review-packet.json");
    console.log(`${bundle.claims.length} claims, ${bundle.checks.length} chequeos, ${bundle.capabilities.length} capacidades.`);
  }
} else {
  console.error(`Comando desconocido: ${command}. Usa audit, verify, score, report, corpus, profiles, seal, build o packet.`);
  process.exitCode = 2;
}
