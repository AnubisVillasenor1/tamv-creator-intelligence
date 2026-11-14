/**
 * GitHub profile intelligence.
 *
 * Pure normalization and auditing of repository metadata captured from the
 * public GitHub API. It never fetches: the snapshot is an input, so the same
 * code can validate a committed file in CI and a fresh capture locally.
 *
 * The point is not to turn repository counts into prestige. It is to separate
 * authorship from forking, activity from adoption, and declarations from
 * evidence. A fork is not an original work; a star is not a review; a public
 * repository is not an attested hour.
 */

export type ProfileDomain =
  | "restricted-vertical"
  | "bots-scraping"
  | "tamv-isabella"
  | "education-music"
  | "territory-tourism"
  | "web-infrastructure"
  | "other";

export const PROFILE_DOMAINS: readonly ProfileDomain[] = [
  "restricted-vertical",
  "bots-scraping",
  "tamv-isabella",
  "education-music",
  "territory-tourism",
  "web-infrastructure",
  "other",
];

/** The subset of the GitHub repository payload this kernel depends on. */
export interface RawRepo {
  readonly name: string;
  readonly full_name?: string;
  readonly description?: string | null;
  readonly fork?: boolean;
  readonly language?: string | null;
  readonly topics?: readonly string[];
  readonly stargazers_count?: number;
  readonly forks_count?: number;
  readonly license?: { readonly spdx_id?: string | null; readonly name?: string | null } | null;
  readonly created_at?: string;
  readonly pushed_at?: string;
  readonly archived?: boolean;
  readonly homepage?: string | null;
}

export interface RawUser {
  readonly login: string;
  readonly name?: string | null;
  readonly bio?: string | null;
  readonly company?: string | null;
  readonly location?: string | null;
  readonly blog?: string | null;
  readonly html_url?: string;
  readonly public_repos?: number;
  readonly followers?: number;
  readonly following?: number;
  readonly created_at?: string;
}

export interface ProfileRepo {
  readonly name: string;
  readonly fork: boolean;
  readonly description: string;
  readonly language: string | null;
  readonly topics: readonly string[];
  readonly stars: number;
  readonly forks: number;
  readonly license: string | null;
  readonly createdAt: string;
  readonly pushedAt: string;
  readonly archived: boolean;
  readonly homepage: string | null;
  readonly domain: ProfileDomain;
}

export interface ProfileSummary {
  readonly total: number;
  readonly originals: number;
  readonly forks: number;
  readonly stars: number;
  readonly forksReceived: number;
  readonly archived: number;
  readonly withDescription: number;
  readonly zeroStarOriginals: number;
  readonly originalStars: number;
  readonly originalForksReceived: number;
  readonly firstCreated: string | null;
  readonly lastPushed: string | null;
  readonly byDomain: Readonly<Record<ProfileDomain, number>>;
  readonly originalByDomain: Readonly<Record<ProfileDomain, number>>;
  readonly byLanguage: Readonly<Record<string, number>>;
  readonly createdByYear: Readonly<Record<string, number>>;
  readonly licenses: {
    readonly declared: number;
    readonly none: number;
    readonly spdx: Readonly<Record<string, number>>;
  };
}

export interface Profile {
  readonly login: string;
  readonly htmlUrl: string;
  readonly user: {
    readonly name: string;
    readonly bio: string;
    readonly company: string;
    readonly location: string;
    readonly blog: string;
    readonly publicRepos: number | null;
    readonly followers: number;
    readonly following: number;
    readonly createdAt: string;
  };
  readonly capturedAt: string;
  readonly summary: ProfileSummary;
  readonly repos: readonly ProfileRepo[];
}

export interface ProfilesDocument {
  readonly schema: "tamv.profiles.v1";
  readonly capturedAt: string;
  readonly method: string;
  readonly policy: string;
  readonly profiles: readonly Profile[];
}

export interface ProfileProblem {
  readonly login: string;
  readonly code:
    | "schema-mismatch"
    | "bad-capture-date"
    | "future-date"
    | "duplicate-login"
    | "duplicate-repo"
    | "count-mismatch"
    | "public-repos-mismatch"
    | "negative-metric"
    | "bad-date"
    | "empty-description-license";
  readonly detail: string;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const DOMAIN_RULES: ReadonlyArray<{ domain: ProfileDomain; pattern: RegExp }> = [
  {
    domain: "restricted-vertical",
    pattern: /(xclusive|para[ií]so\s*prohibido|onlyfans|adult|er[oó]tic|nsfw|18\+)/,
  },
  {
    domain: "bots-scraping",
    pattern: /(telegram|userbot|scraper|scraping|scrape|\bbot\b|\brat\b|reverse[-_ ]?shell|osint|mass[-_ ]?ban|ban[-_ ]?all)/,
  },
  { domain: "education-music", pattern: /(m[uú]sica|music|curso|course|educaci[oó]n|education|play\s*&?\s*go|play-and-go)/ },
  {
    domain: "territory-tourism",
    pattern: /(real\s*del\s*monte|realmont|turismo|tourism|visitarealdelmonte|hidalgo|pueblo\s*m[aá]gico|\brdm\b)/,
  },
  { domain: "tamv-isabella", pattern: /(tamv|isabella|metaverso|metaverse|anubis|elegancia)/ },
  {
    domain: "web-infrastructure",
    pattern: /(web|sitio|site|portfolio|portafolio|landing|api|template|plantilla|config|dotfiles|\.github|infra|deploy)/,
  },
];

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function clean(value: string | null | undefined, max = 280): string {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function toDate(value: string | undefined): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

/** Stable classification; the first matching rule wins. */
export function domainOf(repo: Pick<ProfileRepo, "name" | "description" | "topics">): ProfileDomain {
  const haystack = normalizeText([repo.name, repo.description, repo.topics.join(" ")].join(" "));
  for (const rule of DOMAIN_RULES) {
    if (rule.pattern.test(haystack)) return rule.domain;
  }
  return "other";
}

export function normalizeRepo(raw: RawRepo): ProfileRepo {
  const base = {
    name: String(raw.name ?? "").trim(),
    fork: raw.fork === true,
    description: clean(raw.description),
    language: clean(raw.language, 40) || null,
    topics: [...new Set((raw.topics ?? []).map((topic) => clean(topic, 40)).filter(Boolean))].sort(),
    stars: Math.max(0, Math.trunc(raw.stargazers_count ?? 0)),
    forks: Math.max(0, Math.trunc(raw.forks_count ?? 0)),
    license:
      raw.license?.spdx_id && raw.license.spdx_id !== "NOASSERTION"
        ? raw.license.spdx_id
        : clean(raw.license?.name, 80) || null,
    createdAt: toDate(raw.created_at),
    pushedAt: toDate(raw.pushed_at),
    archived: raw.archived === true,
    homepage: clean(raw.homepage, 200) || null,
  };
  return { ...base, domain: domainOf(base) };
}

function emptyDomains(): Record<ProfileDomain, number> {
  return {
    "restricted-vertical": 0,
    "bots-scraping": 0,
    "tamv-isabella": 0,
    "education-music": 0,
    "territory-tourism": 0,
    "web-infrastructure": 0,
    other: 0,
  };
}

export function summarizeProfile(repos: readonly ProfileRepo[]): ProfileSummary {
  const byDomain = emptyDomains();
  const originalByDomain = emptyDomains();
  const byLanguage: Record<string, number> = {};
  const createdByYear: Record<string, number> = {};
  const spdx: Record<string, number> = {};
  const seen = new Set<string>();

  let originals = 0;
  let forks = 0;
  let stars = 0;
  let forksReceived = 0;
  let archived = 0;
  let withDescription = 0;
  let zeroStarOriginals = 0;
  let originalStars = 0;
  let originalForksReceived = 0;
  let firstCreated: string | null = null;
  let lastPushed: string | null = null;

  for (const repo of repos) {
    if (seen.has(repo.name)) continue;
    seen.add(repo.name);

    byDomain[repo.domain] += 1;
    stars += repo.stars;
    forksReceived += repo.forks;
    if (repo.archived) archived += 1;
    if (repo.description.length > 0) withDescription += 1;
    if (repo.createdAt && (!firstCreated || repo.createdAt < firstCreated)) firstCreated = repo.createdAt;
    if (repo.pushedAt && (!lastPushed || repo.pushedAt > lastPushed)) lastPushed = repo.pushedAt;

    if (repo.fork) {
      forks += 1;
      continue;
    }

    originals += 1;
    originalByDomain[repo.domain] += 1;
    originalStars += repo.stars;
    originalForksReceived += repo.forks;
    if (repo.stars === 0) zeroStarOriginals += 1;
    byLanguage[repo.language ?? "sin lenguaje"] = (byLanguage[repo.language ?? "sin lenguaje"] ?? 0) + 1;
    if (repo.createdAt) createdByYear[repo.createdAt.slice(0, 4)] = (createdByYear[repo.createdAt.slice(0, 4)] ?? 0) + 1;
    if (repo.license) spdx[repo.license] = (spdx[repo.license] ?? 0) + 1;
  }

  const declared = repos.filter((repo) => !repo.fork && repo.license).length;
  const totalOriginals = repos.filter((repo) => !repo.fork).length;

  return {
    total: seen.size,
    originals,
    forks,
    stars,
    forksReceived,
    archived,
    withDescription,
    zeroStarOriginals,
    originalStars,
    originalForksReceived,
    firstCreated,
    lastPushed,
    byDomain,
    originalByDomain,
    byLanguage,
    createdByYear,
    licenses: {
      declared,
      none: totalOriginals - declared,
      spdx,
    },
  };
}

export function normalizeProfile(input: {
  readonly user: RawUser;
  readonly repos: readonly RawRepo[];
  readonly capturedAt: string;
}): Profile {
  const repos = input.repos.map(normalizeRepo).filter((repo) => repo.name.length > 0);
  return {
    login: input.user.login,
    htmlUrl: input.user.html_url ?? `https://github.com/${input.user.login}`,
    user: {
      name: clean(input.user.name, 120),
      bio: clean(input.user.bio, 400),
      company: clean(input.user.company, 120),
      location: clean(input.user.location, 120),
      blog: clean(input.user.blog, 200),
      publicRepos: typeof input.user.public_repos === "number" ? input.user.public_repos : null,
      followers: Math.max(0, Math.trunc(input.user.followers ?? 0)),
      following: Math.max(0, Math.trunc(input.user.following ?? 0)),
      createdAt: toDate(input.user.created_at),
    },
    capturedAt: input.capturedAt,
    summary: summarizeProfile(repos),
    repos,
  };
}

function isFuture(date: string, now: Date): boolean {
  const parsed = new Date(`${date}T23:59:59Z`);
  return parsed.getTime() > now.getTime() + 86_400_000;
}

export function auditProfile(profile: Profile, now: Date): ProfileProblem[] {
  const problems: ProfileProblem[] = [];
  const push = (code: ProfileProblem["code"], detail: string) =>
    problems.push({ login: profile.login || "(sin login)", code, detail });

  if (!profile.login.trim()) push("count-mismatch", "login vacío");
  if (!DATE.test(profile.capturedAt)) push("bad-capture-date", profile.capturedAt);
  else if (isFuture(profile.capturedAt, now)) push("future-date", profile.capturedAt);

  const names = new Set<string>();
  for (const repo of profile.repos) {
    if (names.has(repo.name)) push("duplicate-repo", repo.name);
    names.add(repo.name);
    if (repo.stars < 0 || repo.forks < 0) push("negative-metric", repo.name);
    if (!DATE.test(repo.createdAt)) push("bad-date", `${repo.name} created_at`);
    if (!DATE.test(repo.pushedAt)) push("bad-date", `${repo.name} pushed_at`);
    if (isFuture(repo.createdAt, now) || isFuture(repo.pushedAt, now)) push("future-date", repo.name);
    if (!repo.fork && repo.description.length === 0 && !repo.license) {
      // Not a defect, but it explains why an "original" can carry no signal.
      continue;
    }
  }

  const recomputed = summarizeProfile(profile.repos);
  if (recomputed.total !== profile.summary.total) push("count-mismatch", `total ${profile.summary.total}≠${recomputed.total}`);
  if (recomputed.originals !== profile.summary.originals) {
    push("count-mismatch", `originals ${profile.summary.originals}≠${recomputed.originals}`);
  }
  if (recomputed.forks !== profile.summary.forks) push("count-mismatch", `forks ${profile.summary.forks}≠${recomputed.forks}`);
  if (recomputed.stars !== profile.summary.stars) push("count-mismatch", `stars ${profile.summary.stars}≠${recomputed.stars}`);
  if (recomputed.zeroStarOriginals !== profile.summary.zeroStarOriginals) {
    push("count-mismatch", `zero-star originals ${profile.summary.zeroStarOriginals}≠${recomputed.zeroStarOriginals}`);
  }
  if (profile.user.publicRepos !== null && profile.user.publicRepos !== profile.repos.length) {
    push("public-repos-mismatch", `${profile.user.publicRepos} declarados vs ${profile.repos.length} capturados`);
  }

  return problems;
}

export function auditProfiles(doc: ProfilesDocument, now: Date): ProfileProblem[] {
  const problems: ProfileProblem[] = [];
  if (doc.schema !== "tamv.profiles.v1") {
    problems.push({ login: "*", code: "schema-mismatch", detail: doc.schema });
  }
  if (!DATE.test(doc.capturedAt)) problems.push({ login: "*", code: "bad-capture-date", detail: doc.capturedAt });
  else if (isFuture(doc.capturedAt, now)) problems.push({ login: "*", code: "future-date", detail: doc.capturedAt });
  if (doc.profiles.length === 0) problems.push({ login: "*", code: "count-mismatch", detail: "sin perfiles" });

  const logins = new Set<string>();
  for (const profile of doc.profiles) {
    if (logins.has(profile.login)) problems.push({ login: profile.login, code: "duplicate-login", detail: profile.login });
    logins.add(profile.login);
    problems.push(...auditProfile(profile, now));
  }
  return problems;
}

function pct(part: number, whole: number): string {
  if (whole === 0) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}

function table(rows: ReadonlyArray<readonly [string, string | number]>): string {
  return rows.map(([label, value]) => `| ${label} | ${value} |`).join("\n");
}

function orderedEntries(record: Readonly<Record<string, number>>): Array<[string, number]> {
  return Object.entries(record).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/**
 * Deterministic Markdown. The generated document is public, so it reports
 * aggregates and the metadata GitHub already shows. It does not reproduce
 * repository contents, including those of forks.
 */
export function renderProfilesMarkdown(doc: ProfilesDocument): string {
  const lines: string[] = [];
  lines.push("# Perfiles públicos — inventario y límites");
  lines.push("");
  lines.push(
    `**Foto:** ${doc.capturedAt}, vía API pública de GitHub. Las cifras cambian; el método no. Generado por \`tamv-genesis/scripts/profile-inventory.mjs\`; no editar a mano.`,
  );
  lines.push("");
  lines.push("Este documento describe lo que los perfiles **muestran**, no lo que prueban. Las fechas de GitHub están en UTC; la fecha de la foto usa el día local del operador.");
  lines.push("");

  lines.push("## Resumen");
  lines.push("");
  lines.push("| Perfil | Repos públicos | Originales | Forks | Estrellas (orig.) | Forks recibidos (orig.) | Originales con 0 estrellas | Primer repo | Último push |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|---|---|");
  for (const profile of doc.profiles) {
    const s = profile.summary;
    lines.push(
      `| [\`${profile.login}\`](${profile.htmlUrl}) | ${s.total} | ${s.originals} | ${s.forks} | ${s.originalStars} | ${s.originalForksReceived} | ${s.zeroStarOriginals} | ${s.firstCreated ?? "—"} | ${s.lastPushed ?? "—"} |`,
    );
  }
  lines.push("");
  lines.push(
    "Los totales incluyen forks. Las métricas de originales los excluyen: un fork no es obra propia y no se presenta como contribución.",
  );
  lines.push("");

  for (const profile of doc.profiles) {
    const s = profile.summary;
    lines.push(`## ${profile.login} — ${s.total} repositorios`);
    lines.push("");
    if (profile.user.name || profile.user.bio) {
      lines.push(`**Perfil:** ${profile.user.name || profile.login}${profile.user.bio ? ` — «${profile.user.bio}»` : ""}`);
      lines.push("");
    }
    const account: Array<[string, string | number]> = [
      ["Creado", profile.user.createdAt || "—"],
      ["Ubicación declarada", profile.user.location || "—"],
      ["Compañía declarada", profile.user.company || "—"],
      ["Sitio declarado", profile.user.blog || "—"],
      ["Seguidores / siguiendo", `${profile.user.followers} / ${profile.user.following}`],
    ];
    lines.push("| Dato | Valor |");
    lines.push("|---|---|");
    lines.push(table(account));
    lines.push("");

    lines.push("### Composición");
    lines.push("");
    lines.push("| Dominio | Repos | Originales |");
    lines.push("|---|---:|---:|");
    for (const domain of PROFILE_DOMAINS) {
      const count = s.byDomain[domain];
      if (count === 0) continue;
      lines.push(`| ${domain} | ${count} | ${s.originalByDomain[domain]} |`);
    }
    lines.push("");

    const languages = orderedEntries(s.byLanguage).slice(0, 8);
    if (languages.length > 0) {
      lines.push("### Lenguajes declarados (originales)");
      lines.push("");
      lines.push("| Lenguaje | Repos |");
      lines.push("|---|---:|");
      for (const [language, count] of languages) lines.push(`| ${language} | ${count} |`);
      lines.push("");
    }

    lines.push("### Señales que importan");
    lines.push("");
    const years = orderedEntries(s.createdByYear);
    const busiest = years[0];
    const bullets = [
      `**${s.zeroStarOriginals} de ${s.originals} originales tienen 0 estrellas** (${pct(s.zeroStarOriginals, s.originals)}). Los originales suman ${s.originalStars} estrellas y ${s.originalForksReceived} forks recibidos; los forks de terceros aportan ${s.stars - s.originalStars} estrellas y ${s.forksReceived - s.originalForksReceived} forks heredados que no son autoría propia.`,
      `**${s.forks} ${s.forks === 1 ? "repositorio es fork" : "repositorios son forks"} de terceros** (${pct(s.forks, s.total)} del total). No se copian, relicencian ni presentan como autoría.`,
      busiest
        ? `**${busiest[1]} de ${s.originals} originales se crearon en ${busiest[0]}**: el volumen está concentrado, no distribuido parejo en el tiempo.`
        : "Sin fechas de creación utilizables.",
      `**Licencia declarada:** ${s.licenses.declared} de ${s.originals} originales (${pct(s.licenses.declared, s.originals)}); ${s.licenses.none} sin licencia.`,
      `**Descripción presente:** ${s.withDescription} de ${s.total} repositorios. Un repositorio sin descripción no explica su propósito.`,
    ];
    for (const bullet of bullets) {
      lines.push(`- ${bullet}`);
    }
    lines.push("");

    const top = [...profile.repos]
      .filter((repo) => !repo.fork)
      .sort((a, b) => b.stars - a.stars || a.name.localeCompare(b.name))
      .slice(0, 5);
    if (top.length > 0) {
      lines.push("### Originales con más estrellas");
      lines.push("");
      lines.push("| Repositorio | Estrellas | Lenguaje | Dominio |");
      lines.push("|---|---:|---|---|");
      for (const repo of top) {
        lines.push(`| \`${repo.name}\` | ${repo.stars} | ${repo.language ?? "—"} | ${repo.domain} |`);
      }
      lines.push("");
    }

    const restricted = profile.repos.filter((repo) => repo.domain === "restricted-vertical");
    if (restricted.length > 0) {
      lines.push(
        `> ${restricted.length} ${restricted.length === 1 ? "repositorio" : "repositorios"} de la vertical restringida se ${restricted.length === 1 ? "inventaría" : "inventarían"} por metadatos, no se ${restricted.length === 1 ? "clona" : "clonan"} y no ${restricted.length === 1 ? "entra" : "entran"} al paquete.`,
      );
      lines.push("");
    }
  }

  lines.push("## Identidad");
  lines.push("");
  lines.push(
    "La identidad está **declarada**, no vinculada criptográficamente: ningún perfil prueba por sí mismo que ambos handles sean la misma persona, aunque el contenido y las bios lo declaren. El registro canónico vive en `tamv-genesis/data/identity.json`.",
  );
  lines.push("");

  lines.push("## Qué no se incluye");
  lines.push("");
  lines.push("- **Vertical restringida** (contenido para adultos): solo se usa como caso de arquitectura de gobernanza, derechos y cumplimiento. No se reproduce contenido ni se clona el repositorio.");
  lines.push("- **Material de recuperación de cuentas**: excluido y marcado P0. Si algún archivo con credenciales estuvo expuesto, debe rotarse; borrarlo después no limpia el historial.");
  lines.push("- **Forks de terceros**: no se copian ni se relicencian. Varios describen scraping, vigilancia o acceso remoto; se registran como forks, no como obra propia.");
  lines.push("- **Contenido de repositorios**: este inventario usa metadatos públicos. No descarga ni publica el código de los repositorios listados.");
  lines.push("");

  lines.push("## Regla de lectura");
  lines.push("");
  lines.push(
    "Un perfil de GitHub es **autopublicado** (tier T1). Sirve para establecer existencia, actividad y líneas de trabajo. No sirve para acreditar horas, adopción, calidad ni validación académica. Cualquier afirmación que cruce esa frontera se marca `unverified` en `tamv-genesis/data/claims.json`.",
  );
  lines.push("");
  lines.push("## Reproducir");
  lines.push("");
  lines.push("```bash");
  lines.push("gh api \"users/OsoPanda1/repos?per_page=100&page=1\" > /tmp/oso1.json");
  lines.push("gh api \"users/OsoPanda1/repos?per_page=100&page=2\" > /tmp/oso2.json");
  lines.push("gh api \"users/AnubisVillasenor1/repos?per_page=100\" > /tmp/anubis.json");
  lines.push("gh api users/OsoPanda1 > /tmp/oso-user.json");
  lines.push("gh api users/AnubisVillasenor1 > /tmp/anubis-user.json");
  lines.push("node --experimental-strip-types tamv-genesis/scripts/profile-inventory.mjs \\");
  lines.push("  --input OsoPanda1=/tmp/oso1.json --input OsoPanda1=/tmp/oso2.json \\");
  lines.push("  --input AnubisVillasenor1=/tmp/anubis.json \\");
  lines.push("  --user OsoPanda1=/tmp/oso-user.json --user AnubisVillasenor1=/tmp/anubis-user.json \\");
  lines.push("  --write");
  lines.push("```");
  lines.push("");
  return lines.join("\n");
}
