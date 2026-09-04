# Security-Aware React Checklist — XSS, Trusted Types, and Framework Gaps

*Source: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html + TanStack Start CSP companion*
*Author: OWASP Cheat Sheet Series, React Security Notes — 2025*

> Modern frameworks **steer** you secure, but gaps remain: `dangerouslySetInnerHTML`, `javascript:` URLs, template injection, and outdated plugins still XSS. React escapes by default *where it renders* — outside its escape hatches you must **encode closest to where data renders** and **sanitize authored HTML** with DOMPurify, optionally enforced by **Trusted Types** and a nonce CSP (see `secure-frontend-tanstack-react.md`).

---

## Table of Contents

- [Framework protection & where it stops](#framework-protection--where-it-stops)
- [Output encoding closest to render](#output-encoding-closest-to-render)
- [Sanitization for authored HTML](#sanitization-for-authored-html)
- [React-specific checklist](#react-specific-checklist)
- [Trusted Types (Chromium)](#trusted-types-chromium)
- [CSP as defense-in-depth (not primary)](#csp-as-defense-in-depth-not-primary)
- [WAF warning](#waf-warning)
- [Checklist](#checklist)
- [Common mistakes](#common-mistakes)
- [FAQ](#faq)

---

## Framework protection & where it stops

React escapes interpolations (`{user.name}`) in JSX — good. But OWASP lists escape hatches that *bypass* it:

- `dangerouslySetInnerHTML` without sanitizing — the biggest React XSS source
- `javascript:` or `data:` URLs — React won’t block `href="javascript:..."` without validation
- Angular `bypassSecurityTrustAs*`, Lit `unsafeHTML`, Polymer `inner-h-t-m-l` — similar hatches in every framework
- Template injection, outdated plugins

> Rule: **Encode per context** — HTML, attribute, URL, JS, CSS — as late as possible, at the render call.

## Output encoding closest to render

Each variable should be passed through an **output encoding** library appropriate to its sink. Encoding too early (e.g., in a servlet filter/interceptor) fails because the filter can’t know whether that parameter lands in `innerText` vs `onClick="..."` vs `<a href>`.

- **HTML context** (`<div>{value}</div>`) — React does it; in vanilla use OWASP Java Encoder / `he` library
- **Attribute** (`<a title={value}>`) — attribute-encode
- **URL** (`<a href={url}>`) — validate protocol allowlist (`https:`, `mailto:`) before encoding
- **JS** (`<script>var x='{value}'</script>`) — JS-encode; avoid inline scripts where CSP `strict-dynamic` is better

> Perform encoding **as close to where data renders as possible**, not in an interceptor [OWASP].

## Sanitization for authored HTML

When users author HTML (WYSIWYG, Markdown rendered to HTML), **encoding would break functionality**. Use **HTML sanitization** — strip dangerous tags/attrs and return safe HTML.

OWASP recommends **DOMPurify**:

```tsx
import DOMPurify from "dompurify";

function UserBio({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

Without it:
```tsx
// ❌ XSS — unsanitized
<div dangerouslySetInnerHTML={{ __html: userBio }} />

// ✅ Safe — sanitized
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userBio) }} />
```

Sanitize **both** server and client if you hydrate — same config, same allowlist.

## React x TanStack Start — file-by-file sanitization sample

How XSS gaps surface in a real Start + React app (SSR + hydration):

```
src/
├─ routes/post/$postId.tsx   # TanStack file route — loader fetches markdown HTML from DB
├─ components/Markdown.tsx   # React component — renders HTML via dangerouslySetInnerHTML
├─ utils/sanitize.ts         # isomorphic DOMPurify wrapper (server + client same config)
└─ server.ts                 # still sets CSP nonce — sanitization is primary, CSP is layer
```

**1. `utils/sanitize.ts` — isomorphic, same allowlist server & client:**

```ts
// src/utils/sanitize.ts — React x TanStack Start, isomorphic
import DOMPurify from "isomorphic-dompurify"; // works on server (jsdom) + browser

const ALLOWED_TAGS = ["p","a","strong","em","ul","ol","li","h1","h2","h3","code","pre","blockquote"];
const ALLOWED_ATTR = ["href","title"];

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // strip svg/math by default — add only if you need it
    USE_PROFILES: { html: true },
  });
}
```

Why isomorphic? If server sanitizes with `isomorphic-dompurify` but client re-sanitizes with different config (or not at all), hydration can re-inject unsanitized `userBio` from props, reopening XSS.

**2. `components/Markdown.tsx` — React file route vs plain JSX:**

```tsx
// src/components/Markdown.tsx
import { sanitizeHtml } from "~/utils/sanitize";

export function Markdown({ html, isAuthored = true }: { html: string; isAuthored?: boolean }) {
  // Authored HTML (CMS/Markdown): sanitize
  // Framework-escaped text: no sanitize needed — React already escapes {text}
  if (!isAuthored) return <div>{html}</div>; // React escapes
  const clean = sanitizeHtml(html); // primary defense
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

**3. `routes/post/$postId.tsx` — TanStack Start loader + React component:**

```tsx
// src/routes/post/$postId.tsx
import { createFileRoute } from "@tanstack/react-router";
import { sanitizeHtml } from "~/utils/sanitize";
import { Markdown } from "~/components/Markdown";

export const Route = createFileRoute("/post/$postId")({
  loader: async ({ params }) => {
    const post = await db.post.findUnique({ where: { id: params.postId } });
    // Even loader-sanitized, client still sanitizes — defense in depth
    return { post, cleanHtml: sanitizeHtml(post.html) };
  },
  component: PostPage,
});

function PostPage() {
  const { post, cleanHtml } = Route.useLoaderData(); // React hook — already sanitized on server
  const [url, setUrl] = React.useState("");
  return (
    <div>
      <h1>{post.title}</h1> {/* React escapes — safe */}
      <Markdown html={cleanHtml} /> {/* sanitized */}
      {/* URL sink — validate protocol, not just sanitize */}
      <a href={safeHref(url) ?? "#"}>Visit</a>
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" />
    </div>
  );
}

function safeHref(url: string): string | null {
  try {
    const u = new URL(url, window.location.origin);
    if (!["https:", "http:", "mailto:"].includes(u.protocol)) return null;
    return u.toString();
  } catch { return null; }
}
```

TanStack Start renders `PostPage` on server (SSR) → HTML with `cleanHtml` → client hydrates same `cleanHtml` → no mismatch, no second unsanitized render.

**4. Trusted Types policy registration — React entry (Chromium only):**

```ts
// src/main.tsx or src/router.tsx — before React hydrate
if (typeof window !== "undefined" && (window as any).trustedTypes) {
  (window as any).trustedTypes.createPolicy("dompurify", {
    createHTML: (html: string) => sanitizeHtml(html),
  });
}
// With CSP header `require-trusted-types-for 'script'`, any innerHTML assignment
// without policy now throws — OWASP DOM-XSS elimination.
```

## React-specific checklist

- [ ] No `dangerouslySetInnerHTML` without `sanitizeHtml` (search `dangerouslySetInnerHTML` — every path via `Markdown` wrapper)
- [ ] No `javascript:` / `data:` URL assignment without `safeHref` (`new URL()` + allowlist) — React won’t block it
```ts
function safeHref(url: string): string | null {
  try {
    const u = new URL(url, location.origin);
    if (!["https:", "http:", "mailto:"].includes(u.protocol)) return null;
    return u.toString();
  } catch { return null; }
}
<a href={safeHref(userLink) ?? "#"}>…</a>
```
- [ ] No `innerHTML` / `outerHTML` / `document.write` via `ref` — use React state + `Markdown`
- [ ] No `eval` / `new Function` on user data — use `JSON.parse` + Zod `schema.parse()` in loader
- [ ] `sanitizeHtml` is isomorphic — same `ALLOWED_TAGS` server (isomorphic-dompurify via jsdom) and client
- [ ] Escape hatches (`ref.current.innerText = ...`) are *not* XSS-safe for HTML — use `textContent` for text

## Trusted Types (Chromium)

Enable `Content-Security-Policy: require-trusted-types-for 'script'` — Chromium rejects plain string assignments to DOM XSS sinks and forces them through a vetted policy. It **eliminates** entire DOM-XSS classes rather than mitigating [OWASP].

```http
Content-Security-Policy: require-trusted-types-for 'script'; trusted-types dompurify
```

```ts
// policy delegates to sanitizer for legacy paths
if (window.trustedTypes) {
  const policy = trustedTypes.createPolicy("dompurify", {
    createHTML: (html) => DOMPurify.sanitize(html),
  });
  element.innerHTML = policy.createHTML(untrusted);
}
```

Combine with a `default` policy that delegates to DOMPurify for legacy code.

## CSP as defense-in-depth (not primary)

CSP is **allowlist that prevents loading**, but “easy to make mistakes with the implementation so it should not be your primary defense” [OWASP]. Use it **customized per app**, not a one-size enterprise blanket, as defense-in-depth *on top of* encoding/sanitization. See companion doc `secure-frontend-tanstack-react.md` for nonce `strict-dynamic` setup.

**Problems with sole reliance on CSP:**
1. Assumption all browsers support CSP Level 3 — verify `User-Agent`, don’t silently downgrade
2. Universal enterprise CSP breaks legacy apps → waivers → cracks

## WAF warning

> “WAFs are unreliable and new bypass techniques are being discovered regularly… WAFs also miss a class of XSS that operates exclusively client-side. WAFs are not recommended for preventing XSS, especially DOM-Based XSS.” — OWASP

Don’t mask missing encoding with a WAF.

## Checklist

- [ ] Search for `dangerouslySetInnerHTML` — all paths sanitize via DOMPurify
- [ ] `javascript:` / `data:` URLs validated via `new URL()` + allowlist
- [ ] Output encoding library per context (HTML / attr / JS / URL) at render, not in filter
- [ ] Authored HTML uses sanitization, not encoding
- [ ] Consider `require-trusted-types-for 'script'` on Chromium where feasible
- [ ] CSP `strict-dynamic` nonce per request (companion doc) as additional layer
- [ ] No framework plugins outdated; audit `npm audit` / `dependabot`

## Common mistakes

- **Interceptor/Filter encoding** — treats query param as HTML without knowing its sink (JS vs href) → non-contextual and misses headers/path
- **Sanitizer skipped on hydration** — server sanitizes, client re-renders unsanitized from prop
- **Allowing `svg` + `math` in sanitizer without need** — adds XSS surface; keep allowlist minimal

## FAQ

**Is React “XSS-safe” by default?** Mostly — but escape hatches, URL sinks, and `innerHTML` via refs are gaps you must cover with encoding/sanitization + Trusted Types.

**DOMPurify vs CSP — which first?** DOMPurify is **primary** for authored HTML; CSP is **additional**. Neither replaces per-context encoding.

**How to test?** Unit: pass `"><img src=x onerror=alert(1)>` through each render path; e2e: assert no `script` without nonce executes (CSP report-only in dev).

---

## Takeaway

Framework escaping is necessary but not sufficient. Close the gaps that matter in React — sanitize `dangerouslySetInnerHTML` with DOMPurify, validate `javascript:` URLs, encode at the render sink, and optionally enforce `Trusted Types`. Layer a per-request `strict-dynamic` CSP on TanStack Start, but never as the only line of defense.

*Tags: xss, react, dangerouslySetInnerHTML, dompurify, trusted-types, owasp, output-encoding, sanitization, csp, javascript-url*
