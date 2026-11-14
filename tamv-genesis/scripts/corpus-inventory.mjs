#!/usr/bin/env node
/**
 * Build the local corpus inventory.
 *
 * The detailed inventory (paths + hashes + extracted character counts) stays in
 * tamv-genesis/.corpus/, which is gitignored. Only aggregates are committed:
 *
 *   tamv-genesis/data/local-corpus-summary.json
 *   docs/CORPUS-CATALOG.md
 *
 * Hard rules enforced before any read:
 *   - P0 (credentials, recovery material) and P1 (restricted vertical) files are
 *     hashed as opaque bytes and never decoded.
 *   - Media is hashed and classified, never transcribed.
 *   - Archives are read at the central directory only; their contents are not
 *     extracted into the inventory.
 *
 * Usage:
 *   node --experimental-strip-types tamv-genesis/scripts/corpus-inventory.mjs \
 *     --root .. --date 2026-11-13
 */

import { createHash } from "node:crypto";
import {
  closeSync,
  createReadStream,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { inflateRawSync } from "node:zlib";
import { fileURLToPath } from "node:url";

import {
  countTopics,
  extensionOf,
  isWithheld,
  kindOf,
  licenseOf,
  renderCorpusCatalog,
  sensitivityOf,
  shouldSkip,
  SKIP_DIRECTORIES,
  summarizeCorpus,
  withExtractedChars,
  sensitivePolicyHolds,
} from "../src/corpus.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "..");
const REPO_ROOT = resolve(PACKAGE_ROOT, "..");

const MAX_TEXT_BYTES = 4 * 1024 * 1024;
const MAX_TEXT_CHARS = 2_000_000;
const MAX_PDF_CHARS = 200_000;
const HASH_CONCURRENCY = 8;

const TEXT_EXTS = new Set([
  "md", "markdown", "txt", "csv", "tsv", "json", "jsonl", "yaml", "yml", "xml",
  "html", "htm", "ts", "tsx", "js", "jsx", "mjs", "cjs", "py", "sh", "ps1",
  "css", "scss", "sql", "toml", "ini", "cfg", "conf", "rb", "go", "rs", "java",
  "kt", "swift", "php", "vue", "svelte", "tex",
]);

const OFFICE_EXTS = new Set(["docx", "pptx", "xlsx"]);

function parseArgs(argv) {
  const options = {
    root: dirname(REPO_ROOT),
    label: "corpus local del autor (Downloads)",
    date: localDate(),
    write: true,
    inventory: join(PACKAGE_ROOT, ".corpus", "inventory.json"),
    textIndex: join(PACKAGE_ROOT, ".corpus", "text-index.json"),
    out: join(PACKAGE_ROOT, "data", "local-corpus-summary.json"),
    docs: join(REPO_ROOT, "docs", "CORPUS-CATALOG.md"),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") options.root = resolve(argv[++index]);
    else if (arg === "--label") options.label = argv[++index];
    else if (arg === "--date") options.date = argv[++index];
    else if (arg === "--inventory") options.inventory = resolve(argv[++index]);
    else if (arg === "--text-index") options.textIndex = resolve(argv[++index]);
    else if (arg === "--out") options.out = resolve(argv[++index]);
    else if (arg === "--docs") options.docs = resolve(argv[++index]);
    else if (arg === "--dry-run") options.write = false;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Argumento desconocido: ${arg}`);
  }
  return options;
}

function localDate(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function walk(root) {
  const files = [];
  const excluded = [];
  const visit = (absolute, rel) => {
    for (const item of readdirSync(absolute, { withFileTypes: true })) {
      const nextRel = rel ? join(rel, item.name) : item.name;
      if (item.isDirectory()) {
        if (SKIP_DIRECTORIES.has(item.name)) {
          excluded.push(nextRel);
          continue;
        }
        if (item.isSymbolicLink()) {
          excluded.push(nextRel);
          continue;
        }
        visit(join(absolute, item.name), nextRel);
      } else if (item.isFile()) {
        if (shouldSkip(nextRel)) {
          excluded.push(nextRel);
          continue;
        }
        files.push(nextRel);
      }
    }
  };
  visit(root, "");
  return { files, excluded };
}

function sha256Buffer(buffer) {
  return "sha256:" + createHash("sha256").update(buffer).digest("hex");
}

function hashFile(path) {
  return new Promise((resolvePromise, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolvePromise("sha256:" + hash.digest("hex")));
    stream.on("error", reject);
  });
}

async function hashAll(root, files) {
  const results = new Map();
  let cursor = 0;
  const workers = Array.from({ length: Math.min(HASH_CONCURRENCY, files.length) }, async () => {
    while (cursor < files.length) {
      const index = cursor;
      cursor += 1;
      const rel = files[index];
      results.set(rel, await hashFile(join(root, rel)));
    }
  });
  await Promise.all(workers);
  return results;
}

/* ---------------------------- ZIP reader ---------------------------- */

function findSignatureBackward(buffer, signature) {
  for (let index = buffer.length - 4; index >= 0; index -= 1) {
    if (buffer.readUInt32LE(index) === signature) return index;
  }
  return -1;
}

function readZipDirectory(path) {
  const fd = openSync(path, "r");
  try {
    const size = statSync(path).size;
    const tailLength = Math.min(size, 65_557 + 64);
    const tail = Buffer.alloc(tailLength);
    readSync(fd, tail, 0, tailLength, size - tailLength);
    const eocd = findSignatureBackward(tail, 0x06054b50);
    if (eocd === -1) throw new Error("EOCD no encontrado");

    let count = tail.readUInt16LE(eocd + 10);
    let cdSize = tail.readUInt32LE(eocd + 12);
    let cdOffset = tail.readUInt32LE(eocd + 16);

    if (count === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) {
      const locator = findSignatureBackward(tail, 0x07064b50);
      if (locator !== -1) {
        const z64Offset = Number(tail.readBigUInt64LE(locator + 8));
        const z64 = Buffer.alloc(56);
        readSync(fd, z64, 0, 56, z64Offset);
        if (z64.readUInt32LE(0) === 0x06064b50) {
          count = Number(z64.readBigUInt64LE(32));
          cdSize = Number(z64.readBigUInt64LE(40));
          cdOffset = Number(z64.readBigUInt64LE(48));
        }
      }
    }
    if (cdSize <= 0 || cdSize > 256 * 1024 * 1024) throw new Error("directorio central inválido");

    const cd = Buffer.alloc(cdSize);
    readSync(fd, cd, 0, cdSize, cdOffset);
    const entries = [];
    let offset = 0;
    while (offset + 46 <= cd.length && cd.readUInt32LE(offset) === 0x02014b50) {
      const method = cd.readUInt16LE(offset + 10);
      const compressedSize = cd.readUInt32LE(offset + 20);
      const uncompressedSize = cd.readUInt32LE(offset + 24);
      const nameLength = cd.readUInt16LE(offset + 28);
      const extraLength = cd.readUInt16LE(offset + 30);
      const commentLength = cd.readUInt16LE(offset + 32);
      const localOffset = cd.readUInt32LE(offset + 42);
      const name = cd.toString("utf8", offset + 46, offset + 46 + nameLength);
      if (!name.endsWith("/")) {
        entries.push({ name, method, compressedSize, uncompressedSize, localOffset });
      }
      offset += 46 + nameLength + extraLength + commentLength;
    }
    return { entries, declared: count };
  } finally {
    closeSync(fd);
  }
}

function readZipEntry(path, entry) {
  const fd = openSync(path, "r");
  try {
    const header = Buffer.alloc(30);
    readSync(fd, header, 0, 30, entry.localOffset);
    if (header.readUInt32LE(0) !== 0x04034b50) throw new Error("cabecera local inválida");
    const nameLength = header.readUInt16LE(26);
    const extraLength = header.readUInt16LE(28);
    const dataOffset = entry.localOffset + 30 + nameLength + extraLength;
    const compressed = Buffer.alloc(entry.compressedSize);
    readSync(fd, compressed, 0, compressed.length, dataOffset);
    if (entry.method === 0) return compressed;
    if (entry.method === 8) return inflateRawSync(compressed);
    throw new Error(`método ZIP no soportado: ${entry.method}`);
  } finally {
    closeSync(fd);
  }
}

/* ------------------------- text extraction ------------------------- */

function decodeXml(xml) {
  return xml
    .replace(/<\/(?:w:p|a:p|row)>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractOfficeText(path, ext) {
  const directory = readZipDirectory(path);
  const wanted =
    ext === "docx"
      ? directory.entries.filter((entry) => entry.name === "word/document.xml")
      : ext === "pptx"
        ? directory.entries.filter((entry) => /^ppt\/slides\/slide\d+\.xml$/.test(entry.name))
        : directory.entries.filter(
            (entry) => entry.name === "xl/sharedStrings.xml" || /^xl\/worksheets\/sheet\d+\.xml$/.test(entry.name),
          );
  if (wanted.length === 0) throw new Error("XML de documento no encontrado");
  let text = "";
  for (const entry of wanted.sort((a, b) => a.name.localeCompare(b.name))) {
    text += "\n" + decodeXml(readZipEntry(path, entry).toString("utf8"));
    if (text.length >= MAX_TEXT_CHARS) break;
  }
  return text.slice(0, MAX_TEXT_CHARS);
}

function extractPlainText(path) {
  const size = statSync(path).size;
  if (size > MAX_TEXT_BYTES) throw new Error(`texto demasiado grande (${size} bytes)`);
  return readFileSync(path, "utf8").replace(/^\uFEFF/, "").slice(0, MAX_TEXT_CHARS);
}

function extractPdfs(items) {
  if (items.length === 0) return new Map();
  const script = String.raw`
import json, sys
try:
    from pypdf import PdfReader
except Exception as exc:
    print(json.dumps({"error": "pypdf no disponible: " + str(exc)}))
    sys.exit(0)
items = json.load(sys.stdin)
results = []
for item in items:
    try:
        reader = PdfReader(item["absolute"])
        text = ""
        for page in reader.pages[:200]:
            text += (page.extract_text() or "") + "\n"
            if len(text) >= item["limit"]:
                break
        results.append({"path": item["path"], "text": text[: item["limit"]]})
    except Exception as exc:
        results.append({"path": item["path"], "error": str(exc)[:200]})
print(json.dumps({"results": results}))
`;
  const outcome = spawnSync(process.env.PYTHON ?? "python", ["-c", script], {
    input: JSON.stringify(items),
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    timeout: 10 * 60 * 1000,
  });
  const result = new Map();
  if (outcome.error || outcome.status !== 0) {
    const reason = (outcome.error?.message ?? outcome.stderr ?? "python falló").slice(0, 300);
    console.error(`Extracción PDF falló: ${reason}`);
    for (const item of items) result.set(item.path, { error: reason });
    return result;
  }
  try {
    const parsed = JSON.parse(outcome.stdout.trim());
    if (parsed.error) {
      for (const item of items) result.set(item.path, { error: parsed.error });
    } else {
      for (const entry of parsed.results ?? []) result.set(entry.path, entry);
    }
  } catch (error) {
    for (const item of items) result.set(item.path, { error: `salida inválida: ${String(error).slice(0, 160)}` });
  }
  return result;
}

/* ----------------------------- main ------------------------------- */

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("Uso: corpus-inventory.mjs --root <carpeta> [--date YYYY-MM-DD] [--dry-run]");
    return 0;
  }
  if (!existsSync(options.root)) {
    console.error(`Raíz inexistente: ${options.root}`);
    return 2;
  }

  console.log(`Inventariando ${options.root}`);
  const { files, excluded } = walk(options.root);
  console.log(`${files.length} archivos; ${excluded.length} rutas excluidas.`);

  const hashes = await hashAll(options.root, files);
  console.log("Hashes SHA-256 calculados.");

  const entries = [];
  const textIndex = [];
  const pdfQueue = [];
  const topicTotals = {};
  let extractedChars = 0;

  for (const rel of files.sort((a, b) => a.localeCompare(b))) {
    const absolute = join(options.root, rel);
    const stats = statSync(absolute);
    const base = {
      path: rel,
      sha256: hashes.get(rel),
      bytes: stats.size,
      kind: kindOf(rel),
      ext: extensionOf(rel),
      sensitivity: sensitivityOf(rel),
      license: licenseOf(rel),
    };

    if (isWithheld(base.sensitivity)) {
      entries.push({ ...base, content: "withheld" });
      textIndex.push({ path: rel, content: "withheld", chars: 0 });
      continue;
    }
    if (stats.size === 0) {
      entries.push({ ...base, content: "empty" });
      textIndex.push({ path: rel, content: "empty", chars: 0 });
      continue;
    }
    if (base.kind === "image" || base.kind === "audio" || base.kind === "video") {
      entries.push({ ...base, content: "binary" });
      textIndex.push({ path: rel, content: "binary", chars: 0 });
      continue;
    }
    if (base.kind === "archive") {
      try {
        const directory = readZipDirectory(absolute);
        const archive = {
          entries: directory.entries.length,
          bytes: directory.entries.reduce((total, entry) => total + entry.uncompressedSize, 0),
        };
        entries.push({ ...base, content: "binary", archive });
        textIndex.push({ path: rel, content: "binary", chars: 0, archiveEntries: archive.entries });
      } catch {
        entries.push({ ...base, content: "binary" });
        textIndex.push({ path: rel, content: "binary", chars: 0 });
      }
      continue;
    }
    if (base.ext === "pdf") {
      // Patched after the batch extraction below.
      entries.push({ ...base, content: "failed" });
      textIndex.push({ path: rel, content: "failed", chars: 0 });
      pdfQueue.push({ path: rel, absolute, limit: MAX_PDF_CHARS });
      continue;
    }
    if (OFFICE_EXTS.has(base.ext)) {
      try {
        const text = extractOfficeText(absolute, base.ext);
        extractedChars += text.length;
        addTopics(topicTotals, text);
        entries.push({ ...base, content: text.length > 0 ? "extracted" : "empty" });
        textIndex.push({ path: rel, content: text.length > 0 ? "extracted" : "empty", chars: text.length });
      } catch {
        entries.push({ ...base, content: "failed" });
        textIndex.push({ path: rel, content: "failed", chars: 0 });
      }
      continue;
    }
    if (TEXT_EXTS.has(base.ext)) {
      try {
        const text = extractPlainText(absolute);
        extractedChars += text.length;
        addTopics(topicTotals, text);
        entries.push({ ...base, content: text.length > 0 ? "extracted" : "empty" });
        textIndex.push({ path: rel, content: text.length > 0 ? "extracted" : "empty", chars: text.length });
      } catch {
        entries.push({ ...base, content: "failed" });
        textIndex.push({ path: rel, content: "failed", chars: 0 });
      }
      continue;
    }
    entries.push({ ...base, content: "binary" });
    textIndex.push({ path: rel, content: "binary", chars: 0 });
  }

  if (pdfQueue.length > 0) {
    console.log(`Extrayendo texto de ${pdfQueue.length} PDF(s) con pypdf.`);
    const pdfs = extractPdfs(pdfQueue);
    const byPath = new Map(entries.map((entry, index) => [entry.path, index]));
    for (const item of pdfQueue) {
      const outcome = pdfs.get(item.path) ?? { error: "sin resultado" };
      const index = byPath.get(item.path);
      const entry = entries[index];
      if (outcome.error) {
        entries[index] = { ...entry, content: "failed" };
        textIndex.push({ path: item.path, content: "failed", chars: 0, error: String(outcome.error).slice(0, 300) });
        continue;
      }
      const text = (outcome.text ?? "").slice(0, MAX_PDF_CHARS);
      extractedChars += text.length;
      addTopics(topicTotals, text);
      entries[index] = { ...entry, content: text.length > 0 ? "extracted" : "empty" };
      textIndex.push({ path: item.path, content: text.length > 0 ? "extracted" : "empty", chars: text.length });
    }
  }

  // A PDF placeholder was already pushed to the text index; the later, final
  // result replaces it so path counts and statuses stay exact.
  const finalText = new Map();
  for (const item of textIndex) finalText.set(item.path, item);

  const inventoryBuffer = Buffer.from(JSON.stringify({ schema: "tamv.corpus.inventory.v1", generatedAt: options.date, entries }, null, 2) + "\n", "utf8");
  const textBuffer = Buffer.from(
    JSON.stringify(
      { schema: "tamv.corpus.text-index.v1", generatedAt: options.date, entries: [...finalText.values()].sort((a, b) => a.path.localeCompare(b.path)) },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  const summary = withExtractedChars(
    summarizeCorpus(entries, {
      generatedAt: `${options.date}T00:00:00Z`,
      rootLabel: options.label,
      exclusions: [...SKIP_DIRECTORIES],
      hashes: { inventory: sha256Buffer(inventoryBuffer), textIndex: sha256Buffer(textBuffer) },
    }),
    extractedChars,
    topicTotals,
  );

  if (!sensitivePolicyHolds(summary)) {
    console.error("Política de sensibilidad violada: P0/P1 no puede tener contenido extraído.");
    return 3;
  }
  const counted =
    summary.content.extracted + summary.content.withheld + summary.content.binary + summary.content.failed + summary.content.empty;
  if (counted !== summary.files) {
    console.error(`Conteo de contenido inconsistente: ${counted} ≠ ${summary.files}.`);
    return 3;
  }

  console.log(
    `${summary.files} archivos, ${summary.bytes} bytes, ${summary.content.extracted} extraídos, ${summary.sensitive.withheld} retenidos (P0=${summary.sensitive.p0}, P1=${summary.sensitive.p1}).`,
  );
  console.log(
    `Duplicados: ${summary.duplicates.groups} grupos, ${summary.duplicates.redundantBytes} bytes redundantes.`,
  );

  if (!options.write) {
    console.log("Dry run: no se escribió ningún archivo.");
    return 0;
  }

  mkdirSync(dirname(options.inventory), { recursive: true });
  writeFileSync(options.inventory, inventoryBuffer);
  writeFileSync(options.textIndex, textBuffer);
  mkdirSync(dirname(options.out), { recursive: true });
  writeFileSync(options.out, JSON.stringify(summary, null, 2) + "\n", "utf8");
  mkdirSync(dirname(options.docs), { recursive: true });
  writeFileSync(options.docs, renderCorpusCatalog(summary), "utf8");

  console.log(`Inventario detallado: ${options.inventory}`);
  console.log(`Resumen agregado: ${options.out}`);
  console.log(`Catálogo: ${options.docs}`);
  return 0;
}

function addTopics(totals, text) {
  const counts = countTopics(text);
  for (const [topic, count] of Object.entries(counts)) {
    totals[topic] = (totals[topic] ?? 0) + count;
  }
}

process.exitCode = await main();
