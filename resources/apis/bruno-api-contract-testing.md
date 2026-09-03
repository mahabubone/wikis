# API Contract Testing with Bruno: Catch Breaking Changes

*Source: https://blog.usebruno.com/api-contract-testing-with-bruno*
*Author: Anthony Dombrowski — Jun 29, 2026 · 18 min read*

> APIs rarely break obviously. The server is still running, the endpoint returns 200 OK, and dashboards stay green — then a frontend page fails, a mobile app crashes, or a partner integration throws errors. The contract changed. Bruno turns those consumer expectations into repeatable, executable checks that live alongside your collection and run in CI before changes reach production.

---

## Table of Contents

- [What is API contract testing?](#what-is-api-contract-testing)
- [Why it matters](#why-api-contract-testing-matters)
- [Why status code tests are not enough](#why-status-code-tests-are-not-enough)
- [What should contract tests check?](#what-should-api-contract-tests-check)
- [How Bruno helps](#how-bruno-helps-with-api-contract-testing)
- [Step 1: Start with your API contract](#step-1-start-with-your-api-contract)
- [Step 2: Prioritize consumer-critical workflows](#step-2-prioritize-consumer-critical-workflows)
- [Step 3: Assertions for response shape](#step-3-add-bruno-assertions-and-tests-for-response-shape)
- [Step 4: Test error contracts](#step-4-test-api-error-contracts)
- [Step 5: Validate headers, pagination, metadata](#step-5-validate-headers-pagination-and-metadata)
- [Step 6: Use environments to test safely](#step-6-use-bruno-environments-for-safe-contract-testing)
- [Step 7: Run in CI with Bruno CLI](#step-7-run-api-contract-tests-in-ci-with-bruno-cli)
- [Handling intentional breaking changes](#handling-intentional-breaking-api-changes)
- [Common mistakes](#common-api-contract-testing-mistakes)
- [Collection structure](#suggested-bruno-collection-structure)
- [Checklist & FAQ](#api-contract-testing-checklist)

---

## Quick Answer

API contract testing verifies that an API continues to follow the agreement its consumers depend on: endpoints, request formats, response shapes, required fields, status codes, headers, error formats, and authentication behavior. Bruno makes that agreement **executable** — save requests, add assertions/tests, organize collections, version in Git, and run automatically via `bru` CLI.

---

## What is API contract testing?

An API contract is the agreement between provider and consumer:

- Available endpoints & HTTP methods
- Required parameters & request body structure
- Response body structure & status codes
- Error formats & headers
- Authentication & pagination behavior
- Field types and naming conventions

Example `GET /users/{id}` expected:

```json
{
  "id": "user_123",
  "email": "alex@example.com",
  "created_at": "2026-06-29T12:00:00Z"
}
```

If a change removes `created_at`, renames `email` → `emailAddress`, or changes `id` string → number, the endpoint may still return `200 OK` but the contract is broken.

Contract test makes it explicit:

```js
test("returns the expected user contract", function () {
  const body = res.getBody();
  expect(res.getStatus()).to.equal(200);
  expect(body).to.have.property("id");
  expect(body).to.have.property("email");
  expect(body).to.have.property("created_at");
  expect(body.id).to.be.a("string");
});
```

### Assertions vs Tests in Bruno

Bruno gives two complementary ways to validate — use both:

**Assertions** — declarative, no-code checks in the *Assert* tab. Saved as `runtime.assertions` (Bruno YAML, default since v3.1). Ideal for single-value guarantees:

```yaml
runtime:
  assertions:
    - expression: res.status
      operator: eq
      value: "200"
    - expression: res.body.id
      operator: isString
    - expression: res.body.email
      operator: isString
```

**Tests** — JavaScript in the *Tests* tab using `test()` + Chai `expect(...).to.be...`. Gives you loops, conditionals, and grouping several checks under one named result.

| Reach for an **assertion** when | Reach for a **test** when |
|---|---|
| Checking a single value (status, one field type, leaf via path) | Need to loop/conditionally check items (e.g., every entry in array) |
| Want readable no-code check | Need logic — only assert when array non-empty |
| Few independent checks are enough | Want several related checks grouped under one name |

Common pattern: **assertions for simple guarantees, tests for structural logic**. Both run together and both fail CI if broken.

---

## Why API contract testing matters

APIs often break quietly — service healthy, deployment green, but:

- Frontend cannot render (field disappeared)
- Mobile app crashes (type changed)
- SDK breaks (error shape changed)
- Partner integration fails (pagination metadata changed)
- Internal service retries incorrectly (rate-limit headers gone)

Contract tests catch those before users/partners discover them.

---

## Why status code tests are not enough

```js
test("returns 200", function () {
  expect(res.getStatus()).to.equal(200);
});
```

An API can return `200` and still break consumers:

- Required field disappeared / renamed (`id` → `userId`, `email` → `emailAddress`)
- Type changed, date format changed, array → object
- Pagination/headers removed

> Status check says “endpoint responded fine.” Contract check says “responded with the exact structure consumers expect.”

---

## What should API contract tests check?

| Contract area | What to verify |
|---|---|
| Status codes | Expected success & failure codes |
| Required fields | Fields consumers depend on are present |
| Field types | Strings stay strings, arrays stay arrays |
| Response shape | Object nesting remains stable |
| Headers | Content-Type, X-Request-ID, caching, rate-limit |
| Error format | Validation/auth/permission errors predictable |
| Pagination | Cursors, limits, totals, next-page consistent |
| Authentication | Missing/invalid/insufficient creds behave correctly |

> Only verify fields/behavior that would break a consumer if changed — not every field.

---

## How Bruno helps with API contract testing

- Import or create requests, add assertions for status/body/headers/types
- Test success *and* failure responses
- Use environments for local/staging/production-read-only
- Store collections in Git with project
- Run automatically with **Bruno CLI** (`bru`)

---

## Step 1: Start with your API contract

**From OpenAPI spec (most common):**

1. Import OpenAPI spec into Bruno → generates requests
2. Send against local/dev/staging
3. Add assertions for consumer-critical behavior
4. Save as part of collection
5. Run before releasing changes

Pick the lightest tool: lightweight **assertions** for single-value checks; graduate to **tests** when need logic/loops/grouping. Starting from existing Bruno collection: identify most important requests and add contract assertions.

You can also AI-generate a Bruno collection + tests.

> Goal: move from “this request works when I click Send” → “this request verifies behavior consumers depend on.”

## Step 2: Prioritize consumer-critical workflows

Not every endpoint needs same coverage. Prioritize where breakage hurts:

- Powers production user flows / external customers / partner integrations / internal services
- Handles billing, account state, auth/permissions
- Returns complex nested data, has broken before, hard to roll back

**By resource:**

```
API Contract Tests
├── Auth
├── Users
├── Organizations
├── Billing
├── Projects
└── Error Handling
```

**Better — by workflow (consumers use flows, not single endpoints):**

```
API Contract Tests
├── Create Account Flow
├── Invite Team Member Flow
├── Upgrade Plan Flow
├── Generate Report Flow
└── Delete Resource Flow
```

Workflow flows chain requests (create → fetch via ID) and need **tests** to capture `bru.setVar()`:

```js
test("create returns an id we can reuse downstream", function () {
  const body = res.getBody();
  expect(res.getStatus()).to.equal(201);
  expect(body).to.have.property("id");
  bru.setVar("createdUserId", body.id);
});
```

Later step: `{{createdUserId}}` or `bru.getEnvVar("userId")`. Use plain **assertions** for simple single-value checks inside each step.

## Step 3: Add Bruno assertions and tests for response shape

Most failures are response-body shape: rename, move, type change, array empty.

**Start with fields consumers rely on — independent checks = assertions:**

```yaml
runtime:
  assertions:
    - expression: res.status
      operator: eq
      value: "200"
    - expression: res.body.id
      operator: isString
    - expression: res.body.email
      operator: isString
    - expression: res.body.created_at
      operator: isString
```

Same as single test (grouped report):

```js
test("returns required user fields", function () {
  const body = res.getBody();
  expect(res.getStatus()).to.equal(200);
  expect(body).to.have.property("id");
  expect(body).to.have.property("email");
  expect(body).to.have.property("created_at");
  expect(body.id).to.be.a("string");
});
```

**Arrays — must use test (need conditional guard):**

```yaml
runtime:
  assertions:
    - expression: res.body.users
      operator: isArray
```

```js
test("returns a list of users", function () {
  const body = res.getBody();
  expect(res.getStatus()).to.equal(200);
  expect(body.users).to.be.an("array");
  if (body.users.length > 0) {
    expect(body.users[0]).to.have.property("id");
    expect(body.users[0].id).to.be.a("string");
  }
});
```

**Nested objects — either:**

```yaml
runtime:
  assertions:
    - expression: res.body.organization.id
      operator: isString
    - expression: res.body.organization.name
      operator: isString
```

Or grouped test:

```js
test("returns organization details", function () {
  const body = res.getBody();
  expect(body).to.have.property("organization");
  expect(body.organization).to.have.property("id");
  expect(body.organization.id).to.be.a("string");
});
```

## Step 4: Test API error contracts

Error responses power form validation, retry logic, auth refresh, UX messages, debugging.

Vague:

```json
{ "error": "Invalid request" }
```

Structured:

```json
{
  "error": {
    "code": "missing_required_field",
    "message": "Email is required.",
    "field": "email",
    "request_id": "req_123"
  }
}
```

Quick pin with **assertions:**

```yaml
runtime:
  assertions:
    - expression: res.status
      operator: eq
      value: "400"
    - expression: res.body.error.code
      operator: eq
      value: missing_required_field
    - expression: res.body.error.field
      operator: eq
      value: email
```

Whole-object shape as **test:**

```js
test("returns structured validation error", function () {
  const body = res.getBody();
  expect(res.getStatus()).to.equal(400);
  expect(body).to.have.property("error");
  expect(body.error).to.have.property("code");
  expect(body.error.code).to.equal("missing_required_field");
});
```

**Add negative cases:** missing required fields, invalid types/enum, missing/expired token, insufficient permissions, 404, duplicate creation, rate-limit, malformed JSON. For contract testing, failure paths *are* the contract.

## Step 5: Validate headers, pagination, and metadata

Headers (flat single values) → cleanest as **assertions:**

```yaml
runtime:
  assertions:
    - expression: res.headers['content-type']
      operator: contains
      value: application/json
```

Check also: `Cache-Control`, `ETag`, `Retry-After`, `X-RateLimit-Limit/Remaining`, `X-Request-ID`.

Pagination (nested set) — group in **test:**

```js
test("returns pagination metadata", function () {
  const body = res.getBody();
  expect(body).to.have.property("data");
  expect(body).to.have.property("pagination");
  expect(body.pagination).to.have.property("next_cursor");
  expect(body.pagination).to.have.property("limit");
  expect(body.data).to.be.an("array");
});
```

## Step 6: Use Bruno environments for safe contract testing

Run against `Local → Development → Staging → Production Read-Only`. Keep production read-only unless workflow is intentionally safe.

Requests stay portable via variables: `{{baseUrl}}/users/{{userId}}`

Environment file (`environments/Staging.bru` — YAML since v3.1):

```yaml
name: Staging
variables:
  - name: baseUrl
    value: https://staging-api.example.internal
    enabled: true
    secret: false
    type: text
  - name: userId
    value: user_123
    enabled: true
    secret: false
    type: text
  - name: authToken
    value: ""
    enabled: true
    secret: true
    type: text
```

`secret: true` vars stored securely, never in Git. Both assertions (`{{var}}`) and tests (`bru.getEnvVar("userId")`) interpolate.

## Step 7: Run API contract tests in CI with Bruno CLI

Workflow:

1. PR opened → 2. API deployed to preview/staging → 3. `bru` runs collection → 4. CI fails on break → 5. Fix or intentionally update contract

Bruno CLI runs **assertions + tests together** — failure in either fails run.

**GitHub Action (official `usebruno/bruno-cli-action`):**

```yaml
name: API Contract Tests
on:
  pull_request:
    branches: [main]
jobs:
  contract-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run contract tests
        uses: usebruno/bruno-cli-action@v1
        with:
          working-directory: ./collections/contract-tests
          command: run --env Staging
```

With secrets:

```yaml
- name: Run contract tests
  uses: usebruno/bruno-cli-action@v1
  with:
    working-directory: ./collections/contract-tests
    command: >-
      run --env Staging
      --env-var API_TOKEN=${{ secrets.API_TOKEN }}
      --env-var BASE_URL=${{ secrets.BASE_URL }}
```

**Non-GitHub (Docker — `usebruno/cli`):**

```bash
docker run --rm \
  -v $(pwd)/collections/contract-tests:/bruno \
  -e API_TOKEN \
  usebruno/cli run --env Staging --reporter-junit results.xml
```

Pin tag `usebruno/cli:3.3.0` for reproducibility.

> CLI commands: `bru run --env Staging`, `bru run --env-var KEY=val`, `--reporter-junit`, versioned via action/docker.

---

## Handling intentional breaking API changes

Not every failure is accidental — sometimes contract *should* change (field removal, rename, new error format, major version). Make breaks **intentional, visible, communicated**:

- Did we mean to change this?
- Which consumers depend on old behavior? Backward compatible?
- Need new API version / deprecation period / dual-field transition?
- Docs/examples updated?

Transition example — support both:

```json
{
  "id": "user_123",
  "email": "alex@example.com",
  "created_at": "2026-06-29T12:00:00Z",
  "createdAt": "2026-06-29T12:00:00Z"
}
```

Tests verify both until migrated. Goal is not to prevent change, but prevent *accidental* breakage.

---

## Common API contract testing mistakes

- **Only checking status codes** — test shape, types, headers, errors too
- **Only happy paths** — failure paths are contract (validation, auth 401/403, 404, 429)
- **Testing unstable data** — avoid `expect(body.updated_at).to.equal("2026-...")`; prefer `to.be.a("string")` + regex `/^\d{4}-\d{2}/`
- **Ignoring pagination** — test metadata + empty pages
- **Ignoring errors** — where contracts drift most
- **Forgetting CI** — manual helpful, automated safety net better
- **Treating every failure as noise** — failure = either broken API or intentional contract change (both signals)

---

## Suggested Bruno collection structure

```
API Contract Tests
├── 01 Health & Version
│   ├── GET API health
│   └── GET API version
├── 02 Auth
│   ├── Missing token
│   ├── Invalid token
│   └── Valid token
├── 03 Users
│   ├── List users
│   ├── Get user
│   ├── Create user
│   └── Invalid create user
├── 04 Organizations
│   ├── List organizations
│   ├── Get organization
│   └── Missing organization
├── 05 Pagination
│   ├── Default pagination
│   └── Cursor pagination
├── 06 Error Format
│   ├── Validation error
│   ├── Not found error
│   └── Permission error
└── 07 Breaking Change Checks
    ├── Required fields
    ├── Deprecated fields
    └── Response shape
```

Start with **one critical workflow**, add assertions for fields that matter + 1-2 negative tests, expand over time. Best setup = one team will maintain.

---

## API contract testing checklist

- [ ] Test critical API workflows
- [ ] Check response shape, not just status
- [ ] Assert required fields
- [ ] Assert important field types
- [ ] Test validation errors
- [ ] Test auth/permission failures
- [ ] Validate pagination
- [ ] Validate important headers
- [ ] Use stable test data
- [ ] Run against local/preview/staging
- [ ] Run automatically in CI
- [ ] Document/version intentional breaks

## FAQ

**What is API contract testing?** Checks whether API still follows agreement: request formats, response fields, status, headers, auth, error formats, pagination.

**Contract vs integration testing?** Contract = does API follow interface; Integration = do multiple systems work together. Contract is narrower, catches breaking changes.

**Can Bruno be used?** Yes — requests + assertions/tests + collections + environments + `bru` CLI for local/CI (REST & GraphQL).

**What should test check?** Required fields, types, shape, status, headers, error formats, pagination, auth.

**Are status codes enough?** No — need body, field names/types, headers, errors.

**Should run in CI?** Yes — catches breaks in PR/release before production.

---

## Takeaway

APIs can be “up” yet broken — `200 OK` with missing field, changed error format, or shifted pagination can break frontends/SDKs/integrations. Bruno defines expectations as real requests, adds assertions/tests for consumer-critical behavior, organizes by workflow, uses environments safely, and runs same collection in CI via `bru`. 

> **Next step:** Create a Bruno collection for one critical workflow, add assertions for fields consumers depend on, run locally, then wire into CI.

*Tags: opensource, bruno, openapi, docker, github action, automation, ci, cli, contract, testing*
