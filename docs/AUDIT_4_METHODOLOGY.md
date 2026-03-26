# RMGaaS Enterprise Security Audit #4 — Structured Methodology

## Core Principle
Don't think. Use exhaustive checklists mechanically. Separate discovery from analysis.

## Phase 0: Automated Tooling First
Run before reading any file:
- `npm audit --json` — Known CVEs
- `npx depcheck` — Unused dependencies
- grep secrets: `password|secret|key|token|apikey` in source
- grep dangerous: `eval|innerHTML|dangerouslySetInnerHTML|queryRaw|executeRaw`
- grep unfinished: `TODO|FIXME|HACK|XXX`
- grep console: `console.log` in production code
- File permissions: `.env*`, `.pem`, `.key` files
- Schema extraction: full Prisma schema
- Route map: all `.use(`, `.get(`, `.post(`, `.put(`, `.patch(`, `.delete(`

## Phase 1: Attack Surface Inventory (Discovery Only)

### 1A: Complete Endpoint Inventory
| Method | Path | Auth | Authz | Rate Limiter | Tenant Check | Validation |
Every cell filled. Empty = finding.

### 1B: Complete Data Model Inventory
| Model | Has tenantId? | Has deletedAt? | Has PII? | PII encrypted? | Indexed? |
Every PII field must map to encryption call or = finding.

### 1C: Complete Secret/Key Inventory
| Secret | Source | Rotation? | Min length? | Fallback? |
Hardcoded fallback = finding. No rotation = finding.

## Phase 2: Mechanical Checklist Pass

### A: Authentication (per endpoint)
- Requires auth? If no, intentional?
- Router-level or per-route?
- Path manipulation bypass?
- Tokens in response body?
- Rate limiter?

### B: Authorization (per endpoint)
- Authz checked?
- Permission-based or role-based?
- Wildcard `*` bypass?
- Frontend guard matches backend?

### C: Tenant Isolation (per service function)
- Every find includes tenantId?
- Every update/delete verifies tenant BEFORE mutation?
- Find-then-mutate (safe) or mutate-then-check (TOCTOU)?
- Sub-queries also tenant-scoped?

### D: Input Validation (per endpoint)
- Zod/schema validation?
- `.strict()` or `.passthrough()`?
- Path params validated?
- Query params validated?
- File upload: size, extension, magic bytes?

### E: Cryptography (per algorithm)
- Algorithm current? No MD5/SHA1/DES/RC4
- Key length sufficient? AES-256, RSA-2048+
- Key from proper source? Not fallback
- Key rotation mechanism?
- IVs/nonces unique?
- Authenticated mode? GCM not CBC

### F: Session Management
- Server-side storage?
- Server-side idle timeout?
- Absolute timeout?
- Concurrent session limit?
- Invalidated on password change?
- Invalidated on permission change?
- Scalable? No KEYS, no in-memory only

### G: Error Handling
- Stack traces hidden in prod?
- Internal details hidden?
- Generic auth failure messages?
- Consistent JSON structure?
- No PII in errors?

### H: Logging
- PII in logs? (email, name, phone, IP)
- PII redacted?
- Secrets excluded?
- Log level appropriate?
- Logs rotated?

### I: Infrastructure (per docker service)
- Non-root?
- Capabilities dropped?
- no-new-privileges?
- Ports bound correctly?
- Resource limits?
- Health checks?
- Volumes read-only where possible?
- Default credentials changed?

### J: Frontend
- No dangerouslySetInnerHTML?
- URLs validated before navigation?
- target="_blank" with noopener noreferrer?
- Tokens in memory only?
- CSRF on ALL mutating requests?
- Error messages sanitized?

### K: Dependencies
- Actively maintained?
- Known CVEs?
- Necessary?
- Correct dep group?

## Phase 3: Cross-Cutting Traces
1. Token lifecycle: created → stored → sent → verified → refreshed → blacklisted → expired
2. Tenant data flow: tenantId set → passed → used in query → returned
3. File upload lifecycle: received → validated → stored → served → cleaned
4. Permission escalation: role created → perms assigned → wildcard → inheritance
5. Error propagation: thrown → caught → logged → returned

## Phase 4: Adversarial Scenarios
| Actor | Goal | Attack Path | What Stops Them? (cite code) |
- Unauthenticated → Access data
- Wrong tenant → Cross-tenant access
- Low privilege → Escalate
- XSS → Steal session
- CSRF → Force actions
- Insider → Access prod secrets
- Infra attacker → Access services

## Previous Audit Findings (Already Known)
### Audit #3 found 62 findings (5C, 14H, 25M, 14L, 4I):
- C-01: Tokens in response body
- C-02: ensureTenant never used
- C-03: updateUser cross-tenant
- C-04: updateWebhook TOCTOU
- C-05: Hardcoded dev secrets
- H-01: HS256 JWT
- H-02: Redis KEYS blocks
- H-03: Rate limiters in-memory
- H-04: Microsoft /token endpoint
- H-05: Emails not sent
- H-06: No trust proxy
- H-07: CSRF missing on streaming
- H-08: Swagger no auth
- H-09: No virus scan uploads
- H-10: No magic bytes validation
- H-11: decodeToken exists
- H-12: WS token in URL
- H-13: No breached password check
- H-14: Wildcard * permission
- M-01 through M-25, L-01 through L-14, I-01 through I-04
(Full details in previous conversation)

## Goal
Find NET NEW findings only. Do not re-report anything from Audit #3.
