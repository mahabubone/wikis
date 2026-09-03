# JWT vs PASETO: A Comprehensive Comparison

*Source: https://dev.to/codefalconx/jwt-vs-paseto-a-comprehensive-comparison-4l9c*
*Author: CodeFalconX — Dec 26, 2025 · DEV Community*
*Tags: #programming #security #backenddevelopment*

> **TL;DR:** If you need wide compatibility — use JWT. If you want modern security — use PASETO. JWT is flexible but puts crypto choices on developers (and allows `alg:none` attacks). PASETO is secure-by-design, versioned, and disallows insecure algorithms — a safer alternative for new systems.

---

## Table of Contents

- [1. Overview](#1-overview)
- [2. Structure](#2-structure)
- [3. Security Considerations](#3-security-considerations)
- [4. Performance](#4-performance)
- [5. Adoption and Ecosystem](#5-adoption-and-ecosystem)
- [6. Relative Developer Adoption](#6-relative-developer-adoption-interpretation)
- [7. Use Cases](#7-use-cases)
- [8. Example Comparison](#8-example-comparison)
- [Summary Table](#summary-table)
- [Implementation in Modular Monolith (NestJS)](#implementation-in-modular-monolith-nestjs)
- [Testing Auth with Bruno](#testing-auth-with-bruno)
- [Final Thoughts](#final-thoughts)

---

## 1. Overview

| Feature | JWT (JSON Web Token) | PASETO (Platform-Agnostic Security Token) |
|---|---|---|
| **Definition** | Open standard RFC 7519 for securely transmitting information as JSON | Newer, opinionated format designed to eliminate common JWT pitfalls |
| **Purpose** | Authentication, authorization, data exchange | Same purposes, stronger cryptographic safety guarantees |
| **Design Philosophy** | Flexible but puts responsibility on developers to choose algorithms correctly | Secure by design — disallows insecure algorithms, enforces best practices |

---

## 2. Structure

Both are compact, URL-safe tokens but differ in structure.

**JWT Format:**
```
<Header>.<Payload>.<Signature>
```

**PASETO Format:**
```
vX.local.<payload>   # symmetric encryption (shared key)
vX.public.<payload>  # asymmetric signing (public/private key)
```

**Example:**
- JWT: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- PASETO: `v2.local.DWr6k19Cz3rG...` / `v2.public.eyJ...`

PASETO includes version (`v1`, `v2`, `v3`, `v4`) and purpose (`local` = encrypted, `public` = signed) directly in the token — self-descriptive and versioned for future upgrades. JWT embeds `alg` in header, which enables algorithm confusion attacks.

### Version Guide (PASETO)

| Version | Symmetric (`local`) | Asymmetric (`public`) | Status |
|---|---|---|---|
| `v1` | AES-256-CTR + HMAC-SHA384 | RSASSA-PSS + HMAC | Compatibility |
| `v2` | AES-256-GCM (via XChaCha20) | Ed25519 | **Recommended widely deployed** |
| `v3` | NIST P-384 | ECDSA P-384 | NIST compliance |
| `v4` | XChaCha20 + BLAKE2b | Ed25519 | **Modern, recommended for new** |

---

## 3. Security Considerations

| Aspect | JWT | PASETO |
|---|---|---|
| **Algorithm Flexibility** | Allows many algorithms (`HS256`, `RS256`, `none`…), leads to misuse (`alg:none` attack, weak HS256 with RSA key confusion) | Restricts algorithms per version (e.g., v2 = AES-256-GCM + Ed25519). No insecure/deprecated options |
| **Implementation Safety** | Developers must choose & configure algorithms carefully; many libs default to `none` if not validated | Developers can't misconfigure — safe defaults only, one cipher per version |
| **Token Validation** | Error-prone; requires explicit `alg` check, signature verification, `exp`/`aud`/`iss` checks | Safer — version + purpose dictate how to validate; no `alg` header to spoof |
| **Crypto Agility Pitfall** | Attacker can switch `RS256` → `HS256` and sign with public key as HMAC secret | Impossible — token purpose is fixed (`local` vs `public`) |

**In short: PASETO prevents developers from making cryptographic mistakes that JWT allows.**

Common JWT attacks mitigated by PASETO:
- `alg:none` — unsigned token accepted
- Algorithm confusion — `RS256` token verified as `HS256`
- Weak key — truncated or `none` accepted
- Missing `exp` — forever-valid tokens

PASETO `v2.local` encrypts the entire payload (not just sign), so claims are confidential by default.

---

## 4. Performance

| Aspect | JWT | PASETO |
|---|---|---|
| **Size** | Typically smaller (base64 header+payload+signature) | Slightly larger due to version tag + nonce + additional metadata |
| **Speed** | Comparable — HMAC-SHA256 fast, RSA slower | On par or faster on modern libs (XChaCha20-Poly1305, Ed25519 are highly optimized); `v4` BLAKE2b faster than SHA2 |
| **Overhead** | Minimal | Negligible (<1ms) for most use cases; encryption cost offset by fewer foot-guns |

> For typical API auth (1 verify per request), difference is not a deciding factor.

---

## 5. Adoption and Ecosystem

| Aspect | JWT | PASETO |
|---|---|---|
| **Adoption Level** | Very widely used — frameworks, libraries, APIs | Gaining traction but less common |
| **Tooling Support** | Extensive — Auth0, Okta, Firebase, AWS Cognito, every language | Growing — libs for Go, Rust, Python, Node.js, PHP, Java (see paseto.io) |
| **Learning Curve** | Lower — abundant examples/tutorials | Slightly higher — newer, fewer resources, but simpler API (no alg choices) |

Libraries:
- JWT: `jsonwebtoken` (Node), `PyJWT`, `java-jwt`, `golang-jwt`
- PASETO: `paseto` (Node — `pavlism/paseto`), `paseto` (Go — `o1egl/paseto`), `pyseto`, `paragonie/paseto` (PHP ref impl)

---

## 6. Relative Developer Adoption Interpretation

| Metric | JWT | PASETO |
|---|---|---|
| Weekly npm downloads | ~26.9 M (`jsonwebtoken`) | ~23 K (`paseto`) |
| Relative ecosystem size | Huge & mature | Small & growing |
| GitHub stars (major impl) | Thousands across many libs | ~3.4 K for reference PASETO impl |

**What this suggests:**
- Most JS developers still use JWT
- PASETO is ~1000× less downloaded today, but interest growing for security benefits
- Choosing PASETO = smaller StackOverflow surface, but cleaner security posture

---

## 7. Use Cases

| Scenario | Recommended |
|---|---|
| Legacy systems or existing JWT-based flows | ✅ **JWT** — don't migrate unless painful |
| New applications prioritizing strong crypto safety | ✅ **PASETO** |
| Regulated / security-sensitive (finance, healthcare, government) | ✅ **PASETO** (`v4.public`/`v4.local`) |
| Interoperability with third-party APIs (OAuth2, OIDC providers) | ✅ **JWT** (for now — OIDC mandates JWT) |
| Need encrypted tokens (confidential claims) | ✅ **PASETO `local`** (JWT requires JWE — complex) |
| Public API with many external clients | ✅ **JWT** (wider client support) |

**Hybrid strategy (common in modular monolith):**
- Issue PASETO `v2.local` internally between modules/microservices
- Issue JWT externally for OIDC/OAuth2 compatibility, with short `exp` + strict validation

---

## 8. Example Comparison

**JWT Example (HS256):**

Header:
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

Payload:
```json
{
  "sub": "1234567890",
  "name": "John Doe",
  "admin": true,
  "exp": 1735170000
}
```

Token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9...`

*Risk: header says `HS256`, but attacker could resend as `{"alg":"none"}` or `RS256` confusion.*

**PASETO Example (v2.local — encrypted):**

Payload (before encryption):
```json
{
  "sub": "1234567890",
  "name": "John Doe",
  "admin": true,
  "exp": "2025-12-26T00:00:00Z"
}
```

Token: `v2.local.DWr6k19Cz3rG_2p3...` (version + purpose baked-in, entire payload encrypted with XChaCha20-Poly1305 + nonce)

```js
// No algorithm field to tamper — v2.local ALWAYS means XChaCha20-Poly1305
```

**PASETO Example (v2.public — signed):**

Token: `v2.public.eyJzdWIiOiIxMjM...` + Ed25519 signature (detached, verified with public key)

> PASETO doesn't expose algorithm choice in token — prevents confusion attacks. Version dictates cipher.

---

## Summary Table

| Feature | JWT | PASETO |
|---|---|---|
| **Security** | ⚠️ Depends on implementation | ✅ Secure by design |
| **Algorithm Selection** | Manual (error-prone) | Enforced & versioned per `vX` |
| **Ease of Use** | Easy but error-prone | Easy and safe (one API) |
| **Ecosystem** | Mature & widespread | Growing steadily |
| **Size** | Smaller | Slightly larger |
| **Backward Compatibility** | Strong | Moderate (versioned) |
| **Encrypted by default** | No (JWS vs JWE split) | Yes for `local` |
| **Recommended for New Systems** | ❌ (unless OIDC required) | ✅ (`v4` or `v2`) |

---

## Implementation in Modular Monolith (NestJS)

### JWT (Strict) — What you MUST validate

```typescript
// auth/jwt.strategy.ts — NestJS + passport-jwt
import { Strategy, ExtractJwt } from 'passport-jwt';
passport.use(new Strategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_PUBLIC_KEY, // RS256 public key, NOT HMAC secret
  algorithms: ['RS256'], // CRITICAL: whitelist, never allow 'none'
  issuer: 'https://auth.example.com',
  audience: 'api.example.com',
}, (payload, done) => {
  if (payload.exp < Date.now()/1000) return done(null, false);
  return done(null, payload);
}));
```

### PASETO v2.local (Recommended)

```typescript
// auth/paseto.service.ts — using paseto npm (or pyseto/port)
import { V2 } from 'paseto';

const symmetricKey = Buffer.from(process.env.PASETO_SYMMETRIC_KEY, 'hex'); // 32 bytes

// Issue
const token = await V2.encrypt(
  { sub: '123', name: 'John', admin: true },
  symmetricKey,
  { footer: JSON.stringify({ kid: 'key1' }), expiresIn: '1h' }
);
// → v2.local...

// Verify (decrypt + validate exp)
const payload = await V2.decrypt(token, symmetricKey);
```

```typescript
// v2.public — asymmetric
import { V2 as PasetoV2 } from 'paseto';
const { publicKey, secretKey } = /* Ed25519 keypair */;

const token = await PasetoV2.sign({ sub: '123' }, secretKey); // v2.public...
const payload = await PasetoV2.verify(token, publicKey);
```

**Key management:** store 32-byte symmetric key in Vault/Env (`PASETO_SYMMETRIC_KEY`), rotate via `kid` in footer; for `public`, publish `publicKey` at `/.well-known/jwks` equivalent.

---

## Testing Auth with Bruno

> **REST-API & GraphQL Testing = Bruno** (project convention)

Create `bruno/collections/auth/` for contract tests:

**JWT/PASETO happy path — Assert:**

```yaml
runtime:
  assertions:
    - expression: res.status
      operator: eq
      value: "200"
    - expression: res.headers['set-cookie']
      operator: isString
    - expression: res.body.access_token
      operator: isString
```

**Negative — invalid token must be rejected with stable code:**

```js
test("rejects tampered PASETO with correct code", function(){
  const body = res.getBody();
  expect(res.getStatus()).to.equal(401);
  expect(body.errors[0].extensions.code).to.equal("UNAUTHENTICATED");
  expect(body.errors).to.be.an("array");
});
```

Test matrix: `alg:none`, expired `exp`, wrong `aud`/`iss`, algorithm confusion, `v2.local` decrypt with wrong key, `v2.public` verify with wrong public key — all should be `401` with `errors[].extensions.code`.

---

## Final Thoughts

JWTs served as de facto standard for years, but flexibility leads to misconfigurations. PASETO modernizes by enforcing **secure defaults**, making it **safer** for developers who want simplicity without sacrificing cryptographic integrity.

> **If you need wide compatibility — use JWT (with strict `algorithms: ['RS256']`, short `exp`, and full validation).**
> **If you want modern security — use PASETO `v4` / `v2` (`local` for confidentiality, `public` for public verifiability).**

References:
- JWT: https://jwt.io / RFC 7519
- PASETO: https://paseto.io / https://github.com/paseto-standard/paseto-spec

*Cover image via dev.to; article by CodeFalconX, Indonesia — Sep 2025 join date.*
