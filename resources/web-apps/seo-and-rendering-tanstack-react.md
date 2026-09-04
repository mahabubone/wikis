# SEO & Rendering with TanStack Start & React — SSR, Selective SSR, Streaming

*Source: https://tanstack.com/start/latest/docs/framework/react/guide/seo + https://tanstack.com/start/latest/docs/framework/react/guide/selective-ssr + https://blog.logrocket.com/selective-ssr-tanstack-start/*
*Author: TanStack Start Docs, LogRocket (Amazing Enyichi Agu) — Sep 2025*

> TanStack Start gives you the **building blocks** for technical SEO — not automatic rankings. **SSR by default** ensures crawlers receive fully rendered HTML, **streaming** improves LCP, **selective SSR** (`true` / `data-only` / `false`) lets you dial per-route cost, and `head` management + sitemap + code-splitting make that HTML crawlable. Disable SSR only for non-indexed routes (`/dashboard`), otherwise you pay in indexability.

---

## Table of Contents

- [What crawlers need](#what-crawlers-need)
- [Rendering modes: ssr flag](#rendering-modes-ssr-flag)
- [Selective SSR: true / data-only / false](#selective-ssr-true--data-only--false)
- [Inheritance & restrictiveness](#inheritance--restrictiveness)
- [Streaming vs string rendering](#streaming-vs-string-rendering)
- [Head, meta, sitemap](#head-meta-sitemap)
- [TanStack Start vs Next vs React Router](#tanstack-start-vs-next-vs-react-router)
- [Example: mixed routes app](#example-mixed-routes-app)
- [Checklist](#checklist)
- [Common mistakes](#common-mistakes)
- [FAQ](#faq)

---

## What crawlers need

- **Fully rendered HTML on first response** — crawlers shouldn’t need to execute JS to see content. `fetch` sees HTML, not a loader spinner.
- **Head control** — `<title>`, `meta description`, `og:`, `canonical`, `json-ld` per route
- **Sitemap + crawlable links** — discoverable routes crawled at build
- **Performance** — LCP/CLS via code-splitting, streaming, prefetch

Start enables all four, but *you* choose per route.

## Rendering modes: ssr flag

In TanStack Start, `ssr` controls what happens on the **initial server request**. Default `true`.

```ts
export const Route = createFileRoute('/about')({
  component: AboutPage, // renders on server → HTML sent → hydrates
})
// SSR automatic — crawlers receive <h1>About</h1> in HTML
```

## Selective SSR: true / data-only / false

Three modes per route — static or dynamic function:

| `ssr` | `beforeLoad` + `loader` on server | Component renders on server | Sent to client | Use |
|---|---|---|---|---|
| `true` (default) |  yes |  yes | HTML + serialized loader data | SEO pages, fast first paint |
| `'data-only'` |  yes |  no (fallback `pendingComponent`) | loader data only, component renders on client | Need server data but browser-only component (`localStorage`, canvas) |
| `false` |  no |  no (fallback) | fallback only, loaders run on client | Dashboards, authenticated private pages that mustn’t be indexed |

```ts
// SEO page — keep SSR
export const Route = createFileRoute('/blog/$postId')({
  component: PostPage,
  loader: ({ params }) => fetchPost(params.postId),
})

// Authenticated, not indexed — disable
export const Route = createFileRoute('/dashboard')({
  ssr: false,
  component: DashboardPage,
})

// Needs data but component uses window.localStorage — hybrid
export const Route = createFileRoute('/')({
  ssr: 'data-only',
  loader: () => fetchNotes(), // runs on server, component on client
  component: NotesComponent,
})
```

**Dynamic function** — choose at runtime on the server (stripped from client bundle):

```ts
export const Route = createFileRoute('/docs/$docType/$docId')({
  ssr: ({ params, search }) => {
    if (params.docType === 'sheet') return false;
    if (search.details) return 'data-only';
  },
  loader: () => fetchDoc(),
  component: DocsPage,
})
```

> Disabling SSR for an SEO-candidate page impacts indexability — only set `false` for non-indexed routes [tanstack.com/start/seo].

## Inheritance & restrictiveness

Child routes inherit parent’s `ssr` value, but can only make it **more restrictive** (`true → data-only → false`). Less restrictive override is ignored:

```
root (true)
 ├─ posts (false)         → postId (true treated as false)
 └─ docs (data-only) → details (false) → overrides to false
```

Root’s `ssr: false` still requires a `shellComponent` (the minimal shell that must SSR).

## Streaming vs string rendering

- **String (`renderRouterToString` / `defaultRenderHandler`)** — entire HTML as one string. Simple, best for fully static pages.
- **Stream (`renderRouterToStream` / `defaultStreamHandler`)** — chunks sent as rendered; browser starts parsing earlier; slow third-party data streams after critical paint. Recommended for LCP [tanstack.com/router/ssr].

```ts
import { createRequestHandler, defaultStreamHandler } from '@tanstack/react-router/ssr/server';
import { createRouter } from './router';
export async function render({ request }: { request: Request }) {
  return (await createRequestHandler({ request, createRouter }))(defaultStreamHandler);
}
```

Loader data is serialized and embedded for hydration — no refetch on client.

## Head, meta, sitemap

**Document head** — Full control per route:

```ts
export const Route = createFileRoute('/blog/$postId')({
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData.title },
      { name: 'description', content: loaderData.excerpt },
      { property: 'og:title', content: loaderData.title },
    ],
    links: [{ rel: 'canonical', href: `https://example.com/blog/${loaderData.slug}` }],
    scripts: [{ type: 'application/ld+json', children: JSON.stringify(articleJsonLd) }],
  }),
})
```

**Sitemap** — crawls all discoverable routes at build; use `prerender` for static pages:

```ts
export const Route = createFileRoute('/about')({
  prerender: true, // HTML at build, fastest + crawlable
  component: AboutPage,
})
```

**Performance:** automatic code-splitting per route, prefetch on viewport, `Cache-Control` via `setResponseHeader` (`public, max-age=3600`).

## TanStack Start vs Next vs React Router

| Feature | TanStack Start Selective SSR | Next.js (App Router) | React Router (MHR) |
|---|---|---|---|
| Default SSR | `true` per route | RSC + Server Components, `0` vs `client` boundary | SSR via `defaultRenderHandler` |
| `data-only` | `beforeLoad`/`loader` on server, component on client | No direct equiv — `loader` always pairs with server render | `clientLoader` runs on client, no server render |
| Per-route toggle | `ssr` boolean or function per file route | Segment `dynamic = 'force-static'` / `fetchCache` | `react-router.config.ts` global `ssr` only |

Only TanStack Start has first-class `data-only` for “need server data but browser-only component” without hydration mismatch [logrocket].

## React x TanStack Start — file-by-file rendering sample

**File tree — what React renders where:**

```
src/
├─ router.tsx              # getRouter() + defaultSsr + defaultStreamHandler
├─ start.ts                # createStart + requestMiddleware (CSP)
├─ server.ts               # createStartHandler(defaultStreamHandler)
├─ routes/
│  ├─ __root.tsx           # RootRoute (shellComponent always SSR) + HeadContent
│  ├─ index.tsx            # "/" — ssr:false or data-only if uses window
│  ├─ blog/
│  │  ├─ route.tsx         # /blog — ssr:true (SEO index)
│  │  └─ $postId.tsx       # /blog/$postId — ssr:true + loader + head
│  ├─ dashboard.tsx        # /dashboard — ssr:false (private, noindex)
│  └─ notes.$noteId.tsx    # /notes/$noteId — ssr:false, window.localStorage
└─ components/
   └─ Post.tsx             # React component rendered on server then hydrates
```

**Root — shell always SSR, even if `ssr:false` on component:**

```tsx
// src/routes/__root.tsx — React x TanStack Start file route
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { HeadContent } from "@tanstack/react-start";

export const Route = createRootRoute({
  shellComponent: RootShell, // <html><head><HeadContent/></head><body>{children}</body></html> — must SSR
  component: RootComponent,  // may be ssr:false, but shell still streams
  notFoundComponent: () => <div>404 — not in sitemap</div>,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}</body>
    </html>
  );
}
```

**Blog post — SEO-critical, streamed, head per post (React):**

```tsx
// src/routes/blog/$postId.tsx
import { createFileRoute } from "@tanstack/react-router";
import { Post } from "~/components/Post";

export const Route = createFileRoute("/blog/$postId")({
  // SSR true (default) — crawlers receive <article><h1>...post title...</h1> in HTML
  loader: async ({ params }) => {
    const post = await fetchPost(params.postId); // runs on server (initial) + client (navigations)
    return post;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData.title} — My Blog` },
      { name: "description", content: loaderData.excerpt.slice(0, 155) },
      { property: "og:title", content: loaderData.title },
      { property: "og:image", content: loaderData.cover },
    ],
    links: [{ rel: "canonical", href: `https://example.com/blog/${loaderData.slug}` }],
  }),
  component: PostPage,
});

function PostPage() {
  const post = Route.useLoaderData(); // React hook — data already serialized from SSR, no refetch
  return (
    <article>
      <h1>{post.title}</h1> {/* SSR HTML contains this — crawlers see it */}
      <p>{post.body}</p>
    </article>
  );
}
```

**Dashboard — private, no SSR, React client-only:**

```tsx
// src/routes/dashboard.tsx — never indexed, must not SSR even loader
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Dashboard } from "~/components/Dashboard";

export const Route = createFileRoute("/dashboard")({
  ssr: false, // ← disables beforeLoad + loader on server + component SSR
  beforeLoad: async ({ context }) => {
    // Runs only on client; still guard server functions inside loader/API
    if (!context.user) throw redirect({ to: "/login" });
  },
  component: Dashboard, // React renders only on client; server sends shell + pendingComponent
  pendingComponent: () => <div>Loading dashboard…</div>,
});
```

**Notes — data-only (server data, browser-only React):**

```tsx
// src/routes/notes.$noteId.tsx — needs server notes but component touches window
import { createFileRoute } from "@tanstack/react-router";
import { Editor } from "~/components/Editor";

export const Route = createFileRoute("/notes/$noteId")({
  ssr: "data-only", // loaders on server, component NOT on server — avoids hydration mismatch
  loader: async ({ params }) => {
    if (params.noteId === "new") return { draft: localStorage.getItem("draft") }; // but wait — loader on server can't see localStorage!
    // So data-only still runs loader on server: fetchNotes() from server DB, not localStorage
    // Client component then merges with localStorage inside useEffect:
    return fetchNoteById({ data: params.noteId }); // server DB
  },
  component: Editor, // React: useEffect(() => setDraft(localStorage.getItem(...))) to avoid mismatch
});
```

**React hydration note:** `<Editor>` uses `useEffect` to read `window.localStorage` *after* hydration — no SSR mismatch. If you must read `window` during render, use `data-only` or `false`.

## Example: mixed routes app

```ts
// src/router.tsx
export const getRouter = () => createRouter({
  routeTree,
  defaultPendingComponent: () => <Spinner />,
  defaultSsr: true,
});

// src/routes/blog/$postId.tsx — SEO, streamed
export const Route = createFileRoute('/blog/$postId')({
  loader: ({ params }) => fetchPost(params.postId),
  component: Post, // SSR + streamed
});

// src/routes/dashboard.tsx — private, no SSR, no index
export const Route = createFileRoute('/dashboard')({
  ssr: false,
  beforeLoad: ({ context }) => { if (!context.user) throw redirect({ to: '/login' }); },
  component: Dashboard,
});

// src/routes/notes.$noteId.tsx — data-only (server data, client component uses localStorage)
export const Route = createFileRoute('/notes/$noteId')({
  ssr: false,
  loader: async ({ params }) => {
    if (params.noteId === 'new') return fetchLocalStorage();
    return fetchNoteById({ data: params.noteId });
  },
  component: Editor, // localStorage fallback
});
```

## Checklist

- [ ] `defaultSsr: true` globally; set `ssr: false` only for non-indexed (`/dashboard`, `/app`)
- [ ] Each SEO route has `head()` with `title`/`description`/`canonical`/`og:image` + JSON-LD
- [ ] Prerender static marketing/docs (`prerender: true`) and generate sitemap at build
- [ ] Use `defaultStreamHandler` (streaming) for LCP, not string, on dynamic routes
- [ ] Prefer `'data-only'` over `false` when you need server data but the component touches `window`
- [ ] Respect inheritance restrictiveness — parent `false` → children stay `false`

## Common mistakes

- **Disabling SSR globally** — crawlers see empty shell; keep default `true`, opt-out per private route
- **Using `ssr: false` to “fix” hydration mismatch** — fix the mismatch (`window` guard) or use `data-only`, not blanket SPA mode
- **Forgetting `head` on dynamic routes** — `/blog/$id` without `head` serves same title for all posts → duplicate meta

## FAQ

**Should I prerender or SSR?** Prerender for content that doesn’t change per request (blog, docs) — fastest, crawlable. SSR for per-request data (auth, personalization). Start supports both per route.

**Does `data-only` help SEO?** No — component isn’t in HTML, so crawlers without JS won’t see it. Use it only when the component *must* run on client; prefer `true` for indexed pages.

**Can I change child `ssr` back to `true` if parent is `false`?** No — more restrictive wins. Restructure routes if a child truly needs SSR but parent is SPA.

---

## Takeaway

SEO with TanStack Start is a per-route choice: keep `ssr: true` + streaming + head for crawlable pages, reach for `data-only` when server data meets browser-only components, and `false` only for private SPA routes. Build sitemap/prerender for static, optimize loaders + `Cache-Control` for dynamic, and you get Next-like SEO with finer control.

*Tags: tanstack-start, react, ssr, selective-ssr, streaming, seo, head, sitemap, prerender, hydration*
