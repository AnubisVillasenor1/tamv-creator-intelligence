import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";

export const MAINTAINED_DOCUMENTS = [
  "docs/README.md",
  "docs/ARCHITECTURE-REFERENCE.md",
  "docs/DOCUMENTATION-COVERAGE-MATRIX.md",
  "docs/SECURITY-OPERATIONS-AND-INCIDENT-PLAYBOOK.md",
  "docs/CROSS-REPOSITORY-ADOPTION-REGISTER.md",
  "docs/DEPLOYMENT-ENVIRONMENT-ISOLATION.md",
  "docs/adr/ADR-003-environment-isolation-and-evidence.md",
];

function stripCode(markdown) {
  const tick = String.fromCharCode(96);
  const output = [];
  let fence = null;

  for (const line of markdown.split(/\r?\n/)) {
    const trimmed = line.trimStart();
    const isTickFence = trimmed.startsWith(tick.repeat(3));
    const isTildeFence = trimmed.startsWith("~~~");

    if (!fence && (isTickFence || isTildeFence)) {
      fence = { char: isTickFence ? tick : "~", length: 3 };
      output.push("");
      continue;
    }

    if (fence) {
      const prefix = fence.char.repeat(fence.length);
      if (trimmed.startsWith(prefix) && [...trimmed.slice(0, fence.length)].every((char) => char === fence.char)) {
        fence = null;
      }
      output.push("");
      continue;
    }

    const inlineCodePattern = new RegExp(tick + "{1,}[^\\n]*?" + tick + "{1,}", "g");
    output.push(line.replace(inlineCodePattern, ""));
  }

  return output.join("\n");
}

function headingSlugs(markdown) {
  const tick = String.fromCharCode(96);
  const slugs = new Set();
  const counts = new Map();

  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/);
    if (!heading) continue;

    const label = heading[1]
      .replace(/<[^>]*>/g, "")
      .replace(/!?\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(new RegExp(tick, "g"), "")
      .replace(/[*_~]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    if (!label) continue;
    const count = counts.get(label) ?? 0;
    counts.set(label, count + 1);
    slugs.add(count === 0 ? label : label + "-" + count);
  }

  return slugs;
}

function parseDestination(raw) {
  let value = raw.trim();
  if (value.startsWith("<")) {
    const end = value.indexOf(">");
    if (end > 0) value = value.slice(1, end);
  } else {
    value = value.split(/\s+/)[0] ?? "";
  }
  return value.replace(/\\([()])/g, "$1");
}

export async function validateMarkdownLinks({ root, documents = MAINTAINED_DOCUMENTS }) {
  const rootPath = path.resolve(root);
  const errors = [];

  for (const source of documents) {
    const sourcePath = path.posix.normalize(source.replaceAll("\\", "/"));
    if (sourcePath === ".." || sourcePath.startsWith("../") || path.posix.isAbsolute(sourcePath)) {
      errors.push(source + ": source path escapes repository root");
      continue;
    }

    const absoluteSource = path.resolve(rootPath, sourcePath);
    if (!absoluteSource.startsWith(rootPath + path.sep)) {
      errors.push(source + ": source path escapes repository root");
      continue;
    }

    let markdown;
    try {
      await access(absoluteSource);
      markdown = await readFile(absoluteSource, "utf8");
    } catch {
      errors.push(sourcePath + ": maintained document is missing or unreadable");
      continue;
    }

    const scanText = stripCode(markdown);
    const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/g;
    for (const match of scanText.matchAll(linkPattern)) {
      const destination = parseDestination(match[1]);
      if (!destination) continue;
      if (/^[a-z][a-z0-9+.-]*:/i.test(destination) || destination.startsWith("//")) continue;

      const hashIndex = destination.indexOf("#");
      const queryIndex = destination.indexOf("?");
      const cutPoints = [hashIndex, queryIndex].filter((index) => index >= 0);
      const pathEnd = cutPoints.length ? Math.min(...cutPoints) : destination.length;
      const pathPart = destination.slice(0, pathEnd);
      const anchor = hashIndex >= 0
        ? destination.slice(hashIndex + 1, queryIndex >= 0 && queryIndex > hashIndex ? queryIndex : destination.length)
        : "";

      let target;
      if (!pathPart) {
        target = sourcePath;
      } else if (pathPart.startsWith("/")) {
        target = path.posix.normalize(pathPart.slice(1));
      } else {
        target = path.posix.normalize(path.posix.join(path.posix.dirname(sourcePath), pathPart));
      }

      if (target === ".." || target.startsWith("../") || path.posix.isAbsolute(target)) {
        errors.push(sourcePath + ": relative link escapes repository root: " + destination);
        continue;
      }

      const absoluteTarget = path.resolve(rootPath, target);
      if (!absoluteTarget.startsWith(rootPath + path.sep)) {
        errors.push(sourcePath + ": link escapes repository root: " + destination);
        continue;
      }

      let targetStat;
      try {
        targetStat = await stat(absoluteTarget);
      } catch {
        errors.push(sourcePath + ": broken internal link: " + destination);
        continue;
      }

      if (anchor && targetStat.isFile() && /\.md$/i.test(target)) {
        let targetMarkdown;
        try {
          targetMarkdown = await readFile(absoluteTarget, "utf8");
        } catch {
          errors.push(sourcePath + ": cannot read anchor target: " + destination);
          continue;
        }
        if (!headingSlugs(targetMarkdown).has(decodeURIComponent(anchor).toLowerCase())) {
          errors.push(sourcePath + ": missing Markdown heading anchor: " + destination);
        }
      }
    }
  }

  return errors;
}
