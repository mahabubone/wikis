# Custom Agents for Better Harness of Agentic AI — Kilo & OpenCode

*Source: https://github.com/Kilo-Org/kilocode/blob/v7.1.17/packages/kilo-docs/pages/customize/custom-modes.md + https://kilo.ai/docs/customize/agents-md + https://galpt.github.io/kilocode-agents/*
*Author: Kilo Org Docs, galpt/kilocode-agents — 2025–2026*

> Custom agents (called *modes* in VS Code legacy) let you **pin a model, a system prompt, permissions, and a role** per task — e.g., `docs-writer` with read-only tools, `security-reviewer` with heavier reasoning. Define them as Markdown files with YAML frontmatter in `.kilo/agents/*.md` (or `agent` key in `kilo.jsonc`), share them across Kilo CLI + VS Code + OpenCode via a centralized `.ai-config/` with symlinks, and use `mode: subagent` for helpers that only `Task()`-delegates can invoke.

---

## Table of Contents

- [What is a custom agent?](#what-is-a-custom-agent)
- [Where agents live — precedence](#where-agents-live--precedence)
- [Frontmatter reference](#frontmatter-reference)
- [Primary vs subagent](#primary-vs-subagent)
- [Permissions per tool](#permissions-per-tool)
- [AGENTS.md — the README for AI](#agentsmd--the-readme-for-ai)
- [Centralize: Write Once, Read Everywhere](#centralize-write-once-read-everywhere)
- [Example: 3 agents for one repo](#example-3-agents-for-one-repo)
- [Overriding built-ins](#overriding-built-ins)
- [Sticky models & temperature](#sticky-models--temperature)
- [Checklist](#checklist)
- [Common mistakes](#common-mistakes)
- [FAQ](#faq)

---

## What is a custom agent?

Called *custom modes* in legacy VS Code (`custom_modes.yaml` / `.kilocodemodes`), now **agents** — Markdown files where the *filename* is the agent’s ID and the *body* is its system prompt.

> `docs-writer.md` → agent named `docs-writer`. Pick it via `@docs-writer <task>` or let `ceo` delegate via `Task(subagent_type="docs-writer")`.

Built-ins you can override: `code`, `plan`, `debug`, `ask`, `orchestrator`, `explore`, `general` [custom-modes.md].

## Where agents live — precedence

Highest to lowest (last wins):

1. Built-in agent defaults
2. Global `~/.config/kilo/kilo.jsonc` → `agent` key
3. Project `kilo.jsonc` at root
4. `.kilo/` / `.opencode/` directory configs + `agent/*.md` files
5. `KILO_CONFIG_CONTENT` env overrides

Project Markdown files are **canonical** — JSON `vscode/agents.json` is a derived artifact for Settings import [kilocode-agents].

| Surface | Project agents | Global agents |
|---|---|---|
| CLI | `.kilo/agents/*.md` or `.opencode/agents/*.md` | `~/.config/kilo/agents/*.md` |
| VS Code | Same (extension reads CLI files) | Same |

Check discovery: `.kilo/agents/`, `.kilo/agent/`, `.opencode/agents/` — all recognized; missing agent usually means wrong `mode`.

## Frontmatter reference

Each `.md` file has optional YAML frontmatter:

| Property | Description | Example |
|---|---|---|
| `description` | Short summary shown in picker, used by orchestrator for delegation | `Writes docs with diataxis — no code` |
| `model` | Pin `provider/model` e.g. `anthropic/claude-sonnet-4-20250514` | `model: anthropic/claude-opus-4` |
| `mode` | `primary` (user-pickable) / `subagent` (only `Task()`-delegated) / `all` | `mode: subagent` |
| `permission` | Per-tool overrides (`read`/`edit`/`bash`/`browser`) with `allow`/`deny`/`ask` + glob | See below |
| `color` | Hex `#FF5733` or theme keyword `primary` | `color: "#4A90E2"` |
| `steps` | Max agentic iterations before text-only fallback | `steps: 30` |
| `temperature` / `top_p` | Sampling params | `temperature: 0.2` |
| `hidden` / `disable` | Hide from UI / remove entirely | `hidden: true` |

**Minimal agent:**

```md
---
description: Writes docs-writer with strict diataxis, no code edits
model: anthropic/claude-sonnet-4-20250514
mode: primary
permission:
  edit: deny
  bash: allow
---
You are docs-writer. You write Markdown docs following diataxis. Never edit code — only read and write docs.
```

## Primary vs subagent

- **`primary`** — appears in agent picker (`@docs-writer`), user-selectable.
- **`subagent`** — hidden, only invoked by other agents via `Task(subagent_type="docs-writer")` — perfect for `fidelity-reviewer`, `repo-explorer` helpers that shouldn’t be top-level.
- **`all`** — both.

Use `subagent` for the 7 helper agents in the CEO pipeline (`requirement-triage`, `context-engineer`, etc.) — they’re not meant to be picked directly.

## Permissions per tool

Glob-aware, per-tool (`read`, `edit`, `bash`, `browser`, `mcp_*`):

```yaml
permission:
  read: allow
  edit:
    - allow: "src/**/*.ts"
    - deny: "src/**/*.js"
      description: "JS is legacy — TS only"
  bash: ask          # ask before running commands
  browser: deny
```

Overrides can be a single string (`allow`/`deny`/`ask`) or a list of rules with `fileRegex`/`description` (legacy `groups` used `fileRegex`; new uses `permission` with `glob`).

## AGENTS.md — the README for AI

**Open standard** supported by Kilo, Cursor, Windsurf. Plain Markdown at repo root (`AGENTS.md` preferred, `AGENT.md` fallback) plus optional per-directory `src/backend/AGENTS.md` that is loaded dynamically when the agent reads that directory (injected as `<AGENTS.md>` tags).

- Write-protected — agent asks before modifying
- Injected at session start; changes need a new task to take effect
- Priority: `agent.prompt` (1) > `kilo.jsonc instructions` (2) > `AGENTS.md` (3) > global (4) > skills (on demand)

> Keep AGENTS.md as the *single source* for coding standards, then let per-directory files add nuance (`AGENT.md` in `src/backend/`).

## Centralize: Write Once, Read Everywhere

Kilo, OpenCode, and Cursor each want their own hidden folder (`.claude`, `.opencode`, `.kilocode`). Don’t duplicate — centralize [cupofcraft.dev]:

```bash
mkdir -p .ai-config/agents .ai-config/skills
mv AGENTS.md .ai-config/AGENTS.md
mv .kilo/agents/*.md .ai-config/agents/
mv .claude/skills/* .ai-config/skills/ 2>/dev/null
ln -s .ai-config/AGENTS.md AGENTS.md
ln -s ../.ai-config/agents .kilo/agents
ln -s ../.ai-config/skills .claude/skills
ln -s .ai-config .kilocode
ln -s .ai-config .opencode
```

Every tool now reads the same brain; a skill improved in one surface is instantly everywhere.

## Example: 3 agents for one repo

```md
# .kilo/agents/docs-writer.md — primary, read-only-ish
---
description: Writes diataxis docs, no code
mode: primary
color: primary
permission:
  edit: deny
  read: allow
  bash: allow
---
You are docs-writer. Use diataxis (tutorials/how-to/reference/explanation). Read source, write docs, never touch code. Ask before publishing.
```

```md
# .kilo/agents/security-reviewer.md — subagent, heavy reasoning
---
description: Security review — trust boundaries, XSS, auth
model: anthropic/claude-opus-4-20250514
mode: subagent
permission:
  read: allow
  edit: deny
---
You are security-reviewer. Check trust boundaries, XSS via dangerouslySetInnerHTML, auth in beforeLoad vs server function, CSP nonces. Output findings as checklist.
```

```md
# .kilo/agents/repo-explorer.md — subagent, fast
---
description: Maps codebase via grep/glob, no edits
model: anthropic/claude-sonnet-4-20250514
mode: subagent
steps: 20
permission:
  edit: deny
  bash: allow
---
You are repo-explorer. Map the codebase with glob/grep, return a Context Brief. No edits.
```

Invoke: `@docs-writer update wikis` (primary) or `Task(subagent_type="security-reviewer", prompt="review src/routes/post")` (subagent).

## Overriding built-ins

Define an agent with the same name as a built-in (`code`, `plan`, `debug`, `ask`, `orchestrator`). Project Markdown completely overrides global for that slug:

```yaml
# kilo.jsonc — project override for code
{
  agent: {
    code: {
      prompt: "You are a Python engineer — PEP8, type hints required.",
      permission: { edit: { allow: "src/**/*.py" } }
    }
  }
}
```

VS Code auto-migrates legacy `.kilocodemodes` (`slug` → name, `roleDefinition`+`customInstructions` → `prompt`, `groups` → `permission`, `whenToUse` → `description`) on startup.

## Sticky models & temperature

Each mode remembers its last model — `code` → Sonnet (fast), `plan` → Opus (thinking) — so switching agents switches models automatically. Set `model` in frontmatter to pin, `temperature`/`top_p` to tune creativity vs determinism, `steps` to cap iterations.

## Checklist

- [ ] Agents as `.md` with YAML frontmatter in `.kilo/agents/` (canonical) — not only `kilo.jsonc`
- [ ] `description` tells orchestrator *when* to delegate to this agent
- [ ] `mode: subagent` for helpers that should never be `@` picked directly
- [ ] `permission` per-tool with globs, not blanket `allow`
- [ ] `AGENTS.md` at root (+ per-directory where needed) — plain Markdown, no special syntax
- [ ] Centralized `.ai-config/` with symlinks so OpenCode/Kilo share the brain
- [ ] `model` pinned where quality matters (`security-reviewer` → Opus), `sticky` for the rest
- [ ] Legacy `.kilocodemodes` removed after auto-migration verified

## Common mistakes

- **Agent not appearing:** `.md` not in `.kilo/agents/` or `mode: subagent` but you expect it in picker → use `primary` or `all`.
- **Isomorphic wrapper breaking AsyncLocalStorage:** Don’t wrap `createStart` with a custom handler for CSP — use direct `getStartContext()` (deprecated wrapper caused nonce loss).
- **Global vs project precedence confusion:** Project `.kilo/agents/*.md` *completely* overrides global for same slug — not merged.
- **Forgetting `description`:** Orchestrator uses it to choose delegates; vague description → wrong agent picked.

## FAQ

**Markdown vs `kilo.jsonc`?** Markdown is canonical; JSON `agents.json` is derived for VS Code Settings import. Prefer `.md`.

**Can I share agents between CLI and VS Code?** Yes — both read the same `.kilo/agent/*.md` files; the extension is built on the CLI backend.

**How to test a new agent?** `kilo agent create` scaffolds a definition, then `kilo --agent my-new-agent` to try it.

---

## Takeaway

Custom agents turn a generic chat into a **harness**: pin the right model and permissions per role, write the prompt as if briefing a colleague, mark helpers as `subagent`, and centralize everything in `.ai-config/` so Kilo, OpenCode, and your IDE share the same `AGENTS.md` + `agent/*.md` brain. That’s how a 5-person team ships with 16 agents without chaos.

*Tags: kilocode, opencode, custom-agents, modes, AGENTS.md, harness, subagent, permission, sticky-models*
