# How to Test GraphQL APIs with Bruno: Queries, Mutations & Assertions

*Source: https://blog.usebruno.com/how-to-test-graphql-apis-with-bruno-queries-mutations-assertions*
*Author: Anthony Dombrowski — Jul 20, 2026 · 15 min read*

> A GraphQL query can fail while the API still returns `200 OK`. The real failure is tucked inside the `errors` array. Test the body, not just the status line. This guide walks through queries, mutations, variables, error handling and CI with Bruno — where requests live as plain files alongside your code.

---

## Table of Contents

- [Why GraphQL Testing Is a Little Different](#why-graphql-testing-is-a-little-different)
- [Setting Up Your First GraphQL Request](#setting-up-your-first-graphql-request)
- [Testing Queries: Assertions That Actually Catch Failures](#testing-queries-assertions-that-actually-catch-failures)
- [Using Variables and Environments](#using-variables-and-environments)
- [Testing Mutations and Chaining Requests](#testing-mutations-and-chaining-requests)
- [Testing GraphQL Error Handling](#testing-graphql-error-handling)
- [Running Your GraphQL Tests in CI](#running-your-graphql-tests-in-ci)
- [GraphQL Testing Checklist](#the-graphql-testing-checklist)

---

## Why GraphQL Testing Is a Little Different

If instincts come from REST, several will lead you astray:

| REST reflex | GraphQL reality | What to test |
|---|---|---|
| Route by URL + method (`GET /users`, `POST /orders`) | **One endpoint**, always `POST` — query body says what you want | Operation in query body |
| `4xx` means failure | Many failures still return `200` with `errors` array | Presence/absence of `errors` |
| Response is data *or* error | `data` and `errors` can coexist (partial success) | Both together |
| Unknown shape | Schema is strongly typed & introspectable | Shape against schema |

**Key GraphQL quirks:**

- **There's usually just one endpoint.** `query users`, `mutation order`, `mutation logout` all `POST` to same URL.
- **`data` and `errors` can show up together.** You might get fields that resolved + an `errors` entry for the one that didn't.
- **Errors hide in body, not status.** Example of a failed but `200 OK` response:

```json
{
  "data": null,
  "errors": [
    {
      "message": "You must be logged in to do that.",
      "extensions": { "code": "UNAUTHENTICATED" }
    }
  ]
}
```

> A status-only check passes right over this.

- **Schema describes itself** — ask what types/queries/mutations exist and validate against it.

Pairs naturally with [API Contract Testing with Bruno](https://blog.usebruno.com/api-contract-testing-with-bruno) — GraphQL schema gives you a lot to assert against.

---

## Setting Up Your First GraphQL Request

No need to build an API — use a public one. **Rick and Morty API** is ideal (no signup, no key): `https://rickandmortyapi.com/graphql`. Any public GraphQL endpoint from [graphql-apis list](https://github.com/APIs-guru/graphql-apis) works similarly.

1. Open Bruno → create new **collection** (folder for related requests)
2. Add new request → set type to **GraphQL** → URL `https://rickandmortyapi.com/graphql`
3. Ensure method is **POST** (default for GraphQL in Bruno)

**Why Bruno fits:**

- Request saved as **plain YAML text file** in collection folder — no cloud sync, Git-diffable, travels with project, reviewable in PRs
- **Two panes:** Query (fixed shape) + Variables (values you swap)
- **Schema introspection:** Bruno reads schema for autocomplete/inline validation. Load/refresh via request's three-dot menu → type field name → suggestions catch typos before send

**Empty / 204 No Content?** Check:
1. Method is **POST** (GraphQL travels in body; `GET` → empty)
2. Header `Content-Type: application/json` (Bruno sets for you, but verify)

First query — paste in **query pane**:

```graphql
query GetCharacter {
  character(id: 1) {
    name
    status
    species
    origin {
      name
    }
  }
}
```

Hit Send:

```json
{
  "data": {
    "character": {
      "name": "Rick Sanchez",
      "status": "Alive",
      "species": "Human",
      "origin": { "name": "Earth (C-137)" }
    }
  }
}
```

### Bruno File Representation (Git-tracked)

A GraphQL request is stored as YAML since Bruno v3.1 — same pattern as contract testing:

```yaml
meta:
  name: GetCharacter
  type: graphql
graphql:
  url: "{{baseUrl}}"
  body: |
    query GetCharacter($id: ID!) {
      character(id: $id) { name status }
    }
  variables: |
    { "id": "1" }
runtime:
  assertions:
    - expression: res.status
      operator: eq
      value: "200"
```

---

## Testing Queries: Assertions That Actually Catch Failures

Eyeballing response is fine for exploring; a *test* is a re-runnable promise that fails loudly.

For GraphQL, check **three layers** — middle layer is most often skipped:

1. **Transport** `res.getStatus()` — reached server, `200`. Necessary, never enough.
2. **No errors** `body.errors` — no `errors` array. **Most forgotten.**
3. **Shape & values** `body.data.*` — right fields/types/values.

Bruno gives two ways: **Assert** tab (declarative field path + operator + value → saved as `runtime.assertions`) and **Tests** tab (JavaScript `expect` with Chai). For GraphQL's errors-array logic, code reads clearer — use **Tests** tab:

```js
test("transport: request succeeded at the HTTP level", function () {
  expect(res.getStatus()).to.equal(200);
});

test("no errors: the response has no GraphQL errors", function () {
  const body = res.getBody();
  expect(body.errors).to.be.undefined;
});

test("shape & values: character data is present and correct", function () {
  const character = res.getBody().data.character;
  expect(character).to.be.an("object");
  expect(character).to.have.property("name", "Rick Sanchez");
  expect(character).to.have.property("status");
  expect(character.status).to.be.a("string");
});
```

> The second test does work status can't: `200` can still mean query failed; `expect(body.errors).to.be.undefined` fails the moment API reports problem in `errors` array.

**Why all three needed:**

- Change `id: 1` → `9999` (non-existent): returns `data.character = null` with `200 OK` and **no** `errors`. Transport + no-errors stay green, but you got no character. **Shape & values** test expecting real object fails — that's its job.
- Change field `name` → `naem`: server rejects malformed query up front with `400` + `GRAPHQL_VALIDATION_FAILED` before running. Status sometimes `200`, sometimes `4xx` — **can't route on status**. Reliable signal is `errors` array in both cases.

> Keep `expect(res.getStatus()).to.equal(200)` as sanity check, never *only* check.

---

## Using Variables and Environments

Hardcoding `1` works once; reuse same query with different inputs via **variables**:

Query pane:

```graphql
query GetCharacter($id: ID!) {
  character(id: $id) {
    name
    status
  }
}
```

Variables pane:

```json
{
  "id": "1"
}
```

Same result, now template — change variable, test different character without touching query.

**Next step: Environments.** APIs run in multiple places (local, staging, prod) with different base URLs/creds. Define environment per place, store changing values as vars, reference with `{{baseUrl}}`, `{{token}}`.

```
{{baseUrl}}  → https://rickandmortyapi.com/graphql  (Local)
            → https://staging-api.example.internal/graphql (Staging)
```

Collection's URL becomes `{{baseUrl}}`; header `Authorization: Bearer {{token}}`. Switching env is dropdown change; every request follows. Environments are files too → shared via repo (secrets kept out of version control).

Auth unchanged by GraphQL — still token/credential on request. See [API authentication handbook](https://blog.usebruno.com/api-authentication-a-bruno-handbook) and [OAuth 2.0 deep dive](https://blog.usebruno.com/what-is-oauth-2.0-oauth-2-explained-for-developers).

**Environment file (YAML, Bruno v3.1):**

```yaml
name: Staging
variables:
  - name: baseUrl
    value: https://staging-api.example.internal/graphql
    enabled: true
    secret: false
    type: text
  - name: token
    value: ""
    enabled: true
    secret: true
    type: text
```

---

## Testing Mutations and Chaining Requests

Queries read; **mutations** create/update/delete. A mutation can return nice-looking response yet not have persisted. Reliable way: **prove side effect** — make change, then query back to confirm.

```
STEP 1 Create → STEP 2 Capture (bru.setVar) → STEP 3 Confirm (query back) → STEP 4 Clean up (delete)
```

> **Heads-up:** Public Rick and Morty API is read-only — mutation returns `Schema is not configured for mutations` (expected). Most demo APIs don't allow writes. Test mutations against API you control (local/staging). Pattern below models a simple to-do API.

### Step 1: Run the mutation

```graphql
mutation CreateTodo($title: String!) {
  createTodo(title: $title) {
    id
    title
    completed
  }
}
```

Variables pane (feed from variable for single source of truth):

```json
{
  "title": "{{newTodoTitle}}"
}
```

Set `newTodoTitle` via environment or pre-request `bru.setVar("newTodoTitle", "Buy milk")`.

### Step 2: Capture returned id

Tests tab:

```js
test("mutation created a todo and returned it", function () {
  const body = res.getBody();
  expect(body.errors).to.be.undefined;

  const todo = body.data.createTodo;
  expect(todo).to.have.property("id");
  expect(todo.title).to.equal(bru.getVar("newTodoTitle"));
  expect(todo.completed).to.equal(false);

  // hand id to next request
  bru.setVar("createdTodoId", todo.id);
});
```

### Step 3: Confirm it persisted

Second request:

```graphql
query GetTodo($id: ID!) {
  todo(id: $id) {
    id
    title
  }
}
```

Variables:

```json
{
  "id": "{{createdTodoId}}"
}
```

```js
test("the created todo can be read back", function () {
  const body = res.getBody();
  expect(body.errors).to.be.undefined;
  expect(body.data.todo).to.not.be.null;
  expect(body.data.todo.id).to.equal(bru.getVar("createdTodoId"));
});
```

### Step 4: Clean up

Delete mutation for same ID so repeated runs stay tidy.

**Note on write tests:** Create/delete real data → run against test/local, never prod; always pair create with cleanup.

> Spec detail: GraphQL runs fields in a *query* in parallel, but top-level fields in a *mutation* run sequentially, in order — keeps writes predictable when you send several in one request.

---

## Testing GraphQL Error Handling

Big part of trust: API fails *correctly* — clear message, right code, no leaking secrets. Since all in `errors` array, very testable:

```json
{
  "errors": [
    {
      "message": "You must be logged in to do that.",
      "path": ["createTodo"],
      "extensions": { "code": "UNAUTHENTICATED" }
    }
  ]
}
```

| Field | What it is | Assert? |
|---|---|---|
| `message` | Human-readable text | Handy but wording changes |
| `path` | Which field failed | Useful for locating |
| `extensions.code` | Machine-readable code | **Yes — stable** |

Most useful: `message` + `extensions.code` (stable). Deliberately trigger each failure:

```js
test("rejects an unauthenticated write with the right code", function () {
  const body = res.getBody();
  // this SHOULD have errors — that's the point
  expect(body.errors).to.be.an("array").that.is.not.empty;
  expect(body.errors[0].extensions.code).to.equal("UNAUTHENTICATED");
});
```

**Cases to cover:**

- **Validation errors:** mistyped field / wrong variable type → reject before run, typically `GRAPHQL_VALIDATION_FAILED`
- **Execution errors:** resolver throws or returns `null` for non-nullable → check message + `path`
- **Auth errors:** missing permissions → assert on `code` (`UNAUTHENTICATED`/`FORBIDDEN`) not wording

> Flip earlier rule: happy-path `expect(errors).to.be.undefined` vs negative `expect(errors).to.be.an("array")` with code — together prove both directions.

---

## Running Your GraphQL Tests in CI

Tests that only run when you click “send” don’t protect long.

```
Write locally → Commit to Git (files version/review like code) → CI runs bru → Pass merge / Fail blocked
```

Because collection is just files in repo, nothing to export. **Bruno CLI** runs exact same collection from terminal:

```bash
npm install -g @usebruno/cli

# run every request (and its tests) in collection, against staging
bru run --env Staging
```

Options: `--env Staging --env-var API_TOKEN=$SECRET --reporter-junit results.xml --reporter-html report.html`

Wire into pipeline via **official Bruno Docker image** (`usebruno/cli`) or **GitHub Action**. Full pipeline config → [Official Bruno Docker Image and GitHub Action](https://blog.usebruno.com/official-bruno-docker-image-and-github-action).

**GitHub Action example:**

```yaml
name: GraphQL Contract Tests
on:
  pull_request:
    branches: [main]
jobs:
  tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run GraphQL tests
        uses: usebruno/bruno-cli-action@v1
        with:
          working-directory: ./collections/graphql-tests
          command: run --env Staging
```

**Docker example:**

```bash
docker run --rm \
  -v $(pwd)/collections/graphql-tests:/bruno \
  -e API_TOKEN \
  usebruno/cli run --env Staging --reporter-junit results.xml
```

> Same collection works on laptop, in code review, and in CI — no drifting copy.

---

## The GraphQL Testing Checklist

- [ ] **Never trust status alone** — `200` proves arrival, not success
- [ ] **Always check `errors` array** — absent on happy paths, present + code on negatives
- [ ] **Validate shape, not just presence** — types + expected values under `data`
- [ ] **Parameterize with variables/environments** — no hardcoded IDs/URLs/secrets
- [ ] **Test mutations by side effect** — create, then read back
- [ ] **Cover error paths on purpose** — validation, execution, auth → assert `extensions.code`
- [ ] **Keep secrets out of Git** — `secret: true` vars, not committed tokens
- [ ] **Run all in CI** — version collection with code, run on every change

---

## Wrapping Up

Shift in one sentence: **test the body, not the status line.** Check `errors`, assert `data` shape, prove mutations with follow-up query, confirm graceful failures.

In Bruno: build suite as plain files in repo, run locally, hand same collection to CI — no accounts, no cloud lock-in, no drift.

> **Ready to try?** [Download Bruno](https://www.usebruno.com/downloads), point GraphQL request at public API (e.g., Rick and Morty), write your first three-layer test — real safety net in ~10 minutes.

*Related:* [API Contract Testing with Bruno](https://blog.usebruno.com/api-contract-testing-with-bruno) · [Cursor Test Generation](https://blog.usebruno.com/cursor-test-generation) · [Testing JSON Properties](https://blog.usebruno.com/working-with-json)

*Tags: opensource, bruno, CI & Automation, Tutorials, GraphQL*
