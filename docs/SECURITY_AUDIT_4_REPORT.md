# RMGaaS Enterprise Security Audit #4 — NET NEW Findings Report

**Date:** July 2025  
**Scope:** Full codebase — `apps/api`, `apps/frontend`, `packages/shared`, Docker/nginx configs  
**Methodology:** 4-phase structured audit (see `docs/AUDIT_4_METHODOLOGY.md`)  
**Previous:** Audit #3 found 62 issues (5C, 14H, 25M, 14L, 4I) — all excluded from this report  

---

## Executive Summary

| Severity | Count |
|----------|-------|
| **Critical** | 1 |
| **High** | 12 |
| **Medium** | 27 |
| **Low** | 19 |
| **Info** | 2 |
| **TOTAL** | **61** |

---

## CRITICAL (1)

### C-01: Cross-Tenant Delegation Lookup Breaks Tenant Isolation for Approvals

**File:** [apps/api/src/modules/requests/request.service.ts](apps/api/src/modules/requests/request.service.ts) ~L833  
**Impact:** Any user with an active delegation in *any* tenant can approve requests in a *different* tenant.

```typescript
const delegation = await prisma.delegation.findFirst({
  where: {
    delegateId: userId,
    approvalStatus: 'APPROVED',
    revokedAt: null,
    startDate: { lte: new Date() },
    endDate: { gte: new Date() },
  },
  // NO tenantId filter
});
```

**Why critical:** This completely breaks the multi-tenant approval chain. A malicious user who is a delegate in Tenant A can approve requests assigned to the same delegator name/ID in Tenant B. Combined with auto-approved delegations (see L-06), this is exploitable without special privileges.

**Fix:** Add `tenantId` to the `where` clause: `where: { delegateId: userId, tenantId, ... }`.

---

## HIGH (12)

### H-01: `listDelegations` Ignores `tenantId` Parameter

**File:** [apps/api/src/modules/requests/approval-chain.service.ts](apps/api/src/modules/requests/approval-chain.service.ts) ~L1103  

```typescript
export async function listDelegations(
  _tenantId: string,  // ← parameter accepted but NEVER used in query
  userId: string,
  type: 'delegated_to_me' | 'delegated_by_me' = 'delegated_by_me'
): Promise<Record<string, unknown>[]> {
```

**Impact:** Users can see delegations from other tenants.

---

### H-02: Self-Delegation Allowed in Approval Chains

**File:** [apps/api/src/modules/requests/approval-chain.service.ts](apps/api/src/modules/requests/approval-chain.service.ts) ~L1000  

`createDelegation` never verifies `delegatorId !== input.delegateId`. A user can delegate approval authority to themselves, bypassing separation-of-duties controls.

---

### H-03: Self-Delegation Allowed in Function Assignments

**File:** [apps/api/src/modules/functions/functions.service.ts](apps/api/src/modules/functions/functions.service.ts) ~L547  

`delegateFunction` never checks `delegatorId !== input.delegateUserId`. Same self-delegation issue as H-02 but for approval function assignments.

---

### H-04: No SSRF Protection on Webhook URL Registration

**File:** [apps/api/src/modules/webhooks/webhook.service.ts](apps/api/src/modules/webhooks/webhook.service.ts) ~L253  

```typescript
new URL(input.url);  // Only checks URL parse-ability — no private IP blocklist
// Later: fetch(webhook.url, ...) sends tenant data to this URL
```

**Impact:** Admin users can register `http://169.254.169.254/latest/meta-data/` (cloud metadata), `http://localhost:4000/api/v1/...`, or internal service URLs to exfiltrate data or scan internal networks.

---

### H-05: Webhook Secret Exposed in GET Response

**File:** [apps/api/src/modules/webhooks/webhook.controller.ts](apps/api/src/modules/webhooks/webhook.controller.ts) ~L97  

```typescript
const webhook = await webhookService.getWebhook(req.tenantId!, req.params.id);
res.json({ data: webhook }); // includes webhook.secret in response
```

The HMAC signing secret is returned in the API response. Anyone with admin access can read it and forge webhook signatures.

---

### H-06: `auth.service` Operations Use `findUnique` by ID Without `tenantId`

**File:** [apps/api/src/modules/auth/auth.service.ts](apps/api/src/modules/auth/auth.service.ts) — Lines ~423, 446, 493, 619  

```typescript
const user = await prisma.user.findUnique({ where: { id: userId } }); // No tenantId
```

Functions `logout`, `logoutAll`, `changePassword`, and `sendVerificationEmail` all look up users by `id` alone. If `userId` in a JWT is manipulated, these functions operate on users in different tenants — `changePassword` at L493 is especially dangerous as it can change another tenant's user's password.

---

### H-07: Cross-Tenant `deleteOldNotifications` / `deleteExpiredNotifications`

**File:** [apps/api/src/modules/requests/notification.service.ts](apps/api/src/modules/requests/notification.service.ts) ~L659  

```typescript
await prisma.notification.deleteMany({
  where: { createdAt: { lt: cutoffDate }, isRead: true },
  // NO tenantId — deletes across ALL tenants
});
```

An admin in Tenant A triggering notification cleanup deletes read notifications belonging to ALL tenants.

---

### H-08: User Creation Endpoint Lacks Zod Validation

**File:** [apps/api/src/modules/users/user.controller.ts](apps/api/src/modules/users/user.controller.ts) ~L49  

No Zod schema. `email` not validated as email format, `status` accepts arbitrary strings, `roleIds` is an unvalidated array, `password` has no strength validation. Only presence checks exist.

---

### H-09: User Update Endpoint Lacks Zod Validation

**File:** [apps/api/src/modules/users/user.controller.ts](apps/api/src/modules/users/user.controller.ts) ~L86  

No validation on email format, no max-length limits on names, no enum check on status. `req.params.id` not validated as UUID.

---

### H-10: Request Type Creation — 25+ Fields Unvalidated from `req.body`

**File:** [apps/api/src/modules/requests/request-types.controller.ts](apps/api/src/modules/requests/request-types.controller.ts) ~L90  

Numeric fields (`responseSlaHours`, `maxAttachmentSizeMb`, `retentionDays`, etc.) accepted without type coercion or min/max bounds. `formSchema` accepts arbitrary JSON. Handler name strings accepted without allowlisting.

---

### H-11: Trigger Controller Passes Entire `req.body` to Service

**File:** [apps/api/src/modules/requests/trigger.controller.ts](apps/api/src/modules/requests/trigger.controller.ts) ~L73, L211  

```typescript
const webhook = await triggerService.updateInboundWebhook(tenantId, webhookId, req.body);
const trigger = await triggerService.updateRequestTrigger(tenantId, triggerId, req.body);
```

Unsanitized `req.body` passed directly. Extra fields propagate through to Prisma data clauses.

---

### H-12: `xlsx` Package Has Known CVEs (Prototype Pollution, RCE)

**File:** [apps/api/package.json](apps/api/package.json) — `"xlsx": "^0.18.5"`  

- CVE-2024-22363: Prototype pollution (CVSS 7.5)
- CVE-2023-30533: Arbitrary code execution
- Community edition receives no security updates

Used in `import.service.ts` and `ai-migration.service.ts` to parse user-uploaded Excel files — a direct attack vector.

---

## MEDIUM (27)

### M-01: PII Encryption Key Derivation Uses Raw SHA-256

**File:** [apps/api/src/lib/pii-encryption.ts](apps/api/src/lib/pii-encryption.ts) ~L21  

```typescript
function getEncryptionKey(): Buffer {
  const keyHex = process.env.PII_ENCRYPTION_KEY || config.cookieSecret;
  return crypto.createHash('sha256').update(keyHex).digest();
}
```

Single SHA-256 round instead of proper KDF (HKDF/PBKDF2/scrypt). Also falls back to `cookieSecret` — key separation violation.

---

### M-02: JWT Verification Does Not Enforce Algorithm

**File:** [apps/api/src/lib/jwt.ts](apps/api/src/lib/jwt.ts) ~L107  

`jwt.verify()` call lacks `algorithms: ['HS256']` option. Vulnerable to algorithm confusion attacks depending on library version. Same issue in `verifyRefreshToken`.

---

### M-03: MFA Backup Codes — 32-Bit Entropy + SHA-256 Hash = Brute-Forceable

**File:** [apps/api/src/lib/mfa.ts](apps/api/src/lib/mfa.ts) ~L88  

Each backup code is `crypto.randomBytes(4)` = 32 bits = ~4.3 billion possibilities. Stored as SHA-256 hashes (not bcrypt/argon2). An attacker with DB access can brute-force all codes in seconds.

---

### M-04: MFA Enable/Disable Does Not Invalidate Sessions

**File:** [apps/api/src/lib/mfa.ts](apps/api/src/lib/mfa.ts) ~L110–L176  

Neither `confirmMfa()` nor `disableMfa()` calls `invalidateAllUserTokens()`. Sessions created without MFA remain valid after MFA is enabled.

---

### M-05: Microsoft SSO `redirectUri` Accepted from `req.body` Without Allowlist

**File:** [apps/api/src/modules/auth/microsoft.controller.ts](apps/api/src/modules/auth/microsoft.controller.ts) ~L263  

```typescript
const { code, redirectUri, tenantId } = req.body;
const result = await microsoftService.handleCallback(code, redirectUri || getRedirectUri(req), ...);
```

Unlike the GET callback flow which uses `isAllowedRedirectUrl`, the POST `/token` endpoint accepts arbitrary `redirectUri` from the body.

---

### M-06: Agent Routes — No Authorization Checks

**File:** [apps/api/src/modules/agent/agent.routes.ts](apps/api/src/modules/agent/agent.routes.ts) ~L8  

All 8 agent endpoints (query, conversations CRUD, feedback) require only `authenticate`. Any user role can query the AI agent and trigger data-reading operations.

---

### M-07: Onboarding GET Endpoints Readable by Any Authenticated User

**File:** [apps/api/src/modules/onboarding/onboarding.routes.ts](apps/api/src/modules/onboarding/onboarding.routes.ts) ~L47  

17 GET endpoints (departments, grade bands, resources, invitations, delegation rules, etc.) protected only by `authenticate`. A `VIEWER` role user can read the full org structure.

---

### M-08: `authorize()` Called with Zero Arguments Silently Grants Access

**File:** [apps/api/src/middleware/auth.ts](apps/api/src/middleware/auth.ts) ~L126  

If `authorize()` is called with no args, `[].every(...)` returns `true` — access granted to all authenticated users. No current call-site triggers this, but it's a latent bypass.

---

### M-09: Frontend `ProtectedRoute` Only Checks `isAuthenticated`, Not Permissions

**File:** [apps/frontend/src/App.tsx](apps/frontend/src/App.tsx) ~L45  

All protected routes use only an `isAuthenticated` check. Viewer-role users can navigate to Settings, Workflows, Analytics pages and see admin-only UIs.

---

### M-10: `requestType.findUnique` Loads Cross-Tenant Data Before Ownership Check

**File:** [apps/api/src/modules/requests/request-types.service.ts](apps/api/src/modules/requests/request-types.service.ts) ~L348  

Loads full request type (including `formSchema`, handler names) for any tenant before checking `requestType.tenantId !== tenantId`. Same in `deleteRequestType` at ~L424.

---

### M-11: `resource.findUnique` Loads Cross-Tenant PII Without Tenant Guard

**File:** [apps/api/src/modules/resources/resource-exit-cascade.service.ts](apps/api/src/modules/resources/resource-exit-cascade.service.ts) ~L101  

Loads `firstName`, `lastName`, `email`, `employeeId` by resource ID with no tenant filter.

---

### M-12: Post-Approval Actions Loads Request Without `tenantId`

**File:** [apps/api/src/modules/requests/post-approval-actions.service.ts](apps/api/src/modules/requests/post-approval-actions.service.ts) ~L83  

Both `executePostApprovalActions` and `buildActionContext` use `findUnique({ where: { id } })` without tenant scoping.

---

### M-13: SLA Escalation Loads Request and User Without `tenantId`

**File:** [apps/api/src/modules/notifications/sla-escalation.service.ts](apps/api/src/modules/notifications/sla-escalation.service.ts) ~L872  

`getRequestSLAStatus` and `resolveEscalationTarget` load request and user data by ID alone — no tenant filter.

---

### M-14: `resourceBusinessRole` Mutations Have No Tenant Check

**File:** [apps/api/src/modules/onboarding/roles.service.ts](apps/api/src/modules/onboarding/roles.service.ts) ~L219  

`assignRoleToResource` and `removeRoleFromResource` operate by `resourceId`/`businessRoleId` without any tenant isolation.

---

### M-15: Path Parameters Used as Prisma Query Keys Without UUID Validation

**Files:** Multiple controllers — `user.controller.ts`, `request-types.controller.ts`, `functions.controller.ts`, `gdpr.controller.ts`, etc.

`req.params.id` used directly in Prisma `where` clauses without validating as UUID. Invalid strings cause 500 errors instead of 400.

---

### M-16: Pagination `limit` Parameter Unbounded in Multiple Endpoints

**Files:** `trigger.controller.ts`, `functions.controller.ts`, `audit.controller.ts`, and others.

`limit` is `parseInt(req.query.limit)` with no max cap. An attacker can send `?limit=999999999` for memory exhaustion/DoS. Some endpoints cap (e.g., `Math.min(..., 100)`) but implementation is inconsistent.

---

### M-17: `sortBy` Query Parameter Used as Dynamic Prisma `orderBy` Key Without Allowlist

**Files:** `request.service.ts`, `approval-chain.service.ts`, `functions.service.ts`, `resource.service.ts`, `project.service.ts`, `client.service.ts`, `allocation.service.ts`

```typescript
orderBy: { [sortBy]: sortOrder } // User-controlled sortBy, no field allowlist
```

Allows sorting by any valid column including sensitive ones (e.g., `passwordHash`).

---

### M-18: Admin Password Reset Bypasses Full Strength Validation

**File:** [apps/api/src/modules/users/user.controller.ts](apps/api/src/modules/users/user.controller.ts) ~L193  

Only checks `length >= 12` but doesn't use `validatePasswordStrength()` (uppercase, lowercase, numbers, special chars, common patterns). A password like `aaaaaaaaaaaa` passes.

---

### M-19: Redis Health Check Leaks Internal Error Details Publicly

**File:** [apps/api/src/modules/health/health.controller.ts](apps/api/src/modules/health/health.controller.ts) ~L264  

Redis connection error messages (hostnames, ports, auth failures) returned in unauthenticated `/health/ready` response. DB health check guards with `config.isProd`, but Redis check does not.

---

### M-20: Audit Log Stores PII in `changes` JSON Without Redaction

**Files:** [apps/api/src/modules/auth/auth.service.ts](apps/api/src/modules/auth/auth.service.ts) ~L177, [apps/api/src/modules/users/user.service.ts](apps/api/src/modules/users/user.service.ts) ~L172  

```typescript
changes: { email: user.email, firstName, lastName }
```

`createAuditLog` performs no PII redaction on the `changes` field. Anyone with audit-read permission can extract all historical PII via audit log queries.

---

### M-21: `password.ts` Silent Catch Returns `false` Instead of Alerting

**File:** [apps/api/src/lib/password.ts](apps/api/src/lib/password.ts) ~L36  

If argon2 throws on a corrupted hash or library bug, catch block silently returns `false`. Affected users are permanently locked out with no error logged.

---

### M-22: `safeDecrypt` Swallows Decryption Failures — Returns Ciphertext as Plaintext

**File:** [apps/api/src/lib/pii-encryption.ts](apps/api/src/lib/pii-encryption.ts) ~L90  

If PII encryption key is rotated or corrupted, this silently returns encrypted ciphertext to callers. Key rotation failures go undetected; garbled text displayed to users.

---

### M-23: Self-Role-Assignment Not Prevented

**Files:** [apps/api/src/modules/roles/role.controller.ts](apps/api/src/modules/roles/role.controller.ts) ~L148, [apps/api/src/modules/users/user.controller.ts](apps/api/src/modules/users/user.controller.ts) ~L140  

Neither `assignRole` nor `assignRoleToUser` checks `data.userId !== req.user.id`. A user with `role:assign` or `users:update` permission can escalate their own privileges.

---

### M-24: `assignRoleToUser` Does Not Validate Role Belongs to Tenant

**File:** [apps/api/src/modules/users/user.service.ts](apps/api/src/modules/users/user.service.ts) ~L272  

User is verified against tenant, but `roleId` is not. Through `/users/:id/roles`, an attacker could assign a role from another tenant.

---

### M-25: GDPR Erasure Uses Ad-Hoc Role Check Instead of Middleware

**File:** [apps/api/src/modules/gdpr/gdpr.controller.ts](apps/api/src/modules/gdpr/gdpr.controller.ts) ~L41  

Inline string matching `['ADMIN', 'ORG_ADMIN'].includes(r.toUpperCase())` instead of `requireRoles`. Fragile — role name changes silently fail open.

---

### M-26: Webhook Payload Leaks `tenantId` to External Endpoints

**File:** [apps/api/src/modules/webhooks/webhook.service.ts](apps/api/src/modules/webhooks/webhook.service.ts) ~L514  

```typescript
const payload = { event, tenantId, data, ... }; // Internal tenant ID sent to external URLs
```

Provides enumeration vector to third parties.

---

### M-27: Notification `actionUrl` Potential Open Redirect

**File:** [apps/frontend/src/components/notifications/NotificationPanel.tsx](apps/frontend/src/components/notifications/NotificationPanel.tsx) ~L244  

Catch block accepts any string starting with `/`, including `//evil.com` which some browsers parse as protocol-relative URLs.

---

## LOW (19)

### L-01: Partial Password-Reset Token Logged

**File:** [apps/api/src/modules/auth/auth.service.ts](apps/api/src/modules/auth/auth.service.ts) ~L560  

First 8 hex chars of reset token logged — reduces brute-force search space if logs are compromised.

---

### L-02: Notification Mutation Routes Lack Authorization Middleware

**File:** [apps/api/src/modules/requests/notification.routes.ts](apps/api/src/modules/requests/notification.routes.ts) ~L89  

Mark-read and delete operations protected only by `authenticate`. Mitigated by user-scoping in service, but violates defense-in-depth.

---

### L-03: `auditLog.findUnique` Without `tenantId` (Fetch-Then-Check)

**File:** [apps/api/src/modules/resources/resource-exit-cascade.service.ts](apps/api/src/modules/resources/resource-exit-cascade.service.ts) ~L500  

Loads audit data for any tenant into memory before checking ownership.

---

### L-04: `resetPreferences` Deletes Without `tenantId`

**File:** [apps/api/src/modules/requests/notification.service.ts](apps/api/src/modules/requests/notification.service.ts) ~L775  

UUID collision unlikely, but violates multi-tenant isolation principle.

---

### L-05: `role.delete` / `rolePermission.deleteMany` TOCTOU

**File:** [apps/api/src/modules/roles/role.service.ts](apps/api/src/modules/roles/role.service.ts) ~L204  

Tenant check exists in `findFirst` but subsequent mutations use only `roleId`/`id`.

---

### L-06: Delegation Auto-Approval — No Secondary Approval Required

**File:** [apps/api/src/modules/requests/approval-chain.service.ts](apps/api/src/modules/requests/approval-chain.service.ts) ~L1047  

```typescript
approvalStatus: 'APPROVED', // Auto-approved for now
```

Combined with self-delegation (H-02), allows unilateral circumvention of approval chains.

---

### L-07: `allocation.count` in `deleteResource` Missing `tenantId`

**File:** [apps/api/src/modules/resources/resource.service.ts](apps/api/src/modules/resources/resource.service.ts) ~L552  

---

### L-08: `requestApproval.count` Missing `tenantId` in Approval Flow

**File:** [apps/api/src/modules/requests/request.service.ts](apps/api/src/modules/requests/request.service.ts) ~L888  

---

### L-09: Notification Preference Queries/Mutations Lack `tenantId`

**File:** [apps/api/src/modules/requests/notification.service.ts](apps/api/src/modules/requests/notification.service.ts) ~L715  

All preference functions operate by `userId` only, no tenant scoping.

---

### L-10: Audit Log Controller — Unbounded Pagination

**File:** [apps/api/src/modules/audit/audit.controller.ts](apps/api/src/modules/audit/audit.controller.ts) ~L19  

`limit` not capped. `startDate`/`endDate` parsed with `new Date()` but not range-validated.

---

### L-11: JWT No `clockTolerance` Setting

**File:** [apps/api/src/lib/jwt.ts](apps/api/src/lib/jwt.ts) ~L107  

No tolerance for clock drift between services.

---

### L-12: TOTP Uses SHA-1 Algorithm

**File:** [apps/api/src/lib/mfa.ts](apps/api/src/lib/mfa.ts) ~L47  

SHA-1 is RFC 6238 default and required for Google Authenticator compatibility, but SHA-256/SHA-512 would be stronger.

---

### L-13: `generateSecureToken` Has Modulo Bias

**File:** [apps/api/src/lib/password.ts](apps/api/src/lib/password.ts) ~L140  

`randomBytes[i] % 62` — charset length 62 doesn't divide 256 evenly. First 8 chars have slightly higher probability.

---

### L-14: Microsoft SSO Cookies Use `sameSite: 'lax'` (vs `'strict'` in Main Auth)

**File:** [apps/api/src/modules/auth/microsoft.controller.ts](apps/api/src/modules/auth/microsoft.controller.ts) ~L48  

Inconsistency: main auth uses `strict`, SSO auth uses `lax`. SSO users get weaker CSRF protection.

---

### L-15: Refresh Token Accepted from Request Body (Not Just Cookies)

**File:** [apps/api/src/modules/auth/auth.controller.ts](apps/api/src/modules/auth/auth.controller.ts) ~L217  

```typescript
const refreshToken = req.signedCookies?.refreshToken || req.body.refreshToken;
```

Exposes refresh token to XSS if body fallback is used.

---

### L-16: GDPR Erasure JWT-Based Role Check Without Re-Verification

**File:** [apps/api/src/modules/gdpr/gdpr.controller.ts](apps/api/src/modules/gdpr/gdpr.controller.ts) ~L42  

Admin check relies on JWT-embedded roles. If role is revoked but session lives, erasure still works.

---

### L-17: `target="_blank"` Without `rel="noopener noreferrer"`

**File:** [apps/frontend/src/components/settings/IntegrationSettings.tsx](apps/frontend/src/components/settings/IntegrationSettings.tsx) ~L269  

---

### L-18: Access Token Accessible in Zustand Memory State (Dual Attack Surface)

**File:** [apps/frontend/src/stores/authStore.ts](apps/frontend/src/stores/authStore.ts) ~L60  

Token lives in JS-accessible memory AND httpOnly cookies. XSS can read the in-memory copy via `useAuthStore.getState().accessToken`.

---

### L-19: `@types/*` Packages in Production Dependencies

**File:** [apps/api/package.json](apps/api/package.json)  

`@types/swagger-jsdoc`, `@types/swagger-ui-express`, `@types/ws` in `dependencies` instead of `devDependencies`.

---

## INFO (2)

### I-01: Health Endpoint Exposes Version and Uptime Publicly

**File:** [apps/api/src/modules/health/health.controller.ts](apps/api/src/modules/health/health.controller.ts) ~L53  

Version facilitates CVE matching; uptime reveals restart patterns. K8s probes only need 200 status.

---

### I-02: No Upload File Cleanup — Orphaned Files Persist on Disk

**Files:** [apps/api/src/modules/documents/document.service.ts](apps/api/src/modules/documents/document.service.ts), [apps/api/src/modules/ai-migration/ai-migration.controller.ts](apps/api/src/modules/ai-migration/ai-migration.controller.ts)  

Soft-deleted documents leave files on disk forever. AI migration uploads have no cleanup at all. Leads to disk exhaustion.

---

## Infrastructure Findings (May Overlap with Audit #3 I-01–I-04)

> The following infrastructure issues were found. Some may overlap with Audit #3's I-01 through I-04 findings (details unavailable for deduplication).

### INFRA-01: `nginx.frontend.conf` Static Assets Override Security Headers (Medium)

**File:** [docker/nginx.frontend.conf](docker/nginx.frontend.conf) ~L30  

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    # ← All parent security headers (X-Frame-Options, CSP, etc.) are DROPPED
}
```

In nginx, `add_header` in a nested location **replaces** (does not inherit) parent headers.

---

### INFRA-02: `nginx.prod.conf` Same Static Asset Security Header Issue (Medium)

**File:** [docker/nginx.prod.conf](docker/nginx.prod.conf) ~L164  

Same `add_header` inheritance issue in production nginx config.

---

### INFRA-03: `nginx.frontend.conf` Missing HSTS Header (Medium)

**File:** [docker/nginx.frontend.conf](docker/nginx.frontend.conf)  

Frontend nginx has `X-Frame-Options`, `X-Content-Type-Options`, `CSP` but no `Strict-Transport-Security` or `Permissions-Policy`.

---

### INFRA-04: Docker Compose Prod — No Read-Only Root Filesystem (Low)

**File:** [docker-compose.prod.yml](docker-compose.prod.yml)  

No container sets `read_only: true`. Container compromise allows filesystem writes.

---

## Logging & Error Handling Addendum

### LOG-01: PII (Email Addresses) Logged Plaintext Across Services (Medium)

**Files:** `auth.service.ts` (~L167, L329, L544), `people.service.ts` (~L126, L268), `functions.service.ts` (~L400, L534), `email.service.ts` (~L838–909)

The logger's `sanitizeLogData` covers `password`, `token`, `secret` but **not `email`**. All logged email addresses go to production logs in plaintext.

---

### LOG-02: Email Recipients Logged on Error Path (Medium)

**File:** [apps/api/src/modules/notifications/email.service.ts](apps/api/src/modules/notifications/email.service.ts) ~L673  

When email sending fails, all recipient addresses are logged.

---

### LOG-03: Account Lockout Logs Include Email Address (Medium)

**File:** [apps/api/src/modules/auth/auth.service.ts](apps/api/src/modules/auth/auth.service.ts) ~L264  

---

### LOG-04: Request Body Logged for Non-Sensitive Endpoints (Low)

**File:** [apps/api/src/middleware/requestLogger.ts](apps/api/src/middleware/requestLogger.ts) ~L51  

`sensitiveEndpoints` list only covers `/auth/login|register|refresh`. Endpoints like `/users`, `/resources`, `/invitations` have full request bodies logged (with only `password`/`token` redacted — not `email`, `firstName`, `lastName`, `phone`).

---

### LOG-05: Production Code Uses `console.*` Instead of Structured Logger (Low)

**Files:** `trigger.controller.ts` (3 instances), `ai-migration.service.ts`, `agent.service.ts`

These bypass structured logging — no requestId, tenantId, userId context; raw error objects may include stack traces.

---

### LOG-06: `people.service.ts` Bulk Import Exposes `error.message` to Users (Medium)

**File:** [apps/api/src/modules/onboarding/people.service.ts](apps/api/src/modules/onboarding/people.service.ts) ~L457  

```typescript
errors.push(`${row.employeeId}: ${error.message}`);
```

Prisma constraint violations with internal field/table names returned to users.

---

### LOG-07: Inconsistent Error Response Shapes (Low)

**Files:** `document.controller.ts`, `role.controller.ts`, `agent.controller.ts`, `currency.controller.ts`

Some controllers return `{ error: "..." }` without the `code` field that the global error handler provides. Internal error messages may leak.

---

## Remediation Priority (Top 10)

| Priority | Finding | Severity | Effort |
|----------|---------|----------|--------|
| 1 | C-01: Cross-tenant delegation lookup | Critical | Low — add `tenantId` to where clause |
| 2 | H-04: SSRF on webhook URLs | High | Medium — add private IP blocklist |
| 3 | H-06: auth.service cross-tenant mutations | High | Low — add `tenantId` to all findUnique calls |
| 4 | H-07: Cross-tenant notification deletion | High | Low — add `tenantId` to deleteMany |
| 5 | H-12: xlsx CVEs | High | Medium — replace with `exceljs` |
| 6 | H-02/H-03: Self-delegation | High | Low — add `delegatorId !== delegateId` check |
| 7 | H-05: Webhook secret in response | High | Low — exclude `secret` from select |
| 8 | H-08/H-09: User CRUD no Zod validation | High | Medium — add Zod schemas |
| 9 | M-24: Cross-tenant role assignment | Medium | Low — add `tenantId` to role lookup |
| 10 | M-01: PII encryption key via SHA-256 | Medium | Medium — switch to HKDF |

---

## Comparison with Previous Audits

| Audit | Findings | Focus Area |
|-------|----------|------------|
| #1 (Sessions 1-7) | 55 | General TS errors + basic security |
| #2 (Session 8) | 78 | Enterprise security deep-dive |
| #3 (Session 14) | 62 | Post-remediation re-audit |
| **#4 (Session 15)** | **61** | Structured methodology — checklists, inventories, flow traces |

### Why Audit #4 Found 61 More Issues

1. **Systematic inventory-first approach** — cataloging all 355 endpoints, 55 models, and 25 secrets before analyzing any of them
2. **Mechanical checklists** — checking every endpoint for auth, authz, validation, tenant isolation rather than sampling
3. **Cross-cutting flow traces** — following delegation, approval, and token flows across file boundaries
4. **Adversarial scenarios** — specifically looking for self-delegation, self-role-assignment, and SSRF that don't appear in code-pattern grep scans

---

*End of Audit #4 Report*
