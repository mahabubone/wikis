# Agentic Debugging Workflow — From Error to Skill (Plan → Fix → Harden)

*Source: https://github.com/Kilo-Org/kilocode/blob/v7.1.17/packages/kilo-docs/pages/customize/custom-modes.md (debug agent) + https://cupofcraft.dev/posts/steal-my-ai-process/ (debug loop) + https://blog.kilo.ai/p/how-7-kilo-code-engineers-run-up (verification loops)*
*Author: Kilo Org, Andrea Barghigiani, Kilo 7 engineers — 2025–2026*

> Start *immediately* with the specialized `debug` agent, feed it the exact error + Context7 docs, let it trace → reproduce → fix with verification evidence, then close the loop by asking: **“Do we need to update our current skills or create a new one to prevent this bug?”** That last question turns a one-off fix into a harness improvement — the skill becomes the test for the next similar bug.

---

## Table of Contents

- [When to reach for debug vs code](#when-to-reach-for-debug-vs-code)
- [The debug agent — what it pins](#the-debug-agent--what-it-pins)
- [Context efficiency: grep, not @](#context-efficiency-grep-not-)
- [The 3-step loop](#the-3-step-loop)
- [Example: hydration mismatch in TanStack Start](#example-hydration-mismatch-in-tanstack-start)
- [Verification loops that catch the fix](#verification-loops-that-catch-the-fix)
- [From fix to skill — the knowledge loop](#from-fix-to-skill--the-knowledge-loop)
- [Checklist](#checklist)
- [Common mistakes](#common-mistakes)
- [FAQ](#faq)

---

## When to reach for debug vs code

| Task | Agent | Why |
|---|---|---|
| **“Implement X”** | `code` | Builds from natural language, may edit broadly |
| **“Fix this error / failing test / stack trace”** | `debug` | Narrow, trace-focused, self-checking, respects existing skills |

Kan’s rule [cupofcraft]: *If the prompt starts with an error message, start with `debug` — not `code`.* The debug agent’s prompt is tuned for tracing, not green-field generation, and its `permission` can be tighter (e.g., `edit` only on `src/**/*.ts`).

## The debug agent — what it pins

```yaml
# .kilo/agents/debug.md — example (trimmed)
---
description: Troubleshoots and traces issues — use for errors, failing tests, stack traces
model: anthropic/claude-sonnet-4-20250514
mode: primary
permission:
  read: allow
  edit:
    - allow: "src/**/*.ts"
    - allow: "src/**/*.tsx"
  bash: allow
  browser: allow
steps: 30
---
You are debug. Trace the issue, reproduce if possible, fix with minimal diff, and provide verification evidence (test output, log). Do not refactor unrelated code.
```

- **Sticky model:** debug often benefits from a fast Sonnet for tracing + a heavy Opus for the fix — let Kilo remember per mode.
- **Verification built-in:** debug is expected to run the failing command (`npm run build`, `vitest`, `playwright`) and show output before claiming done.

## Context efficiency: grep, not @

Costly: `@src/components/Header.astro` `@src/components/Sidebar.astro` `@src/utils/content.ts` … — each `@` eagerly reads thousands of tokens.

Cheaper: Tell the agent **filenames**, let it `grep` for the slice:

> “Error is `Hydration mismatch: server rendered ...` in `Dashboard` route. Relevant files likely `src/routes/dashboard.tsx`, `src/components/Dashboard.tsx`. You have `grep` — find the `window.localStorage` read. You have Context7 — check TanStack Start selective SSR.”

The agent then `grep -n "localStorage"` and reads only that hunk — saves thousands of tokens vs eager `@` [cupofcraft].

## The 3-step loop

**1. The Debugger — start with debug:**

> `@debug Hydration mismatch on /dashboard — Error: Text content does not match … Stack: ... You have Context7 for TanStack Start.`

Provide the *specific* error, not “the dashboard is broken”. Mention you have Context7 MCP — the agent will pull live `selective-ssr` docs instead of hallucinating.

**2. Context — let it trace + reproduce:**

Debug agent will:
- `grep` for the route/component
- Check `ssr` flag on the route (`true` vs `data-only` vs `false`)
- Reproduce via `npm run build` or `vitest -t "dashboard"` *before* editing

**3. The Knowledge Loop — hardest, most important [cupofcraft]:**

After green, ask:

> “Do we need to update our current skills or create a new one to prevent this bug in the future?”

The agent then proposes a `SKILL.md` diff — e.g., `skills/tanstack-selective-ssr.md` — that becomes the guardrail for the next similar error.

## Example: hydration mismatch in TanStack Start

**Error:**

```
Hydration failed because the initial UI does not match what was rendered on the server.
Warning: Text content did not match. Server: "null" Client: "draft text"
  at Dashboard (src/routes/dashboard.tsx:12)
```

**Agent trace (what debug does):**

```bash
grep -rn "localStorage" src/routes/
# src/routes/dashboard.tsx:5 — const draft = localStorage.getItem("draft");
```

**Fix — `data-only` or `false`, not `true`:**

```tsx
// Before — SSR true (default), loader on server can't see localStorage:
export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
  loader: () => localStorage.getItem("draft"), // ❌ server has no window
})

// After — data-only: loader on server, component on client, no mismatch
export const Route = createFileRoute('/dashboard')({
  ssr: "data-only",
  loader: () => fetchDraftFromServer(), // server DB, not window
  component: Dashboard, // Dashboard uses useEffect to merge localStorage after hydration
})
```

Alternatively `ssr: false` for fully private, non-indexed dashboard — both avoid hydration mismatch [seo-and-rendering-tanstack-react.md].

**Verification evidence debug returns:**

```
✓ npm run build — 71 pages, no hydration errors
✓ vitest dashboard.test.tsx — 3 passed
✓ grep -rn "localStorage.getItem" src/routes — only inside useEffect now
```

**Skill proposal debug asks to create:**

```md
# skills/tanstack-selective-ssr.md
Rule: Any route that reads window/localStorage/sessionStorage during render must be ssr:"data-only" or false.
Check: grep -rn "localStorage|window\." src/routes --include="*.tsx"
Fix: Move window read to useEffect, keep loader server-only.
```

## Verification loops that catch the fix

**Separate reviewer agent** — the writer is worst to review [blog.kilo.ai]. After `debug` fixes, delegate:

```
Task(subagent_type="qa-reviewer", prompt="Review src/routes/dashboard.tsx fix for hydration mismatch — check isTrustedTypes & CSP still applied")
```

QA reviewer runs tests and surfaces “you fixed hydration but left `script-src` without nonce” — the original debug wouldn’t have caught its own follow-on.

**Florian’s pattern:** PR-review-feedback agent — reviewer leaves comment, OpenClaw agent reads feedback, makes changes, messages back. Multiply by hundreds of PRs.

## From fix to skill — the knowledge loop

1. **Ask for the skill diff** before closing the task: “Update `skills/` before close.”
2. **Review the diff** — is it a repeatable rule or a one-off?
3. **Commit the skill** alongside the fix: `git add skills/tanstack-selective-ssr.md && git commit -m "fix(dashboard): use data-only for localStorage — add skill"`

Next time a similar bug appears, the `AGENTS.md`-referenced skill is already in every agent’s context via `.ai-config/`, so `debug` catches it earlier.

## Checklist

- [ ] Start error work with `@debug <exact error + stack>` — not `code`
- [ ] Provide filenames, let agent `grep`, mention Context7 for framework docs
- [ ] Debug reproduces first (`npm run build` / test) before editing
- [ ] Fix is minimal diff, verified with command output
- [ ] Ask the knowledge-loop question: “Do we need to update/create a skill?”
- [ ] Separate `qa-reviewer` session verifies the fix
- [ ] Skill committed if pattern emerged

## Common mistakes

- **Starting with `code` for a bug:** `code` may “fix” by refactoring unrelated code — `debug` is narrower.
- **`@`-ing every file:** Eagerly reads huge context; slows, costs tokens, may exceed 60% context window where quality drops [blog.kilo.ai, Igor].
- **Skipping reproduction:** Fix claimed but `npm run build` still fails — always ask for verification evidence.
- **Forgetting the skill:** Fix without harness improvement → same bug next week.

## FAQ

**Can debug edit code?** Yes — its `permission.edit` allows `src/**/*.ts` — but its prompt says “minimal diff, no refactor” so it stays scoped.

**What model for debug?** Fast Sonnet for tracing, heavier Opus for the fix — Kilo’s sticky models remember. Or let `debug` use Sonnet and delegate the fix to `code` with Opus.

**Do I need Context7?** Not required, but for TanStack Start selective SSR the live docs prevent the agent from hallucinating `getServerSideProps`.

---

## Takeaway

Agentic debugging is a **loop**, not a prompt: `debug` traces with `grep` + docs, fixes minimally with evidence, then a *different* reviewer verifies, and the loop closes by **encoding the lesson as a skill**. That’s how a one-off “hydration mismatch” becomes a harness rule that protects the next 61 pages.

*Tags: debug, agentic-debugging, tanstack-start, hydration, grep, context7, skill, verification-loop, qa-reviewer*
