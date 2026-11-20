import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";

const root = process.cwd();
const config = JSON.parse(readFileSync(join(root, "skills.sh.json"), "utf8"));
const publicPack = JSON.parse(readFileSync(join(root, "tamv-genesis/v3/pack.json"), "utf8"));
const internalPack = JSON.parse(readFileSync(join(root, "tamv-pack/pack.json"), "utf8"));

if (!Array.isArray(config.paths) || config.paths.length === 0) {
  throw new Error("skills.sh.json debe declarar al menos una ruta de descubrimiento.");
}

const discovered = new Map();
for (const entry of config.paths) {
  if (typeof entry !== "string" || !entry.startsWith("./") || entry.includes("\\")) {
    throw new Error(`Ruta skills.sh inválida: ${String(entry)}`);
  }

  const container = resolve(root, entry);
  if (container !== root && !container.startsWith(`${root}${sep}`)) {
    throw new Error(`La ruta skills.sh sale del repositorio: ${entry}`);
  }
  for (const child of readdirSync(container, { withFileTypes: true })) {
    if (!child.isDirectory()) continue;
    const skillPath = join(container, child.name, "SKILL.md");
    const content = readFileSync(skillPath, "utf8");
    const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    const name = frontmatter?.[1].match(/^name:\s*([a-z0-9-]+)\s*$/m)?.[1];
    const description = frontmatter?.[1].match(/^description:\s*(.+)\s*$/m)?.[1];
    const license = frontmatter?.[1].match(/^license:\s*(AGPL-3\.0-only)\s*$/m)?.[1];

    if (!statSync(skillPath).isFile() || !frontmatter || name !== child.name || !description || !license) {
      throw new Error(`Contrato skills.sh inválido: ${entry}/${child.name}/SKILL.md`);
    }
    if (discovered.has(name)) throw new Error(`Skill pública duplicada: ${name}`);
    discovered.set(name, skillPath);
  }
}

const publicSkills = publicPack.publicSkills ?? [];
const publicIds = publicSkills.map((skill) => skill.id);
const grouped = (config.groupings ?? []).flatMap((group) => group.skills ?? []);
const missing = publicIds.filter((id) => !discovered.has(id));
const extra = [...discovered.keys()].filter((id) => !publicIds.includes(id));
const duplicateGroups = grouped.filter((id, index) => grouped.indexOf(id) !== index);
const unknownGroups = grouped.filter((id) => !discovered.has(id));
const ungrouped = [...discovered.keys()].filter((id) => !grouped.includes(id));
const internalIds = internalPack.skills ?? [];
const internalOnly = internalIds.filter((id) => !publicIds.includes(id));

if (missing.length || extra.length || duplicateGroups.length || unknownGroups.length || ungrouped.length) {
  throw new Error(JSON.stringify({ missing, extra, duplicateGroups, unknownGroups, ungrouped }, null, 2));
}
if (config.paths.some((entry) => resolve(root, entry) === resolve(root, "tamv-pack/skills"))) {
  throw new Error("Los 41 contratos internos no deben publicarse como skills independientes en skills.sh.");
}

console.log(`skills.sh válido: ${discovered.size} skills públicas verificadas; ${internalOnly.length} contratos internos permanecen dentro del paquete.`);
