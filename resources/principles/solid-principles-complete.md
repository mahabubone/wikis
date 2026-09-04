# SOLID Principles — Complete Guide with TypeScript (SRP, OCP, LSP, ISP, DIP)

*Source: https://generalistprogrammer.com/tutorials/solid-principles-complete-guide + https://leapcell.io/blog/implementing-solid-principles-in-nestjs-backends + https://stackpractices.com/patterns/solid-principles-typescript/*
*Author: Generalist Programmer, Leapcell, StackPractices — Jun 2026*

> SOLID is five complementary rules for keeping software easy to change: **SRP** (one reason to change), **OCP** (open for extension, closed for modification), **LSP** (subtypes must honor the parent contract), **ISP** (many small role interfaces beat one fat one), and **DIP** (depend on abstractions, inject concrete details). In TypeScript they map directly to `interface`, `type`, and constructor injection — and together they are the backbone of hexagonal/clean architecture. Apply with judgment: they reduce coupling where change is frequent, but over-applied they over-engineer simple code.

---

## Table of Contents

- [SOLID at a glance](#solid-at-a-glance)
- [Why SOLID still matters in 2026](#why-solid-still-matters-in-2026)
- [S — Single Responsibility (SRP)](#s--single-responsibility-srp)
- [O — Open/Closed (OCP)](#o--openclosed-ocp)
- [L — Liskov Substitution (LSP)](#l--liskov-substitution-lsp)
- [I — Interface Segregation (ISP)](#i--interface-segregation-isp)
- [D — Dependency Inversion (DIP)](#d--dependency-inversion-dip)
- [How the five reinforce each other](#how-the-five-reinforce-each-other)
- [SOLID in NestJS — opinions matter](#solid-in-nestjs--opinions-matter)
- [Incremental adoption in legacy code](#incremental-adoption-in-legacy-code)
- [When SOLID hurts](#when-solid-hurts)
- [Checklist](#checklist)
- [FAQ](#faq)

---

## SOLID at a glance

| Principle | What it means | Smell it fixes | TypeScript tell |
|---|---|---|---|
| **S — Single Responsibility** | A class has *one* reason to change; answers to one actor | God class, mixed concerns (`UserService` that validates, persists, and emails) | One class imports `Repository` *and* `EmailSender` *and* `Validator` |
| **O — Open/Closed** | Open for extension, closed for modification | Growing `switch`/`if-else` chains, shotgun surgery | Every new payment type edits `PaymentService` |
| **L — Liskov Substitution** | Subtypes usable wherever base type is expected | Subclass throws, narrows return, strengthens preconditions | `Square extends Rectangle` breaks `setWidth` |
| **I — Interface Segregation** | Many small role interfaces beat one fat one | Fat interface, implementers throw `NotImplemented` | `UserRepo` forces `read`+`write`+`subscribe` on a read-only consumer |
| **D — Dependency Inversion** | High-level depends on abstractions, not concretions | Hard-wired `new MysqlRepo()` in service, untestable | Constructor takes `Db` not `IRepo`, no fake possible |

> SRP tells you *where* to draw boundaries, ISP *how small* to keep contracts at them, DIP *which direction* dependencies point across them, OCP is the benefit (extension without edit), and LSP keeps abstractions honest [generalistprogrammer.com].

## Why SOLID still matters in 2026

TypeScript backends (NestJS modular) keep proving it: technologies change, frameworks come and go, business logic remains. SOLID makes business logic survive that churn:

- **Testability** — DIP lets you inject fakes for DB/email, unit tests run ms without infra
- **Maintainability** — SRP + ISP localize change; editing one feature doesn’t ripple
- **Extensibility** — OCP via strategy: new behavior = new class, not risky edit to working code
- **Reliability** — LSP prevents subtype surprises that hide as subtle correctness bugs

It’s the foundation of hexagonal / clean architecture where `Domain` defines ports, `Infrastructure` adapts [wojciechowski.app].

## S — Single Responsibility (SRP)

**Definition:** A class should have *one, and only one, reason to change* — responsible to a *single actor* [Uncle Bob]. If one class serves billing, reporting, and persistence, three stakeholders collide.

**Bad:** `UserService` does everything:

```ts
class UserService {
  async create(user: User) {
    if (!user.email.includes("@")) throw new Error("invalid");
    await db.query("INSERT INTO users ...", [user]);
    await fetch("https://email-api/send", { body: JSON.stringify(user) });
  }
}
```

Three reasons to change: validation rule, DB schema, email provider — same file.

**Good:** Separate responsibilities:

```ts
class UserValidator { validate(u: User): string[] { /* ... */ } }
interface UserRepository { save(u: User): Promise<void>; }
interface EmailSender { send(u: User): Promise<void>; }

class UserService {
  constructor(
    private validator: UserValidator,
    private repo: UserRepository,
    private mail: EmailSender,
  ) {}
  async create(user: User) {
    const e = this.validator.validate(user);
    if (e.length) throw new Error(e.join(","));
    await this.repo.save(user);
    await this.mail.send(user);
  }
}
```

Now `UserService` orchestrates; each dependency has one reason to change. In NestJS: `Controller` (HTTP), `Service` (use case), `Repository` (persistence) already nudges SRP [leapcell.io].

## O — Open/Closed (OCP)

**Definition:** Software entities should be *open for extension but closed for modification*. Add behavior by writing new code, not editing tested code.

**Smell:** Growing `switch`:

```ts
function discount(order: Order, type: string): number {
  if (type === "seasonal") return order.total * 0.1;
  if (type === "loyalty") return order.total * 0.15;
  // every new discount edits this function
  return 0;
}
```

**Strategy + OCP:**

```ts
interface DiscountStrategy { apply(order: Order): number; }
class Seasonal implements DiscountStrategy { apply(o: Order){ return o.total*0.1; } }
class Loyalty  implements DiscountStrategy { apply(o: Order){ return o.total*0.15; } }
// New discount = new class, no edit:
class BlackFriday implements DiscountStrategy { apply(o: Order){ return o.total*0.2; } }

class Checkout {
  constructor(private discount: DiscountStrategy) {}
  pay(order: Order) { order.total -= this.discount.apply(order); }
}
```

NestJS: register strategies as providers, inject by token — `OCP` without touching `Checkout` [leapcell.io].

## L — Liskov Substitution (LSP)

**Definition:** Objects of a subtype must be usable *anywhere* the base type is expected without breaking correctness. Subtypes must honor the contract: no stronger preconditions, no weaker postconditions, no surprise throws [Barbara Liskov, 1987].

**Classic violation — Rectangle & Square:**

```ts
class Rectangle {
  constructor(public width: number, public height: number) {}
  area() { return this.width * this.height; }
  setWidth(w: number){ this.width = w; }
}
class Square extends Rectangle {
  // breaks contract: setting width must also set height
  setWidth(w: number){ this.width = this.height = w; }
}
function doubleWidth(r: Rectangle){ r.setWidth(r.width*2); }
doubleWidth(new Rectangle(4,5)); // 40 ✅
doubleWidth(new Square(4,4));    // 32 ❌ — surprise
```

**Fix:** Don’t force inheritance where `is-a` doesn’t hold. Prefer composition or separate types:

```ts
interface Shape { area(): number; }
class Rectangle implements Shape { /* ... */ }
class Square implements Shape { /* square-specific */ }
```

In TS: ensure implementations of an `interface` fulfill its documented throws/returns. LSP is what keeps the `DiscountStrategy` abstraction honest in OCP.

## I — Interface Segregation (ISP)

**Definition:** Clients should not be forced to depend on methods they don’t use. Prefer many small, role-specific interfaces over one fat one.

**Bad:** One repository does all:

```ts
interface UserRepository {
  save(u: User): Promise<void>;
  find(id: string): Promise<User | null>;
  subscribe(u: User): Promise<void>;
  batchDelete(ids: string[]): Promise<void>;
}
class ReadOnlyUserService {
  constructor(private repo: UserRepository) {}
  // only needs find — but forced to depend on save/subscribe/batchDelete
}
```

Implementers throw `NotImplemented` — a sign the interface is too fat.

**Good:** Segregate by role:

```ts
interface Readable { find(id: string): Promise<User | null>; }
interface Writable { save(u: User): Promise<void>; }
interface Subscribable { subscribe(u: User): Promise<void>; }

class ReadOnlyUserService {
  constructor(private repo: Readable) {} // only what it uses
}
class FullUserRepo implements Readable, Writable, Subscribable { /* ... */ }
```

Small interfaces also make DIP’s mocks trivial [stackpractices.com].

## D — Dependency Inversion (DIP)

**Definition:** High-level modules should not depend on low-level modules; *both* should depend on abstractions. Abstractions shouldn’t depend on details; details should depend on abstractions.

**Bad:** High-level `OrderService` hard-wires low-level `MysqlOrderRepo`:

```ts
import { MysqlOrderRepo } from "./mysql";

class OrderService {
  private repo = new MysqlOrderRepo(); // hard-wired → untestable, not swappable
  async create(o: Order){ await this.repo.save(o); }
}
```

Switch to Postgres? Edit `OrderService`. Test in isolation? Need a real DB.

**Good:** Depend on port, inject adapter (hexagonal):

```ts
interface OrderRepository { save(o: Order): Promise<void>; }

class OrderService {
  constructor(private repo: OrderRepository, private notifier: EmailSender) {}
  async create(o: Order){ await this.repo.save(o); }
}

// composition root — NestJS module wires it:
@Module({
  providers: [
    OrderService,
    { provide: "OrderRepository", useClass: PostgresOrderRepo }, // swap to Mongo/InMemory for tests
  ],
})
export class OrderModule {}
```

Now `OrderService` knows nothing about Postgres — it knows `OrderRepository`. Testing is a fake:

```ts
class InMemoryOrderRepo implements OrderRepository {
  orders: Order[] = [];
  async save(o: Order){ this.orders.push(o); }
}
const svc = new OrderService(new InMemoryOrderRepo(), fakeNotifier);
```

DIP is the structural backbone of NestJS DI and clean architecture [generalistprogrammer.com].

## How the five reinforce each other

They are one philosophy from five angles, not a checklist:

- The abstraction you extract to satisfy **OCP** (e.g., `DiscountStrategy`) is exactly the abstraction **DIP** asks you to depend on
- Keeping that interface small and focused is **ISP**
- Ensuring every implementation behind it behaves is **LSP**
- The reason you extracted it — isolating one reason to change — is **SRP**

> Once one principle is applied well, the others tend to follow [generalistprogrammer.com].

## SOLID in NestJS — opinions matter

NestJS’s opinions *are* SOLID opinions:

- **Modules/Services/Repositories** push SRP
- **`@Injectable` + constructor injection** enforces DIP
- **Strategy providers** give OCP without `switch`
- **Small port interfaces** (`Readable`/`Writable`) give ISP; every implementation must honor **LSP**

```ts
@Injectable()
export class UserService {
  constructor(
    @Inject("UserRepository") private repo: Readable,
    private mail: EmailSender,
  ) {}
}
```

## Incremental adoption in legacy code

Don’t big-bang refactor. [stackpractices.com]:

1. **SRP first:** find the god class touching DB + validation + email; extract `Validator`, `Repository`, `Sender` behind small interfaces
2. **DIP second:** introduce ports the service defines, inject concrete adapters at the composition root; now you can test with fakes
3. **OCP third:** when the next variation arrives (new discount, new mail provider), add a new class implementing the port — don’t edit the service
4. Keep LSP in mind on every new implementation: honor the interface contract

## When SOLID hurts

SOLID is guidelines, not laws [generalistprogrammer.com]:

- **One interface per class** — over-engineering; only extract when there are *two* implementations or a test fake needs it
- **Inheritance where composition fits** — prefer composition; deep hierarchies violate LSP quietly
- **Speculative abstractions** — don’t invent `IUserCreatorFactoryManager` before a second use case exists
- **Functional code** — SRP/DIP translate, OCP/LSP matter less with pure functions

Apply where change and complexity justify structure.

## Checklist

- [ ] Each class answers to one actor (reason to change) — SRP
- [ ] New behavior added as new class implementing a port, not by editing tested code — OCP
- [ ] Subtypes (or interface implementations) pass wherever the base type is expected — LSP
- [ ] No client forced to depend on unused methods — ISP (split fat interfaces)
- [ ] High-level depends on `IRepo`/`Sender` ports, concrete adapters injected at composition root — DIP
- [ ] Fakes make unit tests ms-fast, no real DB needed

## FAQ

**Is SOLID still relevant with functional TS?** Partially — SRP and DIP (depend on function types/ports) translate well. OCP/LSP are OO-specific; use pure functions + composition.

**Should every class implement an interface?** No — extract only when there are multiple implementations or tests need a fake. Otherwise a concrete class is fine [techlead].

**Where to start?** SRP. The biggest win for the least churn [techlead]. Then DIP for testability, then OCP via strategy when a new branch appears.

**Does SOLID guarantee good design?** No — judgment does. It’s the vocabulary for naming smells and tradeoffs, not a substitute for understanding the domain.

---

## Takeaway

SOLID is a single coherent discipline for managing dependencies: draw boundaries by responsibility (SRP), keep contracts small (ISP), point dependencies toward abstractions (DIP), ensure those abstractions stay honest (LSP), and you’ll earn extension without modification (OCP) as a *consequence*. In TypeScript + NestJS this is concrete: port interfaces in the domain, adapters in infrastructure, everything injected. Use it where code changes often; leave simple code simple.

*Tags: solid, srp, ocp, lsp, isp, dip, clean-architecture, hexagonal, nestjs, typescript, dependency-injection*

