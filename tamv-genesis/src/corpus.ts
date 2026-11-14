/**
 * Local corpus intelligence.
 *
 * Pure, deterministic classification of a local file tree. It does not read
 * file contents: the caller hashes, extracts and writes. That keeps the same
 * rules testable in Node, in the CLI and in CI.
 *
 * The rules encode one hard requirement: files that may contain credentials or
 * restricted material are classified before anything is opened, and their text
 * is never extracted. A corpus inventory that leaks its own sensitive files is
 * worse than no inventory.
 */

export type CorpusKind =
  | "document"
  | "text"
  | "code"
  | "archive"
  | "image"
  | "audio"
  | "video"
  | "other";

export type CorpusSensitivity = "P0-credential" | "P1-restricted" | "P2-media" | "P3-normal";

export type CorpusContent = "extracted" | "withheld" | "binary" | "failed" | "empty";

export type CorpusLicense = "declared" | "third-party" | "unknown";

export interface CorpusEntry {
  /** Path relative to the scanned root. Never written to the public summary. */
  readonly path: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly kind: CorpusKind;
  readonly ext: string;
  readonly sensitivity: CorpusSensitivity;
  readonly license: CorpusLicense;
  readonly content: CorpusContent;
  readonly archive?: { readonly entries: number; readonly bytes: number };
}

export interface CorpusSummary {
  readonly schema: "tamv.corpus.summary.v1";
  readonly generatedAt: string;
  readonly rootLabel: string;
  readonly files: number;
  readonly bytes: number;
  readonly byKind: Readonly<Record<CorpusKind, number>>;
  readonly bySensitivity: Readonly<Record<CorpusSensitivity, number>>;
  readonly content: {
    readonly extracted: number;
    readonly withheld: number;
    readonly binary: number;
    readonly failed: number;
    readonly empty: number;
    readonly extractedChars: number;
  };
  readonly duplicates: { readonly groups: number; readonly redundantBytes: number };
  readonly sensitive: {
    readonly p0: number;
    readonly p1: number;
    readonly withheld: number;
    readonly extracted: number;
  };
  readonly topics: Readonly<Record<string, number>>;
  readonly exclusions: readonly string[];
  readonly hashes: { readonly inventory: string; readonly textIndex: string };
}

const P0_PATTERNS: readonly RegExp[] = [
  /recuperaci[oó]n/,
  /recovery/,
  /credencial/,
  /credential/,
  /passw(or)?d/,
  /contrase[nñ]a/,
  /\btoken/,
  /\bsecret/,
  /private[-_ ]?key/,
  /id_rsa/,
  /id_ed25519/,
  /\.pem$/,
  /\.key$/,
  /\.p12$/,
  /\.pfx$/,
  /\.keystore$/,
  /\.log$/,
  /^\.env(\.|$)/,
  /^\.npmrc$/,
  /^\.netrc$/,
  /^\.git-credentials$/,
  /^secrets?\.(json|ya?ml|txt)$/,
  /wallet/,
  /seed[-_ ]?phrase/,
  /backup.*codigo/,
];

const P1_PATTERNS: readonly RegExp[] = [
  /xclusive/,
  /para[ií]so\s*prohibido/,
  /adult/,
  /er[oó]tic/,
  /nsfw/,
  /onlyfans/,
  /18\+/,
];

const KIND_BY_EXT: Readonly<Record<string, CorpusKind>> = {
  md: "document",
  markdown: "document",
  pdf: "document",
  doc: "document",
  docx: "document",
  odt: "document",
  ppt: "document",
  pptx: "document",
  rtf: "document",
  txt: "text",
  csv: "text",
  tsv: "text",
  json: "text",
  jsonl: "text",
  yaml: "text",
  yml: "text",
  xml: "text",
  html: "text",
  htm: "text",
  ts: "code",
  tsx: "code",
  js: "code",
  jsx: "code",
  mjs: "code",
  cjs: "code",
  py: "code",
  sh: "code",
  ps1: "code",
  css: "code",
  sql: "code",
  toml: "code",
  zip: "archive",
  gz: "archive",
  tgz: "archive",
  rar: "archive",
  "7z": "archive",
  jpg: "image",
  jpeg: "image",
  png: "image",
  gif: "image",
  webp: "image",
  avif: "image",
  svg: "image",
  bmp: "image",
  heic: "image",
  mp3: "audio",
  wav: "audio",
  m4a: "audio",
  ogg: "audio",
  flac: "audio",
  aac: "audio",
  mp4: "video",
  mov: "video",
  mkv: "video",
  webm: "video",
  avi: "video",
};

const ARCHIVE_NAME = /(^|[-_. ])(main|master|main \(\d+\))([-_. ]|\.zip$)/i;
const DECLARED_LICENSE = /^(license|licence|copying|notice|attribution)(\.[a-z]+)?$/i;

/** Remove diacritics so `Recuperación` and `recuperacion` classify the same. */
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function extensionOf(path: string): string {
  const base = path.split(/[\\/]/).pop() ?? path;
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}

export function kindOf(path: string): CorpusKind {
  return KIND_BY_EXT[extensionOf(path)] ?? "other";
}

/**
 * Sensitivity is decided before hashing or extraction. P0 and P1 are always
 * withheld; media is treated as personal by default because it cannot be
 * reviewed as text.
 */
export function sensitivityOf(path: string): CorpusSensitivity {
  const base = normalizeName(path.split(/[\\/]/).pop() ?? path);
  const full = normalizeName(path);
  if (P0_PATTERNS.some((pattern) => pattern.test(base) || pattern.test(full))) {
    return "P0-credential";
  }
  if (P1_PATTERNS.some((pattern) => pattern.test(full))) return "P1-restricted";
  const kind = kindOf(path);
  if (kind === "image" || kind === "audio" || kind === "video") return "P2-media";
  return "P3-normal";
}

export function licenseOf(path: string): CorpusLicense {
  const base = path.split(/[\\/]/).pop() ?? path;
  if (DECLARED_LICENSE.test(base)) return "declared";
  if (extensionOf(path) === "zip" && ARCHIVE_NAME.test(base)) return "third-party";
  return "unknown";
}

export function isWithheld(sensitivity: CorpusSensitivity): boolean {
  return sensitivity === "P0-credential" || sensitivity === "P1-restricted";
}

/**
 * Directories and OS artifacts that are not corpus: dependencies, build output,
 * VCS internals, package caches and desktop metadata. Skipping them keeps the
 * inventory about authored material instead of vendored megabytes.
 */
export const SKIP_DIRECTORIES: ReadonlySet<string> = new Set([
  ".git",
  ".hg",
  ".svn",
  "node_modules",
  ".venv",
  "venv",
  "env",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  ".ruff_cache",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  ".output",
  ".cache",
  ".turbo",
  ".parcel-cache",
  "coverage",
  "vendor",
  "Pods",
  "target",
  ".corpus",
  "_audit-tci",
]);

export const SKIP_FILES: ReadonlySet<string> = new Set([
  "desktop.ini",
  "thumbs.db",
  ".ds_store",
  "nul",
]);

export function shouldSkip(relativePath: string): boolean {
  const parts = relativePath.split(/[\\/]+/).filter(Boolean);
  if (parts.length === 0) return true;
  const base = parts[parts.length - 1].toLowerCase();
  if (SKIP_FILES.has(base)) return true;
  return parts.slice(0, -1).some((part) => SKIP_DIRECTORIES.has(part));
}

/**
 * Topics are counted, never displayed with source names. They let the summary
 * show what the corpus is about without publishing any document.
 */
export const CORPUS_TOPICS: readonly string[] = [
  "tamv",
  "anubis",
  "isabella",
  "play & go",
  "musicgen",
  "audiocore",
  "supabase",
  "rls",
  "ed25519",
  "orcid",
  "licencia",
  "derechos",
  "privacidad",
  "gobernanza",
  "real del monte",
];

export function countTopics(text: string): Record<string, number> {
  const normalized = normalizeName(text);
  const counts: Record<string, number> = {};
  for (const topic of CORPUS_TOPICS) {
    const needle = normalizeName(topic);
    let index = normalized.indexOf(needle);
    let count = 0;
    while (index !== -1) {
      count += 1;
      index = normalized.indexOf(needle, index + needle.length);
    }
    counts[topic] = count;
  }
  return counts;
}

function emptyKinds(): Record<CorpusKind, number> {
  return {
    document: 0,
    text: 0,
    code: 0,
    archive: 0,
    image: 0,
    audio: 0,
    video: 0,
    other: 0,
  };
}

function emptySensitivity(): Record<CorpusSensitivity, number> {
  return {
    "P0-credential": 0,
    "P1-restricted": 0,
    "P2-media": 0,
    "P3-normal": 0,
  };
}

export function summarizeCorpus(
  entries: readonly CorpusEntry[],
  options: {
    readonly generatedAt: string;
    readonly rootLabel: string;
    readonly exclusions?: readonly string[];
    readonly hashes: { readonly inventory: string; readonly textIndex: string };
  },
): CorpusSummary {
  const byKind = emptyKinds();
  const bySensitivity = emptySensitivity();
  const content = { extracted: 0, withheld: 0, binary: 0, failed: 0, empty: 0, extractedChars: 0 };
  const topicTotals: Record<string, number> = {};
  let bytes = 0;

  const seen = new Map<string, { bytes: number; count: number }>();
  for (const entry of entries) {
    byKind[entry.kind] += 1;
    bySensitivity[entry.sensitivity] += 1;
    bytes += entry.bytes;
    content[entry.content] += 1;
    const group = seen.get(entry.sha256) ?? { bytes: entry.bytes, count: 0 };
    group.count += 1;
    seen.set(entry.sha256, group);
  }

  let groups = 0;
  let redundantBytes = 0;
  for (const group of seen.values()) {
    if (group.count < 2) continue;
    groups += 1;
    redundantBytes += group.bytes * (group.count - 1);
  }

  return {
    schema: "tamv.corpus.summary.v1",
    generatedAt: options.generatedAt,
    rootLabel: options.rootLabel,
    files: entries.length,
    bytes,
    byKind,
    bySensitivity,
    content,
    duplicates: { groups, redundantBytes },
    sensitive: {
      p0: bySensitivity["P0-credential"],
      p1: bySensitivity["P1-restricted"],
      withheld: content.withheld,
      extracted:
        bySensitivity["P0-credential"] + bySensitivity["P1-restricted"] - content.withheld,
    },
    topics: topicTotals,
    exclusions: options.exclusions ?? [],
    hashes: options.hashes,
  };
}

/** Attach extracted character counts so the summary reflects real reading. */
export function withExtractedChars(
  summary: CorpusSummary,
  extractedChars: number,
  topics: Record<string, number>,
): CorpusSummary {
  return { ...summary, content: { ...summary.content, extractedChars }, topics };
}

/**
 * The invariant every inventory must satisfy: no P0/P1 file was opened. The
 * check is deliberately redundant with `content` so a future refactor that
 * marks a sensitive file `extracted` fails loudly.
 */
export function sensitivePolicyHolds(summary: CorpusSummary): boolean {
  return summary.sensitive.extracted === 0 && summary.content.withheld === summary.sensitive.p0 + summary.sensitive.p1;
}

export function renderCorpusCatalog(summary: CorpusSummary): string {
  const rows = (Object.entries(summary.byKind) as Array<[CorpusKind, number]>)
    .filter(([, count]) => count > 0)
    .map(([kind, count]) => `| ${kind} | ${count} |`)
    .join("\n");
  const sensitive = (Object.entries(summary.bySensitivity) as Array<[CorpusSensitivity, number]>)
    .map(([tier, count]) => `| ${tier} | ${count} |`)
    .join("\n");
  const topics = Object.entries(summary.topics)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([topic, count]) => `| ${topic} | ${count} |`)
    .join("\n");

  return `# Catálogo del corpus local

Generado por \`tamv-genesis/scripts/corpus-inventory.mjs\`. No editar a mano.

Este catálogo publica **agregados**: no contiene rutas, nombres de archivo ni
texto extraído. El inventario detallado con hashes queda en
\`tamv-genesis/.corpus/\`, fuera de Git.

| Métrica | Valor |
|---|---:|
| Archivos inventariados | ${summary.files} |
| Bytes totales | ${summary.bytes} |
| Texto extraído (caracteres) | ${summary.content.extractedChars} |
| Duplicados (grupos / bytes redundantes) | ${summary.duplicates.groups} / ${summary.duplicates.redundantBytes} |
| Archivos retenidos (P0/P1) | ${summary.sensitive.withheld} |

## Tipos

| Tipo | Archivos |
|---|---:|
${rows}

## Sensibilidad

| Nivel | Archivos |
|---|---:|
${sensitive}

Los archivos **P0-credential** (recuperación de cuentas, tokens, claves) y
**P1-restricted** se hashean como **bytes opacos**: nunca se decodifican, no se
extrae su texto y no se listan en este catálogo. Un inventario que leyera
credenciales para catalogarlas sería el incidente, no la mitigación.

> El bucket P0/P1 es conservador: incluye logs, plantillas \`.env.example\` y código
> que nombra tokens o credenciales. Un archivo retenido **no implica** que contenga
> una credencial válida; implica que no se decodificó para averiguarlo.

## Temas detectados

| Tema | Menciones |
|---|---:|
${topics}

## Límites

- Los archivos de audio y video **no se transcriben**; solo se hashean y clasifican.
- Los archivos comprimidos se inventarían por número de entradas y tamaño, no por contenido.
- Los duplicados se detectan por SHA-256 exacto: no detectan copias casi idénticas ni cambios de formato.
- Un recuento de menciones no es una revisión de fondo ni una validación de lo que dice el corpus.
- El resumen agregado se puede recomputar, pero depende del árbol local: no es evidencia portable de terceros.

## Reproducir

\`\`\`bash
node --experimental-strip-types tamv-genesis/scripts/corpus-inventory.mjs --root .. --date 2026-11-13
node --experimental-strip-types tamv-genesis/cli/sovereign.mjs corpus
\`\`\`

Hash del inventario local: \`${summary.hashes.inventory}\`
`;
}
