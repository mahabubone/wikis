# AGENTS.md

Hybrid wiki repo: markdowns in `resources/` + Astro 7 + Tailwind 4 static site (GitHub Pages). `resources/` is source of truth for content; `src/` is source of truth for site generation.

## Structure

- `resources/` — **all wiki markdowns live here** (moved from root on 2026-09-04). Do not create markdowns at repo root.
  - `resources/apis/` — API docs. **New docs go at `resources/apis/` root**, not inside `opencollection/`:
    - `modular-monolith-nestjs.md` — PG × Redis × NATS/RabbitMQ
    - `bruno-api-contract-testing.md` — from `blog.usebruno.com/api-contract-testing-with-bruno`
    - `bruno-graphql-testing.md` — from `blog.usebruno.com/how-to-test-graphql-apis-with-bruno-queries-mutations-assertions`
    - `jwt-vs-paseto.md` — from `dev.to/codefalconx/jwt-vs-paseto-a-comprehensive-comparison-4l9c`
    - `opencollection/` — complete spec, **48 files** (README + 46 sections + `vs-openapi.md`). Do not regenerate.
  - `resources/agentic-swe/`, `resources/databases/`, `resources/debugging/`, `resources/mobile-apps/`, `resources/principles/`, `resources/system-design/`, `resources/web-apps/` — empty, kept with `.gitkeep`. Create new docs here as needed.
- `src/` — Astro 7 site (TS, `output: static` for GitHub Pages):
  - `src/content.config.ts` — Content Collections: `glob({ pattern: "**/*.md", base: "./resources" })` + Zod schema (passthrough, no frontmatter required).
  - `src/pages/[...slug].astro` — renders `resources/**/*.md` via `getCollection("wikis")` + `render(entry)` (62 pages).
  - `src/pages/[category]/index.astro` — category indexes for 8 topics.
  - `src/pages/index.astro` — home with category grid + recent.
  - `src/layouts/Layout.astro` — SEO: canonical, OG, twitter, JSON-LD (TechArticle + BreadcrumbList), sitemap, robots.
  - `src/components/` — Header (category nav), Sidebar (grouped by category), Breadcrumbs, TOC.
  - `src/styles/global.css` — `@import "tailwindcss"` + `@theme` + prose-wiki utilities.
  - `src/utils/content.ts` / `seo.ts` — slug, breadcrumbs, readingTime, description, JSON-LD helpers.
- `astro.config.mjs` — `site: process.env.SITE || "https://example.com"`, `base: process.env.BASE || "/"`, `output: "static"`, integrations: `mdx()`, `sitemap()`, `vite: [tailwindcss()]`, `shiki: github-dark-dimmed`, `prefetch: viewport`.
- `public/` — `favicon.svg`, `robots.txt` (sitemap reference).
- `.github/workflows/deploy.yml` — Node 20, `npm ci && npm run build`, `actions/upload-pages-artifact` + `deploy-pages` (GitHub Pages). Configure `vars.SITE` / `vars.BASE` for project pages (`https://<user>.github.io/<repo>/`).
- `package.json` — `astro@7.3.1`, `@astrojs/mdx@8.0.0`, `@astrojs/sitemap@3.7.4`, `@astrojs/rss@4.0.19`, `tailwindcss@4.3.3`, `@tailwindcss/vite@4.3.3`, `typescript@5.7.3`, `node >=20`.
- `README.md` — `# Wikis for devs by @mahabubone` (site title).
- `.gitignore` — `dist/`, `.astro/`, `node_modules/`, `.playwright-mcp/`.
- `.playwright-mcp/` — Playwright MCP artifacts (ignored, not moved to `resources/`).

## Conventions

- **REST-API & GraphQL Testing = Bruno** — all examples/assertions use Bruno (`runtime.assertions` YAML + Chai `test()`), `bru` CLI, `{{var}}` / `bru.getVar`.
- Every doc starts with `*Source: https://...*` + `> blockquote` summary. Preserve this header.
- Filenames: `kebab-case.md` at `resources/apis/` root (e.g., `bruno-graphql-testing.md`). Do not use `bru-no-` typo. Nested `resources/apis/opencollection/*.md` is exception (48-file spec split).
- **Subdirs are second-level groups, not flat root** — `resources/<category>/<file>.md` = top-level doc; `resources/<category>/<folder>/*.md` = second-level under one giant item/doc (e.g., `apis/opencollection/` = giant OpenCollection spec + 46 sections). Sidebar `src/components/Sidebar.astro:1` uses `partitionCategory()` to render root files then `<details>` folders (not flattened). Folders link to `README.md` overview via `folderSlug` + `readme.id`. Do not list subdir files at root.
- `.gitkeep` required in every empty `resources/*/` dir — do not delete (Astro sidebar shows “No docs yet — .gitkeep”).
- **Adding a new doc** (updated path):
  1. `webfetch` (or Playwright if SPA/JS) the `ref` URL — do not hallucinate; use fetched content.
  2. `write` to `resources/apis/<kebab>.md` or appropriate `resources/<area>/`. Read before write if overwriting.
  3. Verify: `ls -lh resources/apis/*.md && wc -l resources/apis/*.md` and `npm run build` (62+ pages).
- **Site generation** — Astro Content Collections reads `resources/**/*.md` via `glob` loader. No frontmatter required; title extracted from first `# H1`, description from first `> blockquote` or paragraph, source from `*Source:` URL. Frontmatter `title/description/source` optional overrides.
- **Edge / SEO** — `output: static` builds to `dist/` (pure HTML/CSS, 0 JS by default, ~27KB CSS). Deploy to GitHub Pages (project or custom domain) — edge delivery via GitHub CDN (Fastly). No Node at runtime. For Cloudflare Workers, add `@astrojs/cloudflare` adapter (`output: static` still works) or `output: server` for SSR.
- **Styling** — Tailwind v4 via `@tailwindcss/vite`. Global prose in `src/styles/global.css` (`.prose-wiki`). Dark mode TBD (prefers-color-scheme placeholder).

## Gotchas

- `resources/apis/opencollection/` was split from a single `README.md` via `re.split(r'^(## .+)$', …, MULTILINE)` — section `## Table of Contents` was skipped. Re-splitting will duplicate 46 files.
- `modular-monolith-nestjs.md` had broken `servers: [...n ...]` line — now fixed. Check `grep -n "n           "`.
- `blog.usebruno.com` pages are JS-rendered — prefer `webfetch` with markdown; fall back to Playwright `page.evaluate(() => document.querySelector('main').innerText)`.
- Not a git repo (`_latest/` has no `.git`); do not run `git` commands (scaffold creates `.github/workflows` but no git init).
- `src/content.config.ts` uses `passthrough()` — unknown frontmatter allowed, but empty frontmatter is fine (no H1 extraction relies on body).
- `astro.config.mjs` `site`/`base` env handling: for project pages set `SITE=https://<user>.github.io/<repo>` and `BASE=/<repo>/` via `vars` in workflow; for custom domain keep defaults.
- Build generates 62 pages (`dist/`). `dist/sitemap-index.xml` + `dist/sitemap-0.xml` + `dist/rss.xml` + `dist/robots.txt` auto-generated.

## References

- No `AGENTS.md`/`CLAUDE.md`/`.cursor`/`opencode.json` existed before this file — this is the first instruction source.
- New: `package.json`, `astro.config.mjs`, `src/`, `.github/workflows/deploy.yml` added 2026-09-04 for TS/Node Astro 7 scaffold. `resources/` holds all prior `apis/` + empty topic dirs (8 dirs, 52 apis pages).
