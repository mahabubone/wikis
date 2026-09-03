import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// https://docs.astro.build/en/guides/deploy/github/
// Production GitHub Pages URL — mahabubone/wikis -> https://mahabubone.github.io/wikis/
// Env overrides allow local dev (BASE=/) and custom domain deploys
const SITE = process.env.SITE || "https://mahabubone.github.io/wikis";
const BASE = process.env.BASE || "/wikis/";

// https://astro.build/config
export default defineConfig({
  site: SITE,
  base: BASE,
  output: "static",
  // No adapter — pure static export for GitHub Pages (edge-friendly via CDN)
  // For Cloudflare Workers fallback, add @astrojs/cloudflare adapter with output: 'static' still works
  integrations: [
    mdx(),
    sitemap({
      // canonical sitemap for SEO
      filter: (page) => !page.includes("/404"),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    shikiConfig: {
      theme: "github-dark-dimmed",
      wrap: true,
    },
    remarkPlugins: [],
    rehypePlugins: [],
  },
  // SEO: prefetch for better UX without sacrificing performance
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "viewport",
  },
  // build inline stylesheets for minimal CSS payload
  build: {
    inlineStylesheets: "auto",
  },
  // Asset handling for GitHub Pages
  image: {
    // Sharp for static optimization
    service: { entrypoint: "astro/assets/services/sharp" },
  },
});
