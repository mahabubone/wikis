# Event-Driven Architecture: Principles & When to Use It

*Source: https://wojciechowski.app/en/articles/event-driven-architecture-patterns-2025 + https://microservices.io/patterns/data/saga.html*
*Author: Michał Wojciechowski, Chris Richardson — Nov 2025*

> Event-Driven Architecture (EDA) replaces direct request–response calls with events — facts like `OrderPlaced` that producers emit and consumers react to independently. This gives loose coupling, parallel work, and resilience, but trades immediate consistency for eventual consistency and requires durable messaging. Use EDA when workflows span services, scale asymmetrically, or need extensibility without coupling callers to callees.

---

## Table of Contents

- [What is an event?](#what-is-an-event)
- [Request-Response vs Event-Driven](#request-response-vs-event-driven)
- [Core principles of EDA](#core-principles-of-eda)
- [Building blocks](#building-blocks)
- [Message brokers: Kafka, RabbitMQ, SQS compared](#message-brokers-kafka-rabbitmq-sqs-compared)
- [EDA patterns you’ll meet](#eda-patterns-youll-meet)
- [When EDA pays off](#when-eda-pays-off)
- [When *not* to use EDA](#when-not-to-use-eda)
- [Consistency & failure mental model](#consistency--failure-mental-model)
- [Observability & versioning](#observability--versioning)
- [Example: order → payment → inventory](#example-order--payment--inventory)
- [Common mistakes](#common-mistakes)
- [Checklist](#checklist)
- [FAQ](#faq)

---

## What is an event?

An **event** is an immutable fact about something that happened, with a type, timestamp, correlation ID, and payload:

```json
{
  "type": "OrderPlaced",
  "id": "evt_7f3a",
  "time": "2026-09-04T09:00:00Z",
  "correlationId": "order_123",
  "payload": { "orderId": "order_123", "customerId": "cust_9", "amount": 14900 }
}
```

Producers don’t know who consumes the event. Consumers subscribe to types they care about. The contract is the *event schema* (Avro/JSON) plus durable delivery, not a synchronous API.

## Request-Response vs Event-Driven

| Aspect | Request-Response (sync) | Event-Driven (async) |
|---|---|---|
| **Coupling** | Tight — caller knows callee endpoint | Loose — producer knows event type, not consumers |
| **Synchronicity** | Blocking — caller waits | Non-blocking — producer continues, consumers parallelize |
| **Scalability** | Limited by caller wait | High — partitioned consumers scale independently |
| **Resilience** | Cascade failures if callee down | Isolated — events queue, retries, DLQ |
| **Extensibility** | New consumer needs caller change | New consumer subscribes, no producer change |
| **Consistency** | Immediate (if single DB) | Eventual across services |

> Add a new analytics consumer to `OrderPlaced` without touching `OrderService` — just subscribe. In sync HTTP you’d add a call and redeploy the producer.

## Core principles of EDA

**1. Event as first-class contract**

Treat events like public APIs: versioned, documented, backward-compatible, with schema registry (Avro). Changing `amount: number` → `amount: { value, currency }` is a breaking change — dual-publish or new type `OrderPlacedV2`.

**2. Producer doesn’t know consumers**

Loose coupling means producers emit domain events (`OrderPlaced`, `PaymentCaptured`) not commands aimed at a specific consumer (`NotifyInventoryService`). Consumers decide what to do.

**3. At-least-once + idempotency**

Brokers guarantee **at-least-once** (redelivery on failure). Consumers must be **idempotent** — same `evt_7f3a` processed twice leaves same state. Use idempotency keys + deduplication table in same TX as business state.

**4. Durable publication**

State change and event publish must be atomic — otherwise the event is lost or the DB change rolls back while the event already fired. Solutions: transactional outbox or CDC (next doc).

**5. Explicit causality**

Carry `correlationId`, `causationId`, and trace baggage through events. “What triggered this `ShipmentCreated`?” must be answerable without log archaeology.

## Building blocks

- **Producer** — service that commits a local transaction and emits a domain event
- **Broker / Log** — durable transport (Kafka = log/replay, RabbitMQ = queue/routing, SQS = queue)
- **Consumer / Projection** — idempotent handler that materializes a read model, triggers next step, or feeds downstream
- **Schema Registry** — Avro/JSON Schema for event evolution
- **Consumer group** — partitioned parallel handlers for a type, each tracks offset

```
Producer → [commit + outbox →] Broker Topic (OrderPlaced)
                                         ├─→ InventoryConsumer → InventoryReserved
                                         ├─→ AnalyticsProjection → ClickHouse
                                         └─→ NotificationConsumer → EmailQueued
```

## Message brokers: Kafka, RabbitMQ, SQS compared

| Broker | Model | Strength | Tradeoff |
|---|---|---|---|
| **Apache Kafka** | Distributed log, partitions, replay, retention days–months | High throughput, replay from offset 0, CDC with Debezium, exactly-once-ish with idempotent producer | Operational complexity, topic/partition tuning, no per-message ACK in single queue sense |
| **RabbitMQ** | Exchange → queue → consumer, routing keys | Flexible routing, per-message ACK, DLQ, easy ops for modest scale | Not a log — no replay after ack, limited retention |
| **AWS SQS / Azure Service Bus** | Managed queue | No ops, DLQ native, visibility timeout | Less control, no ordering guarantees (SQS standard), no replay |

**Rule of thumb [wojciechowski.app]:** Kafka for event *streaming* and high-throughput replay; RabbitMQ for routing-heavy RPC-style async; SQS/Service Bus for managed queues with minimal ops.

## EDA patterns you’ll meet

- **Event Sourcing** — store state as append-only log of events, rebuild aggregates by folding. Gives history/replay, but maximal complexity.
- **CQRS** — separate read/write models; often fed by EDA (our previous `cqrs-logical-vs-physical.md`).
- **Saga** — sequence of local transactions with compensations (choreography vs orchestration — see next docs).
- **Outbox / CDC** — make publish atomic (next doc `transactional-outbox-pattern.md`).

They compose: *EDA* is the transport, *Saga* is the protocol for distributed transactions, *Outbox* is the safe publication.

## When EDA pays off

- **Workflows span services** — order → payment → inventory → shipping → notification can’t fit in one ACID TX
- **Read/write shapes or scale diverge** — search, timeline, analytics need denormalized views you don’t want on OLTP
- **Extensibility matters** — you add consumers (fraud, recommendations) without touching producers
- **Isolation needed** — payment outage shouldn’t block inventory reads

Example: e-commerce order placement where dashboards, search, and analytics all need different views of the same order — EDA fans one write into many projections.

## When *not* to use EDA

- **Single service / single DB with ACID** — synchronous call is simpler, strongly consistent
- **No eventual consistency tolerance** — billing balance must be 0-lag; keep on write store
- **Team lacks idempotency, tracing, replay, DLQ, schema governance** — choreography without these is a gamble [NILUS]
- **Process is tiny and won’t change** — direct chain may be clearer than events

> If you can’t yet operate replay and DLQ recovery, prefer explicit orchestration in the critical path [NILUS].

## Consistency & failure mental model

- **Eventual, not immediate.** After `OrderPlaced`, queries may be stale seconds. Define per-surface freshness budgets (search 30s ok, billing 0s).
- **No global lock.** Each step commits locally; failures are handled by compensating transactions (refund, release) or forward recovery (retry, alternate path).
- **Idempotency is non-negotiable.** Every consumer must handle redelivery: `INSERT … ON CONFLICT DO NOTHING` + dedup key `evt_7f3a`.
- **Dead-letter handling.** Park poison events after N attempts, alert, provide replay tool.

## Observability & versioning

- **Correlation:** `correlationId` (order_123) + `causationId` (evt_7f3a) + OpenTelemetry baggage through every event.
- **Instance view:** For sagas, materialize a read model of saga progress (even if choreographed) once you need “where is order_123?”.
- **Versioning:** Add new event type for breaking payload change, dual-publish old+new until consumers migrate, never edit a committed event’s shape.

## Example: order → payment → inventory

**Synchronous** (brittle):

`POST /orders` → OrderService → sync call InventoryService → sync call PaymentService → if payment fails, try to rollback inventory via sync call → timeout → inconsistent.

**Event-driven (choreographed) with outbox:**

1. `OrderService` TX: `INSERT orders (pending)` + `INSERT outbox (OrderPlaced evt_7f3a)` — atomic
2. Relay publishes `OrderPlaced` → Kafka
3. `InventoryService` consumes `OrderPlaced`, TX: `reserve stock WHERE sku=...` + `INSERT outbox (InventoryReserved)` — idempotent on `evt_7f3a`
4. `PaymentService` consumes `InventoryReserved`, TX: `capture payment` + `outbox (PaymentCaptured)` — compensates with `PaymentFailed → InventoryReleased` if failed
5. Analytics, notification consumers independently subscribe to same events — added without changing `OrderService`

Each step is local, retryable, and observable.

## Common mistakes

- **Fire-and-forget without outbox** — DB commits, broker down, event lost → stuck workflow
- **Dual-write in request path** — write DB then publish in same handler without same TX → two truths on retry
- **Choreography spaghetti** — event chains with no documented saga invariants, implicit workflow spread across services
- **No idempotency** — redelivery double-charges or double-reserves
- **Confusing transport with coordination** — Kafka gives durability, not process semantics; sagas still need checkpoints, compensations, DLQ [NILUS]

## Checklist

- [ ] Chosen EDA for a workflow where read/write scale or team extensibility justifies eventual consistency
- [ ] Events are facts (`OrderPlaced` not `CallInventoryService`), versioned in a registry
- [ ] Producers publish via transactional outbox/CDC — never dual-write
- [ ] Consumers are idempotent, keyed by event ID, with dedup store in same TX
- [ ] Correlation/trace baggage propagated
- [ ] Per-consumer lag & DLQ monitored, replay runbook exists
- [ ] Schema evolution plan (dual publish or upversioned type)

## FAQ

**Is EDA the same as “using Kafka”?** No. Kafka is transport + durable log. EDA is the architectural choice to communicate via events. You can do EDA on RabbitMQ/SQS and do synchronous calls on Kafka.

**Do I need event sourcing if I use EDA?** No. Most EDA uses a relational write store + CDC/outbox. Event sourcing adds history/replay at maximal complexity — only if audit/rebuild needs demand it.

**How is this different from saga?** EDA is *how* services talk (events). Saga is *how* they coordinate a multi-step transaction (sequence of local TXs + compensations). Sagas run *on top of* EDA.

**When to pick choreography vs orchestration for EDA workflows?** Inside a bounded context with stable domain events and tolerance for emergent behavior → choreography. Cross-context business processes with milestones, deadlines, compensation ordering → orchestration (workflow engine).

---

## Takeaway

EDA trades immediate consistency for loose coupling, parallel work, and extensibility. Make it work by treating events as versioned public contracts, publishing atomically (outbox/CDC), consuming idempotently with correlation, and observing per-consumer lag. Use it where workflows span services or read shapes diverge; keep it out where strong consistency or team maturity isn’t there. Pair with saga (for transactions) and outbox (for safety) — next docs dive into each.

*Tags: eda, event-driven, events, broker, kafka, rabbitmq, sqs, eventual-consistency, idempotency, schema-registry, choreography, orchestration, saga, outbox, cdc*

