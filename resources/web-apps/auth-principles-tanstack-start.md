# Auth Principles with TanStack Start — HttpOnly Sessions, CSRF, OAuth PKCE

*Source: https://tanstack.com/start/latest/docs/framework/react/guide/authentication + https://tanstack.com/start/latest/docs/framework/react/guide/authentication-server-primitives + https://tanstack.com/start/latest/docs/framework/react/guide/authentication-overview*
*Author: TanStack Start Docs — 2025–2026*

> **Protect the data/API boundary first.** Every server function / route that reads or mutates private data must *authorize itself*. `beforeLoad` is UX (keeps users out of screens they can’t use, avoids wasted `loader` work) — not a security boundary. Use **HttpOnly + Secure + SameSite + __Host-** session cookies, **Origin**-checked non-GET RPCs, **OAuth state + PKCE**, and **rate limiting**. Sessions via `createSession` / `getRequestHeader` / `setResponseHeader`, never `localStorage`.

---

## Table of Contents

- [Boundary rule](#boundary-rule)
- [Sessions: HttpOnly vs localStorage](#sessions-httponly-vs-localstorage)
- [Cookie flags matter](#cookie-flags-matter)
- [Server session primitives](#server-session-primitives)
- [Route protection with beforeLoad (UX)](#route-protection-with-beforeload-ux)
- [CSRF for non-GET RPCs](#csrf-for-non-get-rpcs)
- [OAuth: state + PKCE](#oauth-state--pkce)
- [Password & rate limiting](#password--rate-limiting)
- [Migrating from clientStorage](#migrating-from-clientstorage)
- [Checklist](#checklist)
- [FAQ](#faq)

---

## Boundary rule

> *Any server function, server route, or API endpoint that returns or mutates private data must authorize the request itself. `beforeLoad` is useful for route UX … It is not the security boundary for the data.* — TanStack Start Auth Overview

**WRONG** — gate only in `beforeLoad`:

```ts
export const Route = createFileRoute('/dashboard')({
  beforeLoad: () => { if (!user) throw redirect({ to: '/login' }); },
  loader: () => fetchPrivateData(), // loader still callable directly!
})
// Attacker calls server function directly: await fetchPrivateDataFn() → leaks
```

**CORRECT** — authorize *inside* each server function:

```ts
export const getPrivateDataFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    const session = await getSession();
    if (!session?.userId) throw new Error("Unauthorized"); // boundary
    return privateFor(session.userId);
  });
```

Test it: unauthenticated `curl` to the function must `401` before returning rows.

## Sessions: HttpOnly vs localStorage

| Storage | JS readable? | XSS theft? | CSRF? | SSR? |
|---|---|---|---|---|
| `HttpOnly` cookie | No | No (script can’t read) | Need `SameSite` + Origin check | Yes — server reads `Cookie` |
| `localStorage` | Yes | Yes — XSS exfiltrates token | No cookie, so no CSRF, but token leaks elsewhere | No — hydration mismatch, flicker |

→ Use **opaque session ID in HttpOnly cookie**, looked up on server (DB/Redis), or stateless signed payload with short TTL + rotation. Never `localStorage`.

## Cookie flags matter

| Flag | Why |
|---|---|
| `HttpOnly` | JS can’t read — XSS can’t steal session |
| `Secure` | HTTPS only (required for `__Host-`) |
| `SameSite=Lax` | Top-level navigations send cookie, cross-site POSTs blocked — blocks most CSRF |
| `__Host-` prefix | Binds to exact origin, no `Domain`, `Path=/`, `Secure` required — defeats subdomain takeover |
| `Path=/` | Required by `__Host-` |
| `Max-Age` | Bounded lifetime + server rotation |

```ts
// src/server/session.ts
import { getRequestHeader, setResponseHeader } from "@tanstack/react-start/server";

export const SESSION_COOKIE = "__Host-session";

export function setSessionCookie(token: string) {
  setResponseHeader("Set-Cookie", [
    `${SESSION_COOKIE}=${token}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${7*24*3600}`,
  ].join("; "));
}
export function clearSessionCookie() {
  setResponseHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
}
export async function getSession() {
  const cookie = getRequestHeader("cookie") ?? "";
  const token = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))?.[1];
  if (!token) return null;
  return lookupSession(token); // DB lookup for opaque ID
}
```

## Server session primitives

TanStack Start’s session helper (v1.133+):

```ts
import { useSession } from "@tanstack/react-start/server";

export function useAppSession() {
  return useSession<SessionData>({
    name: "__Host-session",
    password: process.env.SESSION_SECRET!, // ≥32 random chars
    cookie: { secure: process.env.NODE_ENV === "production", sameSite: "lax", httpOnly: true },
  });
}

// login
export const loginFn = createServerFn({ method: 'POST' })
  .validator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const user = await authenticate(data.email, data.password);
    if (!user) return { error: "Invalid credentials" };
    const session = await useAppSession();
    await session.update({ userId: user.id });
    throw redirect({ to: "/dashboard" });
  });
```

`SESSION_SECRET` ≥32 chars, `Secure` in prod, rotate periodically.

## Route protection with beforeLoad (UX)

Keep UX fast, but *don’t rely on it* alone:

```ts
// routes/_authed.tsx
import { createFileRoute, redirect } from "@tanstack/react-router";
import { getCurrentUserFn } from "../server/auth";

export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ location }) => {
    const user = await getCurrentUserFn(); // server function that checks session
    if (!user) throw redirect({ to: '/login', search: { redirect: location.href } });
    return { user };
  },
});
```

`Dashboard` then `Route.useRouteContext().user` — no extra fetch, but the *data* loaders still authorize.

## CSRF for non-GET RPCs

`SameSite=Lax` blocks most cross-site POST, but not:

- GET that mutates (never do it — use POST/PUT/DELETE)
- POST from sibling subdomain (Lax allows same-site subdomains)

So verify `Origin` on every non-GET:

```ts
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export const csrfMiddleware = createMiddleware().server(async ({ next }) => {
  const req = getRequest();
  if (req.method !== "GET" && req.method !== "HEAD") {
    const origin = req.headers.get("origin");
    if (!origin || new URL(origin).origin !== process.env.APP_ORIGIN!) {
      throw new Error("Origin check failed");
    }
  }
  return next();
});
// In src/start.ts: createStart({ requestMiddleware: [csrfMiddleware, cspMiddleware] })
```

## OAuth: state + PKCE

```ts
export const startOAuth = createServerFn({ method: 'GET' }).handler(async () => {
  const state = base64url(crypto.randomBytes(32));
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  // store state+verifier in short-lived signed HttpOnly cookie keyed to attempt
  setResponseHeader("Set-Cookie", `__Host-oauth=${signed({state,verifier})}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`);
  throw redirect({ href: `https://provider.example/authorize?response_type=code&client_id=${process.env.OAUTH_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.OAUTH_REDIRECT_URI!)}&state=${state}&code_challenge=${challenge}&code_challenge_method=S256` });
});
// callback: verify state matches cookie, exchange code+verifier for tokens, clear oauth cookie
```

- `state` = CSRF for the callback
- `PKCE` = defends code interception

## Password & rate limiting

- Hash with `bcrypt`/`scrypt`/`Argon2`; for missing users, verify against **dummy hash** and return same “Invalid credentials” message (no enumeration)
- Rate limit `login`/`register`/`reset` by IP (+ account) with sliding window; throw `429` after N
```ts
import { getRequestHeader } from "@tanstack/react-start/server";
const ip = getRequestHeader("x-forwarded-for")?.split(",")[0] ?? "unknown";
if (!(await rateLimit.allow(`login:${ip}`, { max: 5, windowMs: 15*60_000 }))) throw new Error("Too many attempts");
```

## React x TanStack Start — file-by-file auth sample

A minimal login→protected dashboard with React form calling a Server Function (type-safe RPC) and TanStack Router `beforeLoad`:

```
src/
├─ server/
│  ├─ session.ts          # setSessionCookie / getSession (HttpOnly)
│  └─ auth.ts             # loginFn, getCurrentUserFn (server functions)
├─ routes/
│  ├─ __root.tsx          # RootRoute
│  ├─ login.tsx           # /login — public, React form + loginFn
│  ├─ _authed.tsx         # /_authed — layout that checks beforeLoad
│  └─ _authed/dashboard.tsx # /_authed/dashboard — protected React page
├─ components/
│  └─ LoginForm.tsx       # React form with useMutation (client)
└─ start.ts               # createStart with csrfMiddleware + cspMiddleware
```

**1. `server/auth.ts` — server functions (boundary):**

```ts
// src/server/auth.ts — React x TanStack Start server layer
import { createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { z } from "zod";
import { useAppSession } from "./session";

export const getCurrentUserFn = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useAppSession();
  const userId = (await session.get("userId")) as string | undefined;
  if (!userId) return null;
  return db.user.findUnique({ where: { id: userId } }); // server DB lookup
});

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });

export const loginFn = createServerFn({ method: "POST" })
  .validator(loginSchema.parse) // Zod — never trust client
  .handler(async ({ data }) => {
    // Rate-limit by IP before expensive hash
    const ip = (await import("@tanstack/react-start/server")).getRequestHeader("x-forwarded-for")?.split(",")[0] ?? "unknown";
    if (!(await rateLimit.allow(`login:${ip}`, { max: 5, windowMs: 15*60_000 }))) throw new Error("Too many attempts");

    const user = await db.user.findUnique({ where: { email: data.email } });
    // dummy hash for missing user — no enumeration via timing
    const hash = user?.passwordHash ?? DUMMY_BCRYPT_HASH;
    const ok = await bcrypt.compare(data.password, hash);
    if (!ok || !user) return { error: "Invalid credentials" as const }; // same message

    const session = await useAppSession();
    await session.update({ userId: user.id });
    throw redirect({ to: "/_authed/dashboard" });
  });

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useAppSession();
  await session.clear();
  throw redirect({ to: "/login" });
});
```

**2. `components/LoginForm.tsx` — React form calling Server Function (not fetch/localStorage):**

```tsx
// src/components/LoginForm.tsx — React
import * as React from "react";
import { useRouter } from "@tanstack/react-router";
import { loginFn } from "~/server/auth";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const form = new FormData(e.currentTarget);
    const data = { email: String(form.get("email")), password: String(form.get("password")) };
    try {
      const res = await loginFn({ data }); // TanStack Start RPC — sets HttpOnly cookie via Set-Cookie header
      if ((res as any)?.error) setError((res as any).error);
      else router.invalidate(); // re-run beforeLoad to see new session
    } catch (err: any) {
      setError(err.message ?? "Login failed");
    } finally { setPending(false); }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input name="email" type="email" required placeholder="you@example.com" className="w-full rounded-lg border px-3 py-2" />
      <input name="password" type="password" required placeholder="••••••••" className="w-full rounded-lg border px-3 py-2" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={pending} className="w-full rounded-lg bg-zinc-900 text-white py-2">
        {pending ? "Signing in…" : "Sign in"}
      </button>
      {/* No localStorage — session lives in HttpOnly cookie set by server */}
    </form>
  );
}
```

**3. `routes/_authed.tsx` + `dashboard.tsx` — TanStack file routes (React):**

```tsx
// src/routes/login.tsx — public
import { createFileRoute } from "@tanstack/react-router";
import { LoginForm } from "~/components/LoginForm";
export const Route = createFileRoute("/login")({ component: () => <LoginForm /> });

// src/routes/_authed.tsx — authed layout, UX guard
import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { getCurrentUserFn } from "~/server/auth";
export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ location }) => {
    const user = await getCurrentUserFn(); // server function — reads HttpOnly cookie on server
    if (!user) throw redirect({ to: "/login", search: { redirect: location.href } });
    return { user }; // passed to children via useRouteContext
  },
  component: () => <Outlet />,
});

// src/routes/_authed/dashboard.tsx — protected React page, still authorizes inside data calls
import { createFileRoute } from "@tanstack/react-router";
import { getPrivateDataFn } from "~/server/data";
export const Route = createFileRoute("/_authed/dashboard")({
  loader: async () => getPrivateDataFn(), // getPrivateDataFn itself checks session — boundary, not beforeLoad
  component: Dashboard,
});
function Dashboard() {
  const data = Route.useLoaderData(); // React hook — already authorized on server
  const { user } = Route.useRouteContext();
  return <div><h1>Welcome, {user.email}</h1><pre>{JSON.stringify(data, null, 2)}</pre></div>;
}
```

React `beforeLoad` keeps users out of UI they can’t use and avoids wasted loader work, but the *real* guard remains `await getSession()` inside every `createServerFn` that touches private data — direct `curl` to the function must `401` before any rows return.

## Migrating from clientStorage

1. Move auth logic to server functions (no `fetch('/api/login')` with localStorage)
2. Replace `localStorage.setItem('token', …)` with `setSessionCookie`
3. `beforeLoad` reads via `getCurrentUserFn()` (server) instead of `localStorage.getItem`
4. Add `validator()` on every server function that takes input (Zod)
5. Add security headers/CSP ( companion doc)

## Checklist

- [ ] Every server function that touches private data `await getSession()` and rejects `401` before DB
- [ ] Sessions are `__Host-` + `HttpOnly` + `Secure` + `SameSite=Lax` + `Path=/`, never `localStorage`
- [ ] `beforeLoad` only for UX redirect, not as boundary
- [ ] Non-GET RPCs check `Origin === APP_ORIGIN` (middleware)
- [ ] OAuth: random `state` + PKCE `verifier/challenge` in short-lived signed cookie
- [ ] Passwords hashed (Argon2/bcrypt), dummy-hash for missing users, same message for enum defense
- [ ] Rate limit login/register/reset + log auth events

## FAQ

**Can I use JWT in localStorage?** You can, but it’s less secure — XSS steals it. Prefer `HttpOnly` session ID lookup; if JWT, keep it in `HttpOnly` cookie with `Secure`/`SameSite`.

**Is SameSite enough for CSRF?** For most cross-site POSTs, yes. For sibling-subdomain POSTs, add `Origin` check.

**Should I use a hosted auth (Clerk/WorkOS) instead?** Hosted gives pre-built UI, audit, compliance, and updates for a price — DIY gives full control but you own the OWASP list above.

---

## Takeaway

In TanStack Start, auth is server-first: **HttpOnly session cookies are the transport, server functions are the boundary, `beforeLoad` is the UX**. Generate session with `useSession`, guard every data access, enforce CSRF via `Origin`, use `state+PKCE` for OAuth, and rate-limit with dummy-hash enumeration defense. That’s the foundation the other security layers (CSP, Trusted Types) build on.

*Tags: tanstack-start, react, authentication, session, httponly, samesite, __Host-, csrf, origin, oauth, pkce, rate-limit, beforeLoad*
