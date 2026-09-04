# OpenCode & KiloCode Daily Workflows — Harness for SWE Tasks

*Source: https://opencode.ai/ + https://github.com/Kilo-Org/kilocode + https://blog.kilo.ai/p/how-7-kilo-code-engineers-run-up + https://cupofcraft.dev/posts/steal-my-ai-process/*
*Author: OpenCode, Kilo Org, Darko Gjorgjievski, Andrea Barghigiani — 2025–2026*

> OpenCode (open-source, forked as Kilo CLI) and KiloCode (all-in-one agentic platform: VS Code, JetBrains, CLI, desktop) share the same harness: **multi-session parallel agents**, **500+ mid-task-switchable models with zero markup**, and **AGENTS.md** as portable memory. Daily SWE is not “one prompt → one file” but a harness: 2–4 foreground agents for reviewable slices plus fire-and-forget background agents for low-medium tasks, all guided by skills and project context.

---

## Table of Contents

- [What OpenCode & KiloCode share](#what-opencode--kilocode-share)
- [Where you meet the agent](#where-you-meet-the-agent)
- [Daily tasks → which agent?](#daily-tasks--which-agent)
- [The harness: AGENTS.md + skills + MCP](#the-harness-agentsmd--skills--mcp)
- [Parallel agents without overload](#parallel-agents-without-overload)
- [Model harness: Zen & sticky models](#model-harness-zen--sticky-models)
- [A day in the loop](#a-day-in-the-loop)
- [Checklist](#checklist)
- [Common mistakes](#common-mistakes)
- [FAQ](#faq)

---

## What OpenCode & KiloCode share

- **Kilo CLI is a fork of OpenCode** enhanced for the Kilo platform — same `.kilo/` / `.opencode/` config discovery, same `Task()` tool, same agent Markdown format [github.com/Kilo-Org/kilocode].
- **500+ models, zero markup** — pick Anthropic, OpenAI, DeepSeek, etc., switch mid-task, pay provider rate. Zen is OpenCode’s hand-picked, benchmarked subset for coding agents [opencode.ai].
- **Any editor** — terminal (`kilo` / `opencode`), VS Code, JetBrains, desktop app. Same brain follows you.

## Where you meet the agent

| Surface | Install | Agent files live |
|---|---|---|
| **Terminal / CLI** | `npm i -g @kilocode/cli` or `opencode` binary | `.kilo/agents/*.md` + `kilo.jsonc` |
| **VS Code** | Kilo Code extension (pre-release) | `Settings → Agent Behaviour → Agents` → writes same `.kilo/agents/*.md` |
| **JetBrains** | Kilo native plugin | same |
| **Desktop** | Kilo desktop app | same |

The VS Code extension is built on the Kilo CLI — they read the **same on-disk `.kilo/agent/*.md`** files. Pick one or both; the brain is portable [kilocode-agents].

## Daily tasks → which agent?

Kilo ships specialized agents you switch between. Don’t one-size `code`.

| Task | Agent | What it does | When to use |
|---|---|---|---|
| **Implement / edit code** | `code` (default) |  NATURAL_LANGUAGE → multi-file edits, self-checks | Your main builder |
| **Design before coding** | `plan` / `architect` | Writes implementation plan, no code | Before a slice, especially w/ new deps |
| **Ask without touching files** | `ask` | Answers about codebase, read-only | “Where is auth validated?” |
| **Troubleshoot** | `debug` | Traces, reproduces, fixes with Context7 | Error + stack, failing test |
| **Review your changes** | `review` / `qa-reviewer` etc. | Surfaces perf/security/style/coverage issues | After a slice, before PR |

**Sticky models:** Kilo remembers last model per mode — e.g., `code` → Sonnet, `plan` → Opus — so you don’t reconfigure when switching [custom-modes.md].

## The harness: AGENTS.md + skills + MCP

**AGENTS.md** — “README for AI agents” (open standard, supported by Kilo, Cursor, Windsurf). Plain Markdown at project root (and optionally per-directory like `src/backend/AGENTS.md`) that is injected into every conversation. Write-protected; agent asks before editing. Priority: `agent.prompt` > `kilo.jsonc instructions` > `AGENTS.md` > global instructions > skills (on demand) [kilo.ai/docs/customize/agents-md].

**Per-directory AGENTS.md:** Dynamically loaded when the agent reads that directory — `src/backend/AGENTS.md` is injected as `<AGENTS.md>` tags when the agent touches `src/backend/`.

**Centralize — “Write Once, Read Everywhere” [cupofcraft.dev]:**

```bash
mkdir -p .ai-config
mv AGENTS.md .ai-config/
mv .kilo/agents .ai-config/agents
mv .claude/skills .ai-config/skills  # if any
ln -s .ai-config/AGENTS.md AGENTS.md
ln -s ../.ai-config/agents .kilo/agents
ln -s ../.ai-config .opencode  # Kilo reads both
ln -s ../.ai-config .kilocode
```

Now OpenCode, Kilo VS Code, and JetBrains share the same brain; a skill improvement is instantly everywhere.

**Skills as living library — `SKILL.md`:** Don’t fix the same `useQuery` pattern by hand. Write a skill once:

```md
# skills/tanstack-query-options.md
Enforce queryOptions() for every useQuery/useMutation — no inline options.
Example: useQuery(queryOptions({ queryKey: ["user", id], queryFn: () => fetchUser(id) }))
```

Even better: ask the agent to *write the skill* from a code snippet you like.

**Context7 MCP:** For TanStack Start, attach the Context7 MCP server — agents pull *live* docs instead of hallucinating 2023 APIs.

## Parallel agents without overload

**What 7 Kilo engineers actually do [blog.kilo.ai]:**

- **2–4 foreground agents** — each produces a diff you can review in one sitting. If the diff is too large to review, the task was too large.
- **Fire-and-forget background agents** — low-medium tasks (fix markers, bump deps, add analytics) that ship a PR and you review the *result* later, not the stream. Mark runs 20 parallel, but 17 are background.
- Industry parallels: Addy Osmani (Google) runs 4–5 background agents; Simon Willison “outsources a little cognitive overhead” to bots.

> The bottleneck shifts from writing to **verifying**. A fresh agent session reviews better than the original author — “the person who wrote the code is worst to review it” — so separate review agents catch more.

## Model harness: Zen & sticky models

- **Zen [opencode.ai]:** hand-picked, benchmarked models for coding agents — no need to guess across providers.
- **Sticky models per agent:** `code` might be fast Sonnet, `plan` slow Opus/GPT-5.5 Thinking — Kilo switches automatically.
- **Mid-task switching:** If Sonnet stalls on a slice, `model: anthropic/claude-opus-4` on the fly.

*Tip from Kilo engineers:* **Plan harder, implement faster** — use a slow thinking model for `plan` (Opus/GPT-5.5 Thinking), then a fast model (GPT-5.5 Fast, Sonnet) to *one-shot* the implementation from that plan. Flipped (fast plan → slow implement) is error-prone [blog.kilo.ai, Florian/Imanol/Kirill].

## A day in the loop

**09:00 — Architect:** `@plan` “Add idempotent outbox to `orders` with Postgres + Debezium” — agent writes plan to `.kilo/plans/…md`, you challenge decisions and ensure it respects `skills/tanstack-query-options.md`.

**09:20 — Delegate:** “Delegate implementation to Task Orchestrator” — never mix planning context with execution context. The orchestrator splits into slices (see `planning-implementation-audit-pipeline.md`).

**09:25 — Implement (parallel):** 2 foreground `code` agents each take one slice (≤ one reviewable PR), 3 background agents handle lint fixes and docs-writer.

**10:30 — Review:** Separate `qa-reviewer` / `fidelity-reviewer` sessions check the slice — each has no attachment to the code it reviews, so it’s stricter.

**10:45 — Refine:** Patterns that emerged → `skills/` updated before closing. Next similar task is faster and more consistent.

## Checklist

- [ ] `AGENTS.md` at root (and per-directory where needed) — plain Markdown, no special syntax
- [ ] Centralized `.ai-config/` with symlinks to `.kilo/` / `.opencode/` / `.kilocode` so every surface shares the brain
- [ ] Skills library: at least one `SKILL.md` for your most-repeated correction (e.g., `queryOptions`)
- [ ] Context7 MCP attached for framework docs (TanStack)
- [ ] 2–4 foreground agents max, background agents fire-and-forget with PRs
- [ ] Task sized so diff is reviewable in one sitting; GCCD prompt structure if needed
- [ ] Sticky models: slow for `plan`, fast for `code`

## Common mistakes

- **One task — one giant prompt:** “Refactor, improve perf, add analytics, clean tests” is four tasks, not one — split via `Task()` tool.
- **Skipping `AGENTS.md`:** Re-explaining conventions every session wastes thousands of tokens — let `grep` find files instead of `@` them all.
- **Mixing plan and implement contexts:** Keep them separate — plan writes the plan, orchestrator executes it.
- **Ignoring review agents:** The writer is worst to review; let a fresh `review` session check before you merge.

## FAQ

**Kilo CLI vs OpenCode?** Kilo CLI is a fork of OpenCode with Kilo platform additions (sticky models, 500+ models, desktop). Agent files are interchangeable [kilo.ai].

**Where do custom modes live?** `.kilo/agents/*.md` (project) or `~/.config/kilo/agents/*.md` (global), or `agent` key in `kilo.jsonc` — Markdown is canonical, JSON derived [custom-modes.md].

**Do I need VS Code to use custom agents?** No — CLI and VS Code read the same `.kilo/agent/*.md`; `kilo` in terminal sees them.

---

## Takeaway

Daily SWE with OpenCode/KiloCode is a **harness**, not a prompt trick: `AGENTS.md` + skills + Context7 give every agent the same project truth, reading from a centralized `.ai-config`, while you orchestrate 2–4 reviewable foreground agents and a handful of background PRs — planning with a slow thinker, implementing with a fast one, and letting separate reviewers verify. That’s the loop 7 Kilo engineers ship at “Kilo Speed”.

*Tags: opencode, kilocode, kilocli, agentic-swe, harness, AGENTS.md, skills, mcp, context7, parallel-agents, sticky-models, zen*
