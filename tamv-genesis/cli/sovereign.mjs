#!/usr/bin/env node
/**
 * TAMV GENESIS Ω — sovereignty console.
 *
 * Commands:
 *   audit    run every check and print a report (exit 1 on failed blocking check)
 *   verify   re-derive the work-ledger chain and manifest hashes
 *   score    print the scorecard computed from the dimensions
 *   build    write dist/genesis.json plus a SHA-256 manifest
 *
 * Usage: node --experimental-strip-types tamv-genesis/cli/sovereign.mjs <command>
 */

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assessCapability,
  assessClaim,
  auditKnowledgeSources,
  auditLedger,
  compileScorecard,
  detectCapabilityDrift,
  findConflicts,
  formatScorecard,
  summarizeClaims,
  verifyLedger,
  GENESIS_SCHEMA,
  GENESIS_VERSION,
} from "../src/index.ts";

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
    "docs/audit/2026-11-13/EXECUTIVE-SUMMARY.md",
    "docs/audit/2026-11-13/FINDINGS.md",
    "docs/audit/2026-11-13/WORK-LEDGER.md",
    "docs/audit/2026-11-13/EVIDENCE-INDEX.md",
    "docs/PROFILES.md",
    "docs/PUBLISHING.md",
    "docs/ACADEMIC-EVALUATION.md",
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
    certification: audit.certification,
    checks: audit.checks,
    reproduction: [
      "node scripts/tamv-certification.mjs --check",
      "node --experimental-strip-types tamv-genesis/cli/sovereign.mjs audit",
      "node --experimental-strip-types tamv-genesis/cli/sovereign.mjs verify",
      "node --experimental-strip-types tamv-genesis/cli/sovereign.mjs report",
      "node --experimental-strip-types --test tamv-genesis/tests/*.test.ts",
      "npx skills add AnubisVillasenor1/tamv-creator-intelligence --list",
    ],
    artifacts,
    limitations: [
      "El release está sin firma Ed25519; las capacidades certificadas permanecen bloqueadas.",
      "Las 24,000 horas son un claim autobiográfico no verificado, sin atestación independiente.",
      "No existe ledger durable append-only ni RLS multi-tenant implementada.",
      "No hay SBOM, attestation SLSA ni pruebas de carga y failover.",
      "La adopción en skills.sh no constituye validación académica ni revisión por pares.",
      "El marco de evaluación (pesos, tiers y umbrales) lo define el proyecto; la auditoría interna no es independiente ni puede validarse a sí misma.",
      "El corpus externo no se distribuye; se referencia por hash y conserva sus licencias.",
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
} else if (command === "build" || command === "packet") {
  const bundle = buildBundle();
  if (command === "packet") {
    console.log("");
    console.log("Paquete de evaluación listo: tamv-genesis/dist/review-packet.json");
    console.log(`${bundle.claims.length} claims, ${bundle.checks.length} chequeos, ${bundle.capabilities.length} capacidades.`);
  }
} else {
  console.error(`Comando desconocido: ${command}. Usa audit, verify, score, report, build o packet.`);
  process.exitCode = 2;
}
