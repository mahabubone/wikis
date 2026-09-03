// src/utils/content.ts — helpers for wikis Content Collection
// All markdowns live under resources/<category>/<file>.md
// Collection id = "apis/bruno-api-contract-testing" etc.

export const CATEGORIES = [
  "apis",
  "agentic-swe",
  "databases",
  "debugging",
  "mobile-apps",
  "principles",
  "system-design",
  "web-apps",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<string, string> = {
  apis: "APIs",
  "agentic-swe": "Agentic SWE",
  databases: "Databases",
  debugging: "Debugging",
  "mobile-apps": "Mobile Apps",
  principles: "Principles",
  "system-design": "System Design",
  "web-apps": "Web Apps",
};

export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  apis: "REST, GraphQL, gRPC & collection specs — Bruno, OpenCollection, auth patterns.",
  "agentic-swe": "Agentic software engineering practices & workflows.",
  databases: "Persistence, caching, and data layer deep-dives.",
  debugging: "Debugging strategies, tools & war stories.",
  "mobile-apps": "Cross-platform mobile architecture & performance.",
  principles: "Engineering principles — timeless, language-agnostic.",
  "system-design": "Distributed systems, scalability & tradeoffs.",
  "web-apps": "Frontend, SSR/SSG, performance & SEO.",
};

export function getCategory(slug: string): string {
  return slug.split("/")[0] ?? "apis";
}

export function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

export function humanizeSlug(slug: string): string {
  const last = slug.split("/").pop() ?? slug;
  return last
    .replace(/\.md$/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function getBreadcrumbs(slug: string): { label: string; href: string }[] {
  const parts = slug.split("/");
  const crumbs: { label: string; href: string }[] = [{ label: "Home", href: "/" }];
  let acc = "";
  for (let i = 0; i < parts.length; i++) {
    acc = acc ? `${acc}/${parts[i]}` : parts[i];
    const isLast = i === parts.length - 1;
    if (i === 0) {
      crumbs.push({ label: getCategoryLabel(parts[i]), href: `/${parts[i]}/` });
    } else if (isLast) {
      crumbs.push({ label: humanizeSlug(parts[i]), href: `/${acc}/` });
    } else {
      // opencollection subfolder or nested
      crumbs.push({ label: humanizeSlug(parts[i]), href: `/${acc}/` });
    }
  }
  return crumbs;
}

// Extract first H1 from raw markdown body if frontmatter title missing
export function extractTitle(body: string | undefined, fallbackSlug: string): string {
  if (!body) return humanizeSlug(fallbackSlug);
  const m = body.match(/^#\s+(.+)$/m);
  if (m) return m[1].trim().replace(/\s*#+\s*$/, "").trim();
  return humanizeSlug(fallbackSlug);
}

// Extract *Source: https://...* line
export function extractSource(body: string | undefined): string | undefined {
  if (!body) return undefined;
  const m = body.match(/\*Source:\s*\[?([^\]\*]+)\]?\(?(https?:\/\/[^\s\)]+)?/);
  // fallback: capture URL directly
  const urlMatch = body.match(/https?:\/\/[^\s\)\]\"\'\>]+/);
  if (urlMatch) return urlMatch[0];
  if (m && m[2]) return m[2];
  return undefined;
}

// Rough reading time
export function readingTime(body: string | undefined): string {
  if (!body) return "1 min";
  const words = body.trim().split(/\s+/).length;
  const mins = Math.max(1, Math.round(words / 220));
  return `${mins} min`;
}

// For SEO description: first blockquote or first paragraph after H1
export function extractDescription(body: string | undefined, maxLen = 155): string {
  if (!body) return "Wikis for devs — curated technical notes by @mahabubone.";
  // try blockquote >
  const bq = body.match(/^>\s*(.+)$/m);
  if (bq) return truncate(bq[1].trim(), maxLen);
  // try first paragraph (skip H1, Source, Author)
  const lines = body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && !l.startsWith("*Source") && !l.startsWith("*Author") && !l.startsWith("---") && !l.startsWith(">"));
  if (lines[0]) return truncate(lines[0], maxLen);
  return "Wikis for devs — curated technical notes by @mahabubone.";
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}

// Group entries by category for index & sidebar
export function groupByCategory<T extends { id: string }>(entries: T[]): Record<string, T[]> {
  const map: Record<string, T[]> = {};
  for (const e of entries) {
    const cat = getCategory(e.id);
    if (!map[cat]) map[cat] = [];
    map[cat].push(e);
  }
  // ensure all categories present
  for (const c of CATEGORIES) if (!map[c]) map[c] = [];
  return map;
}

// Partition entries for a single category into root files vs second-level folder groups
// e.g. apis/bruno.md => root, apis/opencollection/api-key.md => folder "opencollection"
export interface FolderGroup<T extends { id: string }> {
  folder: string;
  label: string;
  folderSlug: string; // e.g. "apis/opencollection"
  entries: T[];
  readme?: T; // entry with id ending in /README or /readme — the giant doc landing
}

export function partitionCategory<T extends { id: string }>(entries: T[], category: string): { root: T[]; folders: FolderGroup<T>[] } {
  const root: T[] = [];
  const folderMap = new Map<string, T[]>();

  for (const e of entries) {
    const rel = e.id.slice(category.length + 1); // after "apis/"
    if (!rel || rel.length === 0) continue;
    if (!rel.includes("/")) {
      root.push(e);
    } else {
      const folder = rel.split("/")[0];
      if (!folderMap.has(folder)) folderMap.set(folder, []);
      folderMap.get(folder)!.push(e);
    }
  }

  root.sort((a, b) => a.id.localeCompare(b.id));

  const folders: FolderGroup<T>[] = [];
  for (const [folder, list] of folderMap.entries()) {
    list.sort((a, b) => a.id.localeCompare(b.id));
    // find README as folder landing doc
    const readme = list.find((e) => e.id.toLowerCase().endsWith("/readme"));
    const label = humanizeSlug(folder);
    const folderSlug = `${category}/${folder}`;
    folders.push({ folder, label, folderSlug, entries: list, readme });
  }
  folders.sort((a, b) => a.folder.localeCompare(b.folder));
  return { root, folders };
}
