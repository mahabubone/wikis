# Transactional Outbox Pattern: Atomic DB Commit and Event Publish

*Source: https://microservices.io/patterns/communication-with-external-systems/transactional-outbox + https://swehelper.com/blog/distributed-transactions-advanced/ + https://matthewpalma.dev/blog/distributed-sagas-choreography-vs-orchestration*
*Author: Chris Richardson, SWE Helper, Matthew Palma — 2025–2026*

> In a distributed transaction, a service must update its database *and* publish a domain event atomically. Dual-writing (DB + broker in same handler) creates “two truths” on retry/timeout. **Transactional outbox** solves it by writing the event to an `outbox` table in the *same local transaction* as the business state, then a relay publishes it reliably via polling or CDC. The consumer is idempotent. This is the safe publishing foundation for EDA and sagas.

---

## Table of Contents

- [The dual-write trap](#the-dual-write-trap)
- [Outbox at a glance](#outbox-at-a-glance)
- [How it works — same TX](#how-it-works--same-tx)
- [Relay: polling vs CDC](#relay-polling-vs-cdc)
- [Example: order creation (Node/Postgres)](#example-order-creation-nodepostgres)
- [Idempotent consumers — the other half](#idempotent-consumers--the-other-half)
- [Outbox vs other options](#outbox-vs-other-options)
- [Operational concerns](#operational-concerns)
- [When *not* to need outbox](#when-not-to-need-outbox)
- [Common mistakes](#common-mistakes)
- [Checklist](#checklist)
- [FAQ](#faq)

---

## The dual-write trap

Without outbox, a handler does:

```ts
await db.query("INSERT orders ...");        // 1) commit business state
await broker.publish("OrderPlaced", evt);   // 2) publish event
```

If step 1 succeeds and step 2 fails (broker down, timeout, crash), the **order exists but no one knows** — inventory never reserves, saga stalls silently and no component can resume it without forensic log search [AlokRanjan].

If you reverse the order (publish first, then DB), the event fires while the DB change rolls back → **ghost event**.

There is no safe dual-write. The fix is to make the event *part of the DB transaction*.

## Outbox at a glance

Add an `outbox` table in the same database as the business data. In one transaction:

- Update business table(s)
- Insert the event into `outbox`

A separate **relay** reads `outbox` rows and publishes them to the broker. Consumers deduplicate by event ID.

```
Client → Service
           ├─ BEGIN TX
           │   INSERT orders (pending)
           │   INSERT outbox (OrderPlaced, evt_7f3a)  ← atomic with business state
           └─ COMMIT
                        ↓  (same durability boundary)
                    Relay (poll/CDC) → Kafka topic OrderPlaced → Consumer (idempotent)
```

> This is the durable publication design that prevents classic split-brain between DB commit and event emission, especially with Kafka [NILUS].

## How it works — same TX

**Schema (Postgres):**

```sql
CREATE TABLE outbox (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate   TEXT NOT NULL,           -- e.g. 'order'
  aggregate_id TEXT NOT NULL,          -- e.g. 'order_123'
  type        TEXT NOT NULL,           -- e.g. 'OrderPlaced'
  payload     JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  published   BOOL NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ
);
CREATE INDEX ON outbox (published, created_at) WHERE published = false;
-- dedup helper for consumers
CREATE TABLE processed_events (
  event_id UUID PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Write path (same TX) [SWE Helper]:**

```ts
async function createOrder(orderData) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: [order] } = await client.query(
      `INSERT INTO orders (id, customer_id, amount, status)
       VALUES ($1, $2, $3, 'CREATED') RETURNING id`,
      [orderData.id, orderData.customerId, orderData.amount]
    );
    await client.query(
      `INSERT INTO outbox (aggregate, aggregate_id, type, payload)
       VALUES ('order', $1, 'OrderPlaced', $2)`,
      [order.id, JSON.stringify({ orderId: order.id, customerId: orderData.customerId, amount: orderData.amount, evtId: orderData.evtId })]
    );
    await client.query("COMMIT");
    return order;
    // Both succeed or both fail — atomic!
  } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
}
```

If either insert fails, the TX rolls back — no order without event, no event without order.

## Relay: polling vs CDC

Two ways to get outbox rows to the broker:

**1. Polling relay**

A worker loops: `SELECT * FROM outbox WHERE published=false ORDER BY created_at LIMIT 100 FOR UPDATE SKIP LOCKED` → publish to broker → `UPDATE outbox SET published=true` per row. Simple, no extra infra, but polls DB and adds latency polling interval.

**2. CDC relay (Change Data Capture) — Debezium**

Tails the DB transaction log (Postgres WAL) and converts committed row inserts on `outbox` into events automatically. No polling, near-real-time, and `INSERT outbox` *is* the publish trigger — app code never calls the broker.

> Tools like Debezium can watch the outbox table and automatically publish events when new rows appear, making the outbox → broker hop reliable and low-lag [SWE Helper].

**Pick:**

- Start with polling relay — one process, `SKIP LOCKED`, `published` index
- Move to CDC (Debezium → Kafka) when you need lower lag or already run Kafka with WAL streaming

Both share the invariant: the outbox row is written in the *same durability boundary* as the business state.

## Example: order creation (Node/Postgres)

Full path with polling relay + idempotent consumer:

```ts
// 1) Producer: atomic write + outbox (as above)
// 2) Relay: publishes (separate process)
async function relayTick() {
  const rows = await pool.query(`SELECT id, type, payload FROM outbox WHERE published=false ORDER BY created_at LIMIT 100 FOR UPDATE SKIP LOCKED`);
  for (const row of rows.rows) {
    await broker.publish(row.type, row.payload); // at-least-once
    await pool.query(`UPDATE outbox SET published=true, published_at=now() WHERE id=$1`, [row.id]);
  }
}

// 3) Consumer: idempotent, deduped in same TX as business work
async function onOrderPlaced(evt) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // dedup
    const seen = await client.query(`SELECT 1 FROM processed_events WHERE event_id=$1`, [evt.evtId]);
    if (seen.rowCount > 0) { await client.query("ROLLBACK"); return; }
    // business: reserve inventory idempotently
    await client.query(`INSERT INTO inventory_reservations (order_id, sku) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [evt.orderId, evt.sku]);
    await client.query(`INSERT INTO processed_events (event_id) VALUES ($1)`, [evt.evtId]);
    // also need to publish InventoryReserved downstream — same TX → outbox again
    await client.query(`INSERT INTO outbox (aggregate, aggregate_id, type, payload) VALUES ('inventory',$1,'InventoryReserved',$2)`, [evt.orderId, JSON.stringify({ orderId: evt.orderId })]);
    await client.query("COMMIT");
  } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
}
```

Every step commits local state + its *next* event atomically. A saga emerges as causally chained outbox relays.

## Idempotent consumers — the other half

Outbox guarantees the event is durably published; it does **not** guarantee it’s delivered once. Brokers are at-least-once. So every consumer must be **idempotent** [Matthew Palma]:

- **Idempotency key** — `evtId` / `orderId` + `type`
- **Deduplication store** — `processed_events(event_id)` in same TX as business, `ON CONFLICT DO NOTHING`
- **Atomic reservation** — business write and dedup insert together

> Sagas without idempotent steps are not sagas; they are time bombs [Alok Ranjan].

Also set a visibility timeout / consumer `ack` only after the TX commits — otherwise redelivery will hit before dedup is visible.

## Outbox vs other options

| Pattern | Atomic? | Pros | Cons |
|---|---|---|---|
| **Dual-write (DB + broker in handler)** | ❌ | Simple to write | Silent divergence on retry/timeout — “two truths” |
| **2PC / XA across DB + broker** | ✓ (blocking) | Strong atomicity | Blocking, poor availability, tight coupling, not for microservices |
| **Event sourcing** | ✓ (log is truth) | Full history/replay, but maximal complexity | Requires event store, aggregate rehydration |
| **Transactional outbox** | ✓ (same TX) | Simple, no XA, works with any RDBMS, replayable | Polling lag or extra CDC process |
| **CDC (Debezium)** | ✓ (log tail) | No polling, low lag, no app broker code | Extra infra (Kafka Connect), ops for WAL streaming |

> Most production CQRS uses a relational write store + outbox/CDC — event sourcing only when audit/rebuild history is a hard requirement [hld.handbook].

## Operational concerns

- **Ordering:** Preserve order per aggregate/key (same partition). Don’t assume global ordering.
- **Lag:** Monitor `outbox.published=false` depth and per-consumer lag (not just topic lag). Alert if relay falls behind.
- **DLQ:** Park poison events after N publishes/consumes, alert, provide replay tool that re-enqueues by `event_id`.
- **Retention:** Don’t delete processed outbox rows immediately — keep for audit/replay days, then archive.
- **Index:** `WHERE published=false` partial index keeps polling fast as table grows.
- **Relay HA:** Run at least two relays with `SKIP LOCKED` or rely on CDC; ensure exactly-once *effect* via dedup, not exactly-once delivery.

## When *not* to need outbox

- **Single DB, synchronous calls, strong consistency required** — no events, no need for outbox
- **You publish no domain events** — pure CRUD still
- **You already have an event store** — the log *is* the outbox (event sourcing)

If you emit any event that downstream sagas depend on (order → payment → inventory), you need it.

## Common mistakes

- **Publishing before commit** — event fires while TX rolls back → ghost event
- **No dedup on consumer** — redelivery double-charges or double-reserves
- **ACK before commit** — broker marks delivered while DB rolls back → lost event
- **Deleting outbox rows too early** — no audit, no replay after a bug
- **Forgetting correlationId** — can’t trace saga instance across services
- **Treating outbox as queue, not log** — it’s a durable log; consumers derive multiple read models from it

## Checklist

- [ ] `outbox` table in same DB as business, same TX as state change
- [ ] Relay (poll or Debezium) reliably publishes `published=false` rows
- [ ] Every consumer checks `processed_events` in same TX as its business write
- [ ] Correlation/trace IDs carried through every event
- [ ] DLQ + replay runbook for poison events
- [ ] Monitor: outbox depth, per-consumer lag, replay checkpoint
- [ ] Schema for events versioned, never edited in place

## FAQ

**Is outbox the same as “dual-write”?** No — dual-write does two independent writes (DB + broker) that can diverge. Outbox does one TX (DB + outbox row) and a relay makes the second hop durable [SWE Helper].

**Do I need Kafka to use outbox?** No. Polling relay + any broker (RabbitMQ/SQS/Service Bus) works. Kafka + Debezium is just the lowest-lag CDC option for high throughput.

**How is this different from saga?** Outbox solves *single service* atomic publish. Saga solves *multi-service* transaction coordination (sequence of local TXs with compensations) *on top of* outbox-published events [microservices.io].

**Can I use change data capture instead of outbox table?** CDC on the business table itself works but couples schema to events. Outbox decouples — you control event shape explicitly, not the table shape.

---

## Takeaway

If you emit a domain event that other services depend on, **don’t dual-write**. Write the business state and the event to the same transaction (outbox), let a relay (poll or CDC) make it durable on the broker, and make every consumer idempotent. That single pattern — outbox — is the safe foundation EDA and sagas stand on; without it, there is no saga, just a distributed stall waiting to happen.

*Tags: outbox, transactional-outbox, cdc, debezium, dual-write, idempotency, at-least-once, dedup, relay, saga, eda*

