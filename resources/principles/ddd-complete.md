# Domain-Driven Design — Complete: Strategic (Bounded Context, Ubiquitous Language) + Tactical (Aggregates, Entities, Events)

*Source: https://martinfowler.com/bliki/DomainDrivenDesign.html + https://learn.microsoft.com/en-us/azure/architecture/microservices/model/tactical-domain-driven-design + https://wojciechowski.app/en/articles/clean-architecture-domain-driven-design-2025*
*Author: Martin Fowler (DDD overview), Microsoft Azure Architecture Center, Michał Wojciechowski — Apr–Nov 2025*

> DDD centers development on a rich domain model that embeds business rules and language. It divides a messy domain into **bounded contexts** each with its own precise **ubiquitous language**, then models each context with small **aggregates** (consistency boundaries) plus **entities**, **value objects**, and **domain events**. Strategic DDD draws the fences; tactical DDD builds what lives inside them. Start strategic — one global glossary and god-object aggregates are the two fastest ways to stall.

---

## Table of Contents

- [DDD in one paragraph](#ddd-in-one-paragraph)
- [Why DDD now](#why-ddd-now)
- [Strategic DDD: bounded context + ubiquitous language](#strategic-ddd-bounded-context--ubiquitous-language)
- [Bounded context in practice](#bounded-context-in-practice)
- [Ubiquitous language — within the fence, not company-wide](#ubiquitous-language--within-the-fence-not-company-wide)
- [Context mapping: how contexts talk](#context-mapping-how-contexts-talk)
- [From strategic to tactical](#from-strategic-to-tactical)
- [Tactical DDD: entities, value objects, aggregates](#tactical-ddd-entities-value-objects-aggregates)
- [Aggregate design rules](#aggregate-design-rules)
- [Repositories & domain events](#repositories--domain-events)
- [Example: drone delivery (Shipping)](#example-drone-delivery-shipping)
- [DDD × Clean Architecture](#ddd--clean-architecture)
- [When *not* to use DDD](#when-not-to-use-ddd)
- [Common mistakes](#common-mistakes)
- [Checklist](#checklist)
- [FAQ](#faq)

---

## DDD in one paragraph

> Domain-Driven Design (Eric Evans, 2003) is not a framework or library but an approach that insists engineers collaborate deeply with domain experts to grow a **ubiquitous language** and a **domain model** that lives in code, not just on paper. It classifies objects into **Entities** (identity), **Value Objects** (value, immutability), and **Aggregates** (transactional boundaries), and — most importantly — refuses a single unified model for the whole enterprise. Instead it splits the system into **bounded contexts**, each with its own valid model and language, and makes inter-context relationships explicit via **context maps** [martinfowler.com, SAP DDD curated resources].

## Why DDD now

- **Complex domains** where paper models and CRUD go stale — messy, evolving business rules dominate the cost
- **Microservices need boundaries** — “where to cut?” is answered by bounded contexts (service ≥ aggregate, ≤ bounded context) [learn.microsoft.com]
- **Parallel teams** — fences enable independent evolution without global coordination
- **Long-lived code** — a model aligned with business survives framework churn (DDD predates NestJS/React and still applies) [wojciechowski.app]

DDD is overkill for simple CRUD — you pay in workshops, language discipline, and modeling.

## Strategic DDD: bounded context + ubiquitous language

**Bounded context** = an explicit linguistic + technical boundary inside which:

- A particular domain model is valid
- Ubiquitous language terms have one precise meaning
- Code, tests, and data structures align to that model

Outside the boundary, the same word *may* mean something else. `Customer` in `Sales` (credit limit) ≠ `Customer` in `Support` (tickets). That’s a feature, not a bug.

**Problem it solves:** One global `Customer` with 120 fields “needed for reporting” becomes a god-object that no team can change safely. Split: `Sales Customer`, `Billing Customer`, each small and coherent [software-architecture-guild.com].

**Domain vs subdomain vs bounded context:**

- **Domain** — the whole problem space (e-commerce)
- **Subdomain** — a distinct area experts already name (catalog, orders, shipping, billing) — problem space, before code
- **Bounded context** — the solution-space model that *implements* a (sub)domain — where code lives. One subdomain may map to one context; sometimes one context implements two subdomains.

## Bounded context in practice

**Size:** No smaller than an aggregate, no larger than a bounded context — that’s your service/module laser sight [learn.microsoft.com]. `Delivery`, `Package`, `Drone`, `Account` each form separate aggregates; each lives in its context; none share locks across contexts.

**Where to cut?** [software-architecture-guild]:

- Start **wide** in a core subdomain where discovery is high — splitting too early makes learning expensive
- Narrow when you see persistent language conflicts or very different lifecycles for the same term
- Non-functional forces count: performance, scaling, data residency can justify a split
- Watch for coordinated changes: if one feature always edits two contexts, the fence is wrong

**Monolith vs microservices:** In a modular monolith, bounded contexts are *modules* with import fences. In microservices, each is a *service*. Strategic DDD first, deploy topology after [wojciechowski.app].

## Ubiquitous language — within the fence, not company-wide

> “Ubiquitous” is the most misread word in DDD. It’s not “everyone in the company uses the same terms.” It’s “within this bounded context, there is *no ambiguity* about what a term means.” [software-architecture-guild]

**Rules:**

- One ubiquitous language *per bounded context* — say `Sales UL`, not “company glossary”
- Every conversation names its context: “Customer *in Sales*”
- Glossary and diagrams name their context; renames happen per context, not globally
- It evolves in code *with* domain experts, via Extreme Programming-style collaboration [martinfowler.com]

**Anti-pattern — the big ball of gateway:** `account` means “bank balance” in one Python module and “user profile” in another — 40% more integration bugs [johal.in]. Fix: two contexts, two ULs, explicit anti-corruption layer between them.

## Context mapping: how contexts talk

No context is an island. Identity relationships:

| Relationship | When | Coupling |
|---|---|---|
| **Partnership** | Two contexts strongly related, teams coordinate | Tight coordination unavoidable (Orders ↔ Payments) |
| **Shared Kernel** | Small shared subset (e.g., `Money`) | Sparingly — change hits both teams |
| **Customer/Supplier** | Downstream consumes upstream’s published language | Upstream publishes, downstream conforms |
| **Conformist / Anti-corruption layer (ACL)** | Downstream translates foreign model to its own | ACL shields your context — e.g., crypto `hash` → compliance `signature` |
| **Published Language / Open Host Service** | Upstream offers stable, versioned contract | Good for platform contexts |

Map events to contexts: internal domain events stay inside; integration events cross via broker *after* the TX that raised them commits, using the same outbox/CDC pattern as `cqrs-logical-vs-physical` and `transactional-outbox-pattern` [wojciechowski.app].

## From strategic to tactical

> “It’s like city plan vs building design. Strategic DDD is bird’s-eye; tactical is inside the building.” [wojciechowski.app]

- **Strategic:** define bounded contexts, ubiquitous language, context map — the problem space → solution space fences
- **Tactical:** inside each fence, model with aggregates, entities, value objects, domain services, repositories, domain events — the code-level patterns

** Common mistake:** start with beautiful aggregates that make no business sense because no fences were drawn. Always start strategic.

## Tactical DDD: entities, value objects, aggregates

**Entity** — object with a persistent identity, even as attributes change. `Order` with `orderId`.

**Value Object** — concept defined by its *value*, not identity; immutable. `Money`, `Email`, `Address`. In TypeScript: `readonly` + `equals()` by value. Python: `@dataclass(frozen=True)`.

**Aggregate** — cluster of entities/VOs treated as a single unit. One entity is the **root** — the only entry point. Outside objects reference the root by ID, never internal children.

> `Order` *with* its `LineItems` is an aggregate; `Order` is the root. You load or save whole aggregates; transactions don’t cross aggregate boundaries [SAP DDD, learn.microsoft.com].

**Aggregate as consistency boundary:** Real-world rules like `Order.total = sum(LineItem.total)` or `Delivery requires Drone + Package` must stay consistent in one transaction. Aggregates model that scope. Cross-aggregate business process (delivery completes → invoice) uses domain events + eventual consistency, not a single distributed TX.

**Domain Service** — stateless logic that doesn’t fit inside an entity or VO but spans entities/aggregates. Example: `Scheduler` that coordinates `Delivery`, `Drone`, `Package` using availability/rules.

**Application Service** — orchestrates a use case: receive API request, call `Scheduler`, manage TX, auth, notifications. Contains *no* business logic — it delegates.

## Aggregate design rules

- **Small.** Only entities that *must* stay consistent together. `Delivery`, `Package`, `Drone`, `Account` are separate aggregates with independent life cycles — combining forces unrelated updates to compete for same locks [learn.microsoft.com]
- **Reference by identity only.** `Delivery` stores `DroneId` + `PackageId`, not object references — decoupling that maps directly to microservice boundaries
- **One transaction = one aggregate.** Don’t modify two aggregates in one TX. If a business process spans aggregates, use domain events (`DeliveryCompleted` → invoicing) with eventual consistency
- **Eventual across, immediate inside.** Inside the aggregate strong consistency; across aggregates publish `DomainEvent` *after* the state change
- **Child entities aren’t directly addressable** — `Confirmation` is a child of `Delivery`, not its own repo

## Repositories & domain events

**Repository** — collection-like abstraction for *aggregate roots only*. Domain defines `OrderRepository` interface (`save`, `findById`); infrastructure implements it (SQL, in-memory for tests). Never a repo per internal entity.

**Domain Event** — significant fact that *did* happen: `DeliveryCreated`, `DeliveryHeadedToDropoff`, `DeliveryCompleted` — not “row inserted”. Raised *after* state change, within the aggregate, before the TX commits.

**Cross-context:** internal domain events stay inside; integration events cross contexts via broker after the originating TX commits. Example: `Shipping` completes `Delivery` → publishes `DeliveryCompleted` integration event → `Accounts` invoices. Same TX + outbox discipline as EDA docs.

## Example: drone delivery (Shipping)

**Aggregates (each own life cycle):**

- `Delivery` (root `DeliveryId`) with children `Confirmation`, `Notification`
- `Package`, `Drone`, `Account` — each separate aggregate

`DeliveryTracking` events (`Created → Rescheduled → HeadedToDropoff → Completed`) + `DroneStatus` events (`in-flight`, `landed`) describe meaningful occurrences, not DB writes.

**Services:**

- `Scheduler` (domain service) — availability, windows, route optimization across aggregates
- `Supervisor` (domain service) — monitors each step for failure/timeout
- API `POST /deliveries` (application service) — receives request, calls `Scheduler`, returns

All aggregates reference each other by ID; a delivery completes without locking `Drone` or `Account`.

## DDD × Clean Architecture

```
Outer: Infrastructure (DB, brokers, frameworks)
  →  Application (use-case orchestration, TX)
    →  Domain (Entities, VOs, Aggregates, Domain Events — no tech dependencies)
```

Dependencies point inward — domain knows nothing about Postgres or Kafka.Outer layers can change (SQL → Mongo) without business logic edits [wojciechowski.app]. CQRS and Event Sourcing are *optional tactical choices* inside a bounded context when read/write divergence or audit history demands them.

## When *not* to use DDD

- Simple CRUD with one model that fits well and no divergent language
- No domain experts available — UL can’t be grown in isolation by devs
- Short-lived prototype where fences cost more than they save

For simple contexts, a layered architecture + transaction scripts is enough; DDD pays in core domains [software-architecture-guild].

## Common mistakes

- **One global UL/glossary** — pretending the whole company can share one truth → linguistic wars
- **God aggregates** — aggregate grows to match a screen, not business invariants (“one table per screen” belongs in read models, not aggregates)
- **Cross-aggregate transactions** — holding locks across aggregates → coupling and deadlocks
- **Referencing internal entities by ID from outside** — breaks encapsulation; only root IDs cross boundaries
- **Tactical first** — aggregates before fences → beautiful, meaningless models
- **Reporting inside aggregates** — use dedicated read models / reporting contexts subscribed to events, not domain table joins

## Checklist

- [ ] Core vs supporting subdomains named with domain experts (not dev-invented)
- [ ] Bounded contexts drawn with explicit language per context (`Sales UL` not “company UL”)
- [ ] Context map with relationships (partnership / customer-supplier / ACL / published language)
- [ ] Aggregates small — only together-consistent invariants inside one TX; cross-aggregate via `DomainEvent`
- [ ] Reference other aggregates by ID only
- [ ] Repository per aggregate root, domain defines port, infra adapts
- [ ] Domain events are business facts, raised after state change, integration events cross via broker after TX commit (+outbox)
- [ ] Clean Architecture dependencies point inward; domain pure, testable in ms without infra

## FAQ

**Is DDD only for microservices?** No — fences are conceptual. In a modular monolith they’re modules with import fences; in microservices they’re services. Approach works with any paradigm — Evans’s essence is strategic design, not OO [martinfowler.com].

**Entity vs Value Object?** Entity has continuity of identity (same `OrderId` even as `total` changes); VO is defined by value and immutable (`Money(12, "USD")` equals another with same value, no identity).

**What’s an anti-corruption layer?** A translation layer that protects your context’s model from a foreign context’s model — e.g., map external `hash` to internal `signature` without letting external shape leak.

**Do I need CQRS/Event Sourcing if I do DDD?** No. They’re tactical choices to add *when* a context needs them (read/write divergence or audit replay). Many contexts live well on a simple model [wojciechowski.app].

**How to start?** One bounded context at the core where volatility and discovery are highest. Define UL with experts, draw fences, model aggregates small, publish integration events via outbox. Don’t chase purity — fences that make change safe are the goal.

---

## Takeaway

Strategic DDD gives you *where* to cut (bounded contexts, per-context ubiquitous language, explicit context map). Tactical DDD gives you *how* to build inside the cut (small aggregates as consistency boundaries, entities vs value objects, domain events for cross-aggregate coordination, repositories per root). Together with Clean Architecture’s inward dependencies, they turn a big ball of mud into independent, testable, business-aligned modules — whether deployed as a modular monolith on Node/TS today or as microservices later.

*Tags: ddd, domain-driven-design, bounded-context, ubiquitous-language, context-mapping, anti-corruption-layer, aggregate, entity, value-object, domain-event, repository, strategic-design, tactical-design, clean-architecture*

