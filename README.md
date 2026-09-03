# Wikis by @mahabubone

SEO-first, edge-friendly static wikis site — Astro 7 + Tailwind 4, markdowns in `resources/`, `output: static` for GitHub Pages.

- **Site**: https://mahabubone.github.io/wikis/
- **Repo**: https://github.com/mahabubone/wikis
- **Stack**: TS/Node.js, Astro 7.3.1, Tailwind 4, MDX, sitemap, RSS, 62 pages static
- **Content**: `resources/` is source of truth — `apis/` (Bruno, JWT vs PASETO, NestJS, OpenCollection 48-file spec), plus `agentic-swe`, `databases`, `debugging`, `mobile-apps`, `principles`, `system-design`, `web-apps` (all collapsable catalogs)
- **Dev**: `npm run dev` (dev at `http://localhost:4321/wikis/` since `BASE=/wikis/`), `npm run build` → `dist/` (pure HTML/CSS, ~27KB CSS, 0 JS default)

## GitHub Pages (production — no error-prone builds)

Workflow `.github/workflows/deploy.yml` builds with:

```
SITE=https://mahabubone.github.io/wikis BASE=/wikis/ npm run build
```

Deployed to `gh-pages` via `actions/deploy-pages@v4`. Live check: `curl -I https://mahabubone.github.io/wikis/` → `200`.
Configure `vars.SITE`/`vars.BASE` in repo settings for custom domain; defaults already point to live Pages URL.

## Adding a doc

1. `webfetch` the ref URL (no hallucination)
2. `write` to `resources/apis/<kebab>.md` (standalone top-level) or `resources/<category>/<folder>/README.md` + sections as `folder/*.md` (second-level giant doc group — sidebar renders as collapsable catalog → folder)
3. Keep `*Source: https://...*` + `> blockquote` header
4. `npm run build` (62+ pages) → push `main` → Pages deploys

See `AGENTS.md` for full conventions.
