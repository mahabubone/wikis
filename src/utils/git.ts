// src/utils/git.ts — contributors per file based on git history
// Used at build time (Node) to show avatar x username per doc.
// Works with base = "/wikis/" and resources/ as source.

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

export interface Contributor {
  name: string;        // git author name (e.g. "mahabubone")
  username: string;    // GitHub login (derived)
  email: string;
  commits: number;     // how many commits tocched the file
  avatar: string;      // https://github.com/<username>.png
  profile: string;     // https://github.com/<username>
}

// Simple cache — 61 files × git log would be okay but caching makes dev faster
const cache = new Map<string, Contributor[]>();

function toUsername(name: string, email: string): string {
  // Prefer the git author name if it looks like a GitHub handle (no spaces, lowercase)
  // For noreply emails like 123+mahabubone@users.noreply.github.com, extract handle.
  const m = email.match(/\+?([^@+]+)@users\.noreply\.github\.com/);
  if (m) return m[1];
  // If name is single token and looks like handle, use it lowercased
  const handle = name.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (handle && handle.length >= 2 && !handle.includes(" ")) return handle;
  return name.toLowerCase().replace(/\s+/g, "-");
}

function avatarUrl(username: string): string {
  // GitHub avatar — works without token, size param optional
  // Using github.com/<user>.png redirects to avatars.githubusercontent.com
  return `https://github.com/${username}.png?size=64`;
}

export function getContributorsForFile(filePath: string): Contributor[] {
  // filePath is like "resources/apis/bruno-api-contract-testing.md" relative to repo root
  // Also accepts absolute path; we resolve relative to cwd (wikis/)
  const cwd = process.cwd(); // wikis/
  let rel = path.isAbsolute(filePath) ? path.relative(cwd, filePath) : filePath;
  let abs = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);

  // Handle README case-insensitive: entry.id is lowercase "readme" but file is "README.md"
  if (!existsSync(abs) && rel.toLowerCase().endsWith("/readme.md")) {
    const altRel = rel.replace(/\/readme\.md$/i, "/README.md");
    const altAbs = path.join(cwd, altRel);
    if (existsSync(altAbs)) {
      rel = altRel;
      abs = altAbs;
    }
  }

  if (cache.has(rel)) return cache.get(rel)!;

  // If file not yet tracked (new, untracked), fallback to current git user + mahabubone
  const tracked = existsSync(abs);
  let raw = "";
  try {
    // Use --follow to track renames, --format with delimiters safe for parsing
    // %an = author name, %ae = author email, %aN = .mailmap name (if available)
    raw = execSync(`git log --follow --format="%an|%ae" -- "${rel}"`, {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 4000,
    });
  } catch {
    raw = "";
  }

  // Fallback: if git log empty (untracked or shallow), try to get last committer for that path via git status?
  // We'll return a single contributor based on current git config user or default mahabubone
  if (!raw.trim()) {
    let fallbackName = "mahabubone";
    let fallbackEmail = "mahabubone@users.noreply.github.com";
    try {
      const name = execSync("git config user.name", { cwd, encoding: "utf-8" }).trim();
      const email = execSync("git config user.email", { cwd, encoding: "utf-8" }).trim();
      if (name) fallbackName = name;
      if (email) fallbackEmail = email;
    } catch {}
    // If file exists untracked, still show fallback as pending contributor
    if (tracked) {
      // check if file is untracked (git ls-files)
      try {
        const ls = execSync(`git ls-files -- "${rel}"`, { cwd, encoding: "utf-8" }).trim();
        if (!ls) {
          // untracked — show fallback with 1 commit (upcoming)
          const username = toUsername(fallbackName, fallbackEmail);
          const contrib: Contributor = {
            name: fallbackName,
            username,
            email: fallbackEmail,
            commits: 1,
            avatar: avatarUrl(username),
            profile: `https://github.com/${username}`,
          };
          cache.set(rel, [contrib]);
          return [contrib];
        }
      } catch {}
      // tracked but no log (shallow clone with depth 1 and file not in last commit) — fallback
      const username = toUsername(fallbackName, fallbackEmail);
      const contrib: Contributor = {
        name: fallbackName,
        username,
        email: fallbackEmail,
        commits: 1,
        avatar: avatarUrl(username),
        profile: `https://github.com/${username}`,
      };
      cache.set(rel, [contrib]);
      return [contrib];
    }
    // truly non-existent file
    cache.set(rel, []);
    return [];
  }

  const lines = raw.trim().split("\n").filter(Boolean);
  const map = new Map<string, Contributor>();
  for (const line of lines) {
    const [name, email] = line.split("|");
    if (!name) continue;
    const username = toUsername(name.trim(), (email ?? "").trim());
    const key = username.toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        name: name.trim(),
        username,
        email: (email ?? "").trim(),
        commits: 1,
        avatar: avatarUrl(username),
        profile: `https://github.com/${username}`,
      });
    } else {
      map.get(key)!.commits += 1;
    }
  }

  // Sort by commits desc, then by name
  const result = [...map.values()].sort((a, b) => b.commits - a.commits || a.username.localeCompare(b.username));
  cache.set(rel, result);
  return result;
}

// For sitemap/breadcrumbs: get first contributor as primary author
export function getPrimaryAuthor(filePath: string): Contributor | null {
  const list = getContributorsForFile(filePath);
  return list[0] ?? null;
}
