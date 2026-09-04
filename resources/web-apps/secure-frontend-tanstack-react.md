# Secure Frontend Web Apps with TanStack Start & React — CSP, Headers, Cookies

*Source: https://www.vseventer.com/blog/configuring-content-security-policy-csp-in-tanstack-start + https://github.com/Enalmada/start-secure + https://tanstack.com/start/latest/docs/framework/react/guide/authentication-server-primitives*
*Author: VseVenter, Enalmada/start-secure, TanStack Start — 2025–2026*

> Ship React frontends that are secure by default on TanStack Start: per-request **nonce CSP** via middleware (`script-src 'nonce-*' 'strict-dynamic'`), strict **security headers** (`DENY`, `nosniff`, `HSTS`, `Permissions-Policy`), and **__Host- + HttpOnly + Secure + SameSite=Lax** session cookies. TanStack’s `router.options.ssr.nonce` applies nonces to framework scripts automatically; middleware sets the header and passes the nonce via `getStartContext()`. No `unsafe-inline` for scripts in production, styles stay pragmatic (`unsafe-inline` for hydration).

---

## Table of Contents

- [Threat model in one paragraph](#threat-model-in-one-paragraph)
- [CSP in TanStack Start — native nonce](#csp-in-tanstack-start--native-nonce)
- [Middleware: per-request nonce + header](#middleware-per-request-nonce--header)
- [Router nonce wiring](#router-nonce-wiring)
- [Default security headers](#default-security-headers)
- [Styles: pragmatic trade-off](#styles-pragmatic-trade-off)
- [Request middleware registration](#request-middleware-registration)
- [Dev vs prod](#dev-vs-prod)
- [Secure cookies: __Host- + HttpOnly](#secure-cookies---host---httponly)
- [Checklist](#checklist)
- [Common mistakes](#common-mistakes)
- [FAQ](#faq)

---

## Threat model in one paragraph

Modern React frontends face XSS (injected `<script>`), clickjacking (framed), MIME-sniff, and session hijacking. SPA frameworks stop *most* XSS by escaping, but gaps remain (`dangerouslySetInnerHTML`, `javascript:` URLs, Vite HMR styles). CSP + headers are defense-in-depth: even if a bug injects markup, the browser refuses to execute it without the correct per-request nonce.

## CSP in TanStack Start — native nonce

TanStack Start has **native per-request nonce** support via `router.options.ssr.nonce`. Framework-injected `<script>`/`<style>` tags get `nonce="..."` automatically; you only supply the header.

- **Scripts (strict):** `script-src 'nonce-XXX' 'strict-dynamic'` — unique per request, `strict-dynamic` lets nonce-verified scripts load others; no `self`, `unsafe-inline`, or URL allowlists (ignored).
- **Scripts dev:** add `'unsafe-eval'` to `script-src` only (source maps/devtools), *not* to `script-src-elem` (browser warning).
- **Styles (pragmatic):** `style-src 'self' 'unsafe-inline'` — React hydration and Tailwind inject styles before nonce is available; styles can’t execute code (low XSS risk).
- **Level 3:** base directives auto-copy to `script-src-elem`/`style-src-elem`/`attr`; `unsafe-eval` is *not* copied to `elem`.

> Package [`@enalmada/start-secure`](https://github.com/Enalmada/start-secure) wraps this pattern as type-safe middleware — per-request `crypto.randomBytes(16).toString('base64')`, CSP rule merging, dev HMR handling.

## Middleware: per-request nonce + header

```ts
// src/middleware/csp.ts
import crypto from "node:crypto";
import { createMiddleware } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";

export const cspMiddleware = createMiddleware().server(async ({ next }) => {
  if (getRequest().method !== "GET") return next();
  const nonce = crypto.randomBytes(16).toString("base64");
  const directives = [
    "upgrade-insecure-requests",
    "default-src 'none'",
    "base-uri 'self'",
    "connect-src 'self'",
    "img-src 'self' data:",
    `script-src 'strict-dynamic' 'nonce-${nonce}'`,
    `style-src 'nonce-${nonce}'`, // framework will still allow pragmatic style fallback
    "report-uri https://example.com/api/report-csp",
  ].join("; ");
  const header = import.meta.env.DEV
    ? "Content-Security-Policy-Report-Only"
    : "Content-Security-Policy";
  setResponseHeader(header, directives);
  setResponseHeader("Report-To", `csp-endpoint="https://example.com/api/report-csp"`);
  return next({ context: { nonce } });
});
```

Why per-request? A static nonce is replayable — attacker reuses it. `Report-Only` in dev catches violations without blocking HMR.

## Router nonce wiring

```ts
// src/router.tsx
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export async function getRouter() {
  let nonce: string | undefined;
  if (typeof window === "undefined") {
    const { getStartContext } = await import("@tanstack/start-storage-context");
    nonce = getStartContext()?.contextAfterGlobalMiddlewares?.nonce;
  }
  return createRouter({ routeTree, ssr: { nonce } }); // applies to all framework scripts
}
```

TanStack handles `nonce` on client via meta tag; client-side `nonce` is `undefined` after hydration — that’s expected. Use `getStartContext()` only on server.

## Default security headers

`start-secure` middleware also sets these (no extra code):

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload (prod only)
Permissions-Policy: camera=(), microphone=(), geolocation=(), …
Content-Security-Policy: (from rules + nonce)
```

## Styles: pragmatic trade-off

```
style-src 'self' 'unsafe-inline'
style-src-elem 'self' 'unsafe-inline'
style-src-attr 'unsafe-inline'
```

- Vite HMR and React hydration inject styles dynamically
- CSS-in-JS/Tailwind inject runtime styles
- Styles cannot execute JS — low risk, high breakage if strict — so pragmatic `unsafe-inline` is accepted.

## Request middleware registration

```ts
// src/start.ts
import { createStart } from "@tanstack/react-start";
import { createCspMiddleware } from "@enalmada/start-secure";
import { cspRules } from "./config/cspRules";

export const startInstance = createStart(() => ({
  requestMiddleware: [
    createCspMiddleware({ rules: cspRules, options: { isDev: process.env.NODE_ENV !== "production" } }),
  ],
}));
```

With `start-secure`, csp rules are type-safe `CspRule[]` and merged per-request; dev mode auto-adds `ws:`/`wss:` for HMR.

## Dev vs prod

| Env | Header | Scripts | Styles | HMR |
|---|---|---|---|---|
| **Dev** | `Content-Security-Policy-Report-Only` + `unsafe-eval` in `script-src` | blocked only as report | devtools work | `ws:` allowed |
| **Prod** | `Content-Security-Policy` strict | `'nonce-XXX' 'strict-dynamic'` | pragmatic `unsafe-inline` | no ws |

> In dev, TanStack DevTools (non-Query) will still spam CSP warnings — stripped in prod.

## Secure cookies: __Host- + HttpOnly

Not CSP, but the same middleware layer should enforce session cookie flags (paired doc `auth-principles-tanstack-start`):

```ts
// src/server/session.ts
import { setResponseHeader } from "@tanstack/react-start/server";
export function setSessionCookie(token: string) {
  setResponseHeader("Set-Cookie", [
    `__Host-session=${token}`,
    "HttpOnly",        // JS can't read → XSS can't steal
    "Secure",          // HTTPS only
    "SameSite=Lax",    // CSRF: blocks cross-site POST
    "Path=/",          // required by __Host-
    "Max-Age=604800",
  ].join("; "));
}
```

No `Domain` (binds to exact origin → defeats subdomain takeover), no `localStorage` for tokens.

## React x TanStack Start — file-by-file sample

What changes in a real Start + React app vs plain Vite React? Only 3 files plus route files. Here’s a minimal secure scaffold (pasted from `@enalmada/start-secure` starter, trimmed):

```
my-tanstack-app/
├─ src/
│  ├─ config/cspRules.ts       # type-safe CspRule[] for your origins
│  ├─ middleware/csp.ts        # cspMiddleware (above)
│  ├─ start.ts                # createStart with requestMiddleware
│  ├─ router.tsx              # getRouter() with ssr.nonce
│  ├─ server.ts               # createStartHandler(defaultStreamHandler)
│  ├─ routes/
│  │  ├─ __root.tsx           # RootRoute + head, shellComponent
│  │  ├─ index.tsx            # "/" — public, SSR true
│  │  └─ dashboard.tsx        # "/dashboard" — auth, ssr false
│  └─ components/
│     └─ SecureScript.tsx     # example: nonce meta → <script nonce>
└─ vite.config.ts             # vite + tailwind
```

**1. `config/cspRules.ts` — declared origins (type-safe):**

```ts
// src/config/cspRules.ts
import type { CspRule } from "@enalmada/start-secure";

export const cspRules: CspRule[] = [
  { directive: "connect-src", sources: ["https://api.myapp.com", "https://sentry.myapp.com"] },
  { directive: "img-src", sources: ["https://cdn.myapp.com"] },
  // script-src/style-src are handled by middleware defaults + nonce — no need to list self
];
```

Add Sentry, PostHog, Google Auth origins here — merged per-request, de-duplicated, then combined with `nonce-XXX`.

**2. `routes/__root.tsx` — shell + head (React):**

```tsx
// src/routes/__root.tsx — React x TanStack Start root file route
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { HeadContent } from "@tanstack/react-start";

export const Route = createRootRoute({
  shellComponent: RootShell, // always SSR — even if ssr:false on component
  component: RootComponent,
  notFoundComponent: () => <div>404 — page not found</div>,
  errorComponent: ({ error }) => <div>Error: {String(error)}</div>,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent /> {/* meta tags from route head() hoisted here, nonce applied */}
      </head>
      <body>{children}</body>
    </html>
  );
}
function RootComponent() {
  return (
    <div>
      <nav><a href="/">Home</a> · <a href="/dashboard">Dashboard</a></nav>
      <Outlet /> {/* TanStack file-router outlet — React renders here */}
    </div>
  );
}
```

**3. React component that needs a manual nonce — third-party `<script>` in JSX:**

```tsx
// src/components/SecureScript.tsx
import { useRouterState } from "@tanstack/react-router";

export function SecureScript({ src }: { src: string }) {
  // TanStack injects nonce via meta tag on client; on server get it from router state
  const nonce = useRouterState({ select: (s) => (s as any).nonce }) as string | undefined;
  // On server the nonce value is "abc123…", on client meta tag handles it automatically
  return <script src={src} nonce={nonce} async />;
}
// Usage in a route: <SecureScript src="https://cdn.myapp.com/analytics.js" />
// Because header contains `nonce-abc123` + `strict-dynamic`, this trusted script may
// load dependencies without further allowlists — strict-dynamic delegates trust.
```

**4. API / Server Function — secure cookie set (React Server Function, not API route):**

```tsx
// src/routes/api/notes.ts — alternative is createServerFn, but server route example:
import { createServerFileRoute } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

export const ServerRoute = createServerFileRoute("/api/notes").methods({
  GET: async ({ request }) => {
    // authorize inside handler — not in beforeLoad
    const session = await getSession(request);
    if (!session) return new Response("Unauthorized", { status: 401 });
    return Response.json(await db.query("SELECT ..."));
  },
});
```

All three places share the same `requestMiddleware` chain — headers + `Set-Cookie` in one hop.

## Checklist

- [ ] Per-request `crypto.randomBytes(16).toString('base64')` nonce via `createMiddleware().server`
- [ ] `script-src 'nonce-*' 'strict-dynamic'` (prod) / + `'unsafe-eval'` only on `script-src` in dev
- [ ] `router = createRouter({ ssr: { nonce } })` via `getStartContext()` server-only
- [ ] `createStart({ requestMiddleware: [createCspMiddleware(...)] })` registered
- [ ] Styles stay `unsafe-inline` pragmatic; no script `unsafe-inline` in prod
- [ ] `__Host-` session cookie (`HttpOnly` `Secure` `SameSite=Lax` `Path=/`)
- [ ] CSP violations reported (console or Report-URI) — not silent
- [ ] React: no `localStorage` for tokens; `SecureScript` uses `nonce` prop, not inline `onClick="..."` strings

## Common mistakes

- **Static nonce at startup** — headers generated once → replayable, breaks prerender (nonces must be per-request; no `prerender` with nonces)
- **AsyncLocalStorage wrapper** — isomorphic wrapper breaks context chain; use direct `getStartContext()` as above (old handler wrapper is deprecated)
- **Trying to read nonce client-side** — after hydration it’s `undefined` by design; use meta tag or avoid
- **Forgetting `SAME` vs `Origin` full URL** — CSRF Origin check must compare full origin (`new URL(origin).origin`)

## FAQ

**Can I prerender with nonces?** No — nonces are per-request, so caching/prerendering is disabled for nonce routes. Use `prerender: false` for those.

**Why still `unsafe-inline` for styles?** React hydration injects styles before nonce is available; removing it breaks HMR and Tailwind in dev. Styles alone don’t execute code, so trade-off is accepted.

**Do I need `@enalmada/start-secure`?** No — the 20-line manual middleware above works. The package just adds rule merging, type safety, and dev HMR handling.

---

## Takeaway

Secure frontends on TanStack Start are 20 lines: per-request nonce middleware → `Content-Security-Policy` with `strict-dynamic` → `ssr.nonce` on the router → pragmatic styles + strict headers + `__Host-` cookies. No `unsafe-inline` for scripts in production, and every framework script is bound to a one-time token.

*Tags: csp, nonce, strict-dynamic, tanstack-start, react, security-headers, hsts, x-frame, httponly, sameSite, __Host-, middleware*
