# CQRS: Logical vs Physical Separation — From Same DB to Polyglot

*Source: https://mehmetozkaya.medium.com/logical-and-physical-implementation-of-cqrs-pattern-eee9ed4a171d + https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs + https://hld.handbook.academy/curriculum/architecture-patterns/cqrs/*
*Author: Mehmet Ozkaya, Microsoft Azure Architecture Center, HLD Handbook — Sep 2024–May 2026*

> CQRS separates commands (writes) and queries (reads) into different models. **Logical** CQRS splits code paths while sharing the same database — cheap, strongly consistent, good for most apps. **Physical** CQRS splits stores (Elasticsearch, Redis, ClickHouse, read replicas) synced via outbox/CDC — independent scaling but eventual consistency, projector lag, and operational cost. Choose the level that matches real read/write divergence, apply per bounded context, and evolve — don't start at Level 4.

---

## Table of Contents

- [CQRS in one paragraph](#cqrs-in-one-paragraph)
- [CQS vs CQRS](#cqs-vs-cqrs)
- [Why separate reads and writes?](#why-separate-reads-and-writes)
- [The spectrum: Level 0 → Level 4](#the-spectrum-level-0--level-4)
- [Logical implementation — same database, dual paths](#logical-implementation--same-database-dual-paths)
- [Physical implementation — separate stores, async sync](#physical-implementation--separate-stores-async-sync)
- [Comparison table](#comparison-table)
- [Decision guide: logical or physical?](#decision-guide-logical-or-physical)
- [Per bounded context, not globally](#per-bounded-context-not-globally)
- [Sync mechanics: outbox, CDC, projector](#sync-mechanics-outbox-cdc-projector)
- [Freshness budgets & lag SLOs](#freshness-budgets--lag-slos)
- [Example: from mild to strong in steps](#example-from-mild-to-strong-in-steps)
- [Common mistakes](#common-mistakes)
- [Checklist](#checklist)
- [When *not* to use CQRS](#when-not-to-use-cqrs)
- [FAQ](#faq)

---

## CQRS in one paragraph

> **Command Query Responsibility Segregation** (CQRS) — first described by Greg Young — uses **different models to update data and to read data**. Commands mutate state through the write model (normalized, validated, transactional). Queries return DTOs/projections from the read model (denormalized, pre-joined, indexed for the view). The models can share the same database with different code/ORM paths (*logical* CQRS) or live in separate stores synced asynchronously (*physical* CQRS) [martinfowler.com/bliki/CQRS, learn.microsoft.com/azure/architecture/patterns/cqrs].

## CQS vs CQRS

| Aspect | CQS (Method-level) | CQRS (System-level) |
|---|---|---|
| **Scope** | Individual methods — a method is either a command *or* a query, not both [Bertrand Meyer] | Entire bounded context / service |
| **Data model** | Single unified model | Separate read & write models |
| **Data store** | Single DB | Potentially separate DBs / engines |
| **Consistency** | Immediate (same transaction) | Same DB → strong; separate stores → eventual |
| **Complexity** | Low — design guideline | High — architectural pattern |
| **Use case** | Code cleanliness | Scale / read-write shape divergence |

> CQRS pushes Meyer's CQS from methods to whole models — and sometimes whole stores [hld.handbook.academy].

## Why separate reads and writes?

- **Different shapes.** Write model wants normalization, FKs, invariants, aggregates. Read model wants denormalization, materialized joins, and indexes tuned to access patterns. One schema hurts both [hld.handbook].
- **Different scale.** Most systems are read-heavy (10:1 → 1000:1). Separate stores let reads scale horizontally without locking writes [azure].
- **Different ops.** Writes need validation, business rules, transactions. Reads need DTOs without domain logic — fast, cacheable [azure].
- **Team autonomy.** Command team owns invariants; query team owns projections.

But separation has a cost: dual models, sync lag, projector recovery, and “twice the code for same feature” if applied blindly [martinfowler.com].

## The spectrum: Level 0 → Level 4

No binary — CQRS is a spectrum. Most successful systems evolve through it [onenoughtone.com, hld.handbook]:

**Level 0 — Traditional CRUD**

Single model, single store, CRUD. `GET /users` and `POST /users` hit same entity/ORM.

- *Consistency*: strong
- *Scale*: none beyond DB vertical scaling
- *When*: simple CRUD, no divergence

**Level 1 — Logical Split (Recommended start)**

Same database, separate code paths: distinct command handlers / query handlers, different DTOs/entities, separate repositories — still same transaction, no async.

- *Consistency*: strong (same TX)
- *Complexity*: low — no infra
- *When*: growing app wants cleaner code without ops cost

```
Client → Router → CommandService → WriteRepo \          (same Postgres)
                                 ↗ same DB Engine
Client → Router → QueryService  → ReadRepo  /  (different SQL/views/DTOs)
```

**Level 2 — Read Replicas**

Writes → primary, reads → replicas. Same schema, physically separate for read scale.

- *Consistency*: near-immediate (replica lag ~ms)
- *When*: read-heavy, but query shapes still fit main schema

**Level 3 — Separate Read Models (Same engine)**

Writes → canonical tables; background projector builds denormalized read tables (same Postgres/DB engine, different schemas).

- *Consistency*: eventual (projection lag)
- *When*: complex queries, dashboards, search pressure on OLTP

**Level 4 — Polyglot (Full Physical)**

Writes → Postgres/DynamoDB; reads → Elasticsearch (search), Redis (cache), ClickHouse (analytics) via CDC/outbox → Kafka → projectors.

- *Consistency*: eventual, per-store lag budgets
- *When*: large-scale, 100:1+ read/write, multiple specialized read formats

> GitHub's “schema-domain” sharding — grouping tables by logical domain (repos, issues, users) into separate MySQL clusters with ProxySQL routing — is mild CQRS at the *infrastructure* layer, serving **5.5M queries/s across 1,200+ hosts** without a full broker stack [hld.handbook].

## Logical implementation — same database, dual paths

**Idea:** separate commands/queries at code level, not DB level.

> “Both lists would be in the same notebook” — but with separate tabs for tasks vs RSVPs [mehmetozkaya].

**How:**

- `CommandHandler`: loads `Aggregate`, enforces invariants, persists via write repository
- `QueryHandler` / `QueryService`: bypasses domain, returns DTOs via raw SQL/views or lightweight ORM projection
- Same TX, same connection budget — no event bus

**Example (TypeScript/Node):**

```ts
// Write side — authoritative
class CreateOrderHandler {
  async handle(cmd: CreateOrderCmd) {
    const agg = OrderAggregate.create(cmd);
    await writeRepo.save(agg);               // normalized, transactional
    // no direct read-store write — read side is separate query
  }
}

// Read side — optimized for view
class ListOrdersQuery {
  async handle(q: ListOrdersQ): Promise<OrderListDTO[]> {
    // denormalized view, no domain loading, fast
    return readDb.query(
      `SELECT id, total, customer_name, status FROM order_list_view WHERE customer_id=$1`,
      [q.customerId]
    );
  }
}
```

**Pros:** strong consistency, no broker, no replay, cheap to adopt.

**Cons:** still shares I/O, buffer pool, locks — won't save a DB crushed by reads.

> Start here. Move up only when *performance data* justifies it [onenoughtone].

## Physical implementation — separate stores, async sync

**Idea:** reads & writes use different specialized databases; writes publish events, projectors build read views.

> “One notebook for tasks, one for RSVPs, each in a different location” [mehmetozkaya].

**How:**

1. API Gateway routes commands → `CommandService`
2. Write commits to transactional store + outbox row in *same* TX
3. Relay (Debezium / outbox publisher) → Kafka
4. Projector(s) consume, checkpoint, materialize read stores (one per consumer)
5. Query API serves pre-built projections; response exposes lag if needed

```
Client → Command API → Write Store (Postgres)
                     ↘ Outbox → Kafka → Projector → Elasticsearch / Redis / ClickHouse → Query API → Client
```

**Stores per purpose:** Postgres (truth) → Elasticsearch (search), Redis (session/timeline), ClickHouse (analytics). Each projector owns its offset and can replay from 0 after fixing a bug [abstractalgorithms.dev].

**Pros:** independent scaling, per-store engine choice, multiple read shapes, failure isolation.

**Cons:**

- Eventual consistency — queries may be stale seconds/minutes
- Operational overhead — broker, projectors, lag monitoring, replay runbooks
- Dual-write trap if you publish before commit — use transactional outbox

## Comparison table

| Level | Complexity | Consistency | Scaling | Best for |
|---|---|---|---|---|
| 0 Traditional | Lowest | Strong | None | Simple CRUD |
| 1 Logical split | Low | Strong | Code clarity | Default first step where shapes diverge |
| 2 Read replicas | Medium | Near-immediate | Read scaling | Read-heavy, same schema |
| 3 Separate models (same engine) | High | Eventual | Query optimization | Complex query patterns |
| 4 Polyglot | Highest | Eventual | Max flexibility | 100:1+ read asymmetry, search/reporting crushing OLTP |

Adapted from [onenoughtone] & [hld.handbook].

## Decision guide: logical or physical?

**Choose Logical (Level 1) when:**

- Domain logic is complex but DB load is modest
- You want cleaner code without broker/replay
- Strong consistency is a product requirement (no stale reads)
- Team cannot yet operate lag SLOs / replay recovery

**Choose Physical (Level 3–4) when:**

- Read replicas still can't keep up; 47-table JOINs serve dashboard; `p95 4s` on reads while writes stall on locks [abstractalgorithms]
- Search, timelines, analytics need denormalized views you can't afford to build on OLTP
- Different teams own different read workloads with independent SLOs
- You can define per-surface freshness budgets (e.g., search: 5s, billing: 0s → stays on write store)

**Heuristic:** If you can't articulate why *this bounded context's* read and write shapes differ, you don't need CQRS there [Greg Young].

## Per bounded context, not globally

> “CQRS is not an architecture” but “an architectural pattern that describes something inside a single system or component” — Greg Young [hld.handbook].

Apply per bounded context (e.g., `Orders` needs CQRS, `Users` stays CRUD). Teams that split the whole app globally end with twice the code, no scaling benefit.

## Sync mechanics: outbox, CDC, projector

**Three durable markers you need [abstractalgorithms]:**

1. **Source commit version / event ID** — monotonic version returned with write ack
2. **Per-projection checkpoint** — last event ID the projector applied (resumable)
3. **Freshness budget** — product-defined SLO per read surface (not a global topic lag)

**Two safe ways to bridge write → bus atomically:**

- **Transactional outbox:** `BEGIN; INSERT order; INSERT outbox(event); COMMIT;` — relay polls outbox and publishes, consumer is idempotent
- **CDC (Debezium):** tail Postgres WAL → publish change records — no app code change, same atomicity guarantee

> Never publish to the bus *before* the DB commit, and never dual-write read stores in the request path — both create “two truths” on retry/timeout [abstractalgorithms].

**Projector rules:**

- Idempotent, versioned event handlers
- Ordered per aggregate/key
- Quarantine + replay plan for bad events/schema changes

## Freshness budgets & lag SLOs

Don't measure “global Kafka lag.” Measure **per read surface**.

| Surface | Budget | If exceeded |
|---|---|---|
| Billing balance | 0s — must read from write store | Incident |
| Order detail | 2–5s | Show “updating…” |
| Search / timeline | 30–60s | Accept stale, expose `updated_at` |

Alert on **per-projection lag**, not topic lag. Each projector tracks its own watermark [abstractalgorithms].

## Example: from mild to strong in steps

**v1 — Mild (Level 1) same DB:**

`Orders` write via `OrderAggregate`, reads via `order_list_view` SQL view — same Postgres, no async, strong consistency.

**v2 — Read pressure grows, add Level 2:**

Primary `orders_primary`, replicas `orders_replica` via `ProxySQL`. `freno` throttles bulk writes to keep lag < 500ms [hld.handbook].

**v3 — Dashboard JOINs still heavy, add Level 3:**

New `order_summary_denorm` table, populated by in-DB trigger/worker from committed events — still same engine, eventual ~1s.

**v4 — Search needs Elasticsearch, add Level 4:**

Debezium tails WAL → Kafka `orders.events` → Flink projector → `orders_search` index. Rebuild by replaying from offset 0. Freshness SLO 5s for search, 0s for billing (bypass CQRS, read from write store).

Each step was triggered by *data*, not dogma.

## Common mistakes

- **Applying CQRS globally** — twice the code everywhere, no wins
- **Starting at Level 4** — pay highest complexity before proving Level 1 insufficient
- **Dual-write in request path** — request writes DB + read store directly → silent divergence on retry
- **No per-surface freshness SLO** — arguments about “is stale a bug?” have no threshold
- **Projection without owner/replay runbook** — sprawl of views no one can rebuild → operational debt
- **Letting queries bypass validation** — queries must never invent state; write side stays sole authority

## Checklist

- [ ] Identified the bounded context where read/write shapes *genuinely* diverge (not CRUD)
- [ ] Started at Level 1 (same DB, dual paths) and measured I/O, JOIN cost, lock contention
- [ ] Defined freshness budget per read surface (0s / 5s / 60s)
- [ ] Chosen sync: outbox or CDC (not dual-write), consumers idempotent & versioned
- [ ] Each projection has owner, checkpoint, lag SLO, and `replay from 0` runbook
- [ ] Read stores are derivative — no business logic, no write authority there
- [ ] Monitor per-projection lag, not just broker lag
- [ ] Document when you'd *rollback* to Level 1 if complexity outweighs gains

## When *not* to use CQRS

- Reads are simple CRUD and must be immediately consistent (billing balance, auth)
- No read/write asymmetry and no diverging models — single schema fits well [martinfowler.com]
- Team cannot yet operate replay, checkpoint recovery, or lag monitoring

> Consider `ReportingDatabase` pattern first — offload only the heavy queries, keep most reads on the main model [martinfowler.com].

## FAQ

**Logical vs physical — which should I start with?** Logical (Level 1). It gives cleaner code with no broker, no eventual consistency. Move to physical only when metrics justify it [onenoughtone].

**Do I need event sourcing if I use CQRS?** No. Most production CQRS uses a relational write store + CDC/outbox to feed projections. Event sourcing adds history/replay but maximal complexity — only if audit/rebuild needs demand it [hld.handbook].

**What does “CQRS is not an architecture” mean?** It's a pattern inside a bounded context/component, not a system-wide style. Apply surgically [Greg Young].

**How does GitHub scale reads without full CQRS?** Domain-aligned sharding + replica routing per schema domain — mild CQRS at the routing layer, not a full event bus [hld.handbook].

**Can I mix levels?** Yes — `Orders` at Level 4, `Users` at Level 0 is normal and healthy.

---

## Takeaway

CQRS is a **spectrum**, not a switch. Logical separation (same DB, different paths) is cheap, strongly consistent, and the right default where domain complexity justifies it. Physical separation (different engines, async projections) buys independent scaling and specialized read shapes at the cost of eventual consistency and operational discipline (outbox/CDC, checkpoints, freshness SLOs, replay). Apply **per bounded context**, define **per-surface lag budgets**, and **evolve** through levels when data demands it — don't start polyglot.

*Tags: cqrs, cqs, logical-vs-physical, eventual-consistency, outbox, cdc, projector, freshness-slo, ddd, bounded-context, read-model, write-model*

