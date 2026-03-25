# Audit Trail Hardening Sprint Board

Date: 2026-02-23  
Timestamp (UTC): 2026-02-23 10:53:00 UTC  
Scope: Item 8 implementation backlog for compliance-grade auditability of billability, approval overrides, and billing lifecycle events.

## Sprint Goal
Deliver end-to-end, immutable, and reportable audit coverage for all high-risk workflow activities before enabling override-based billing outcomes in production.

## Definition of Done (Global)
- All required privileged mutations emit canonical audit events.
- No direct raw audit inserts remain in targeted modules.
- PII redaction is consistently applied through shared audit helper paths.
- Dashboard/report metrics map to audited events only.
- Migration validation confirms event parity and no tenant data leakage.

---

## Epic E1: Canonical Audit Foundation (P0)
Owner tags: @backend-platform @security @db

### Story E1-S1: Define canonical audit event contract
Priority: P0  
Owner tags: @backend-platform @security

Acceptance criteria:
- Contract includes: actor, tenant, entityType, entityId, action, before, after, reason, metadata, correlationId, source, occurredAt.
- Contract is documented and versioned.
- All new domain events conform to this contract.

### Story E1-S2: Enforce shared helper usage
Priority: P0  
Owner tags: @backend-platform

Acceptance criteria:
- Shared helper is the only supported write path for audit events.
- Helper guarantees PII redaction and stable serialization.
- Lint or code-search gate prevents new direct raw audit inserts.

### Story E1-S3: Remove direct audit writes in core modules
Priority: P0  
Owner tags: @backend-platform @module-owners

Acceptance criteria:
- Targeted modules no longer call raw audit insertion directly.
- Existing behavior remains functionally unchanged except for normalized event shape.
- Regression checks pass for allocations, projects, and request entity handlers.

---

## Epic E2: Timesheet and Currency Audit Coverage (P0)
Owner tags: @timesheets @currency @security

### Story E2-S1: Timesheet lifecycle audit events
Priority: P0  
Owner tags: @timesheets @backend-platform

Acceptance criteria:
- Submit, approve, reject transitions emit immutable events.
- Billable flag and rate-sensitive edits are auditable with before/after snapshots.
- Actor and decision reason fields are populated for approval/rejection actions.

### Story E2-S2: Currency and exchange-rate governance audit
Priority: P0  
Owner tags: @currency @backend-platform

Acceptance criteria:
- Create/update/delete of currency and exchange rates emit canonical events.
- Base currency changes capture old/new base and actor context.
- Events include effective date boundaries for rate changes.

---

## Epic E3: Override Outcome Auditability (P1)
Owner tags: @workflow @db @security

### Story E3-S1: Extend action taxonomy for override outcomes
Priority: P1  
Owner tags: @db @workflow

Acceptance criteria:
- Action taxonomy includes override-approved, override-rejected, override-expired, override-cancelled.
- Migration is backward compatible and documented.
- Historical readers remain functional during transition.

### Story E3-S2: Persist override decisions with compliance context
Priority: P1  
Owner tags: @workflow @backend-platform

Acceptance criteria:
- Override events include decision actor, decision reason, policy version, and timestamps.
- Expiry and cancellation are represented as explicit final events.
- Event chain supports deterministic reconstruction of final state.

---

## Epic E4: Request History and Canonical Audit Alignment (P1)
Owner tags: @requests @backend-platform @analytics

### Story E4-S1: Dual-write request transitions to canonical audit
Priority: P1  
Owner tags: @requests @backend-platform

Acceptance criteria:
- Request lifecycle actions continue writing request history for UX.
- Same actions also emit canonical audit events.
- Correlation IDs link request history rows to canonical audit records.

### Story E4-S2: Standardize optional context fields
Priority: P1  
Owner tags: @requests @security

Acceptance criteria:
- IP, user agent, reason/comment fields are normalized across actions.
- Empty context values are explicit and queryable.
- Security review confirms minimal required data retention.

---

## Epic E5: Billing Linkage and As-Was Truth (P2)
Owner tags: @billing @timesheets @db @reporting

### Story E5-S1: Introduce invoice linkage event model
Priority: P2  
Owner tags: @billing @db

Acceptance criteria:
- Events exist for timesheet-to-invoice linking, unlinking, and adjustment.
- Traceability supports per-entry and per-period linkage history.
- Links are tenant-scoped and immutable once posted, except by compensating events.

### Story E5-S2: Enforce as-was snapshot semantics
Priority: P2  
Owner tags: @reporting @backend-platform

Acceptance criteria:
- Billability context snapshots capture policy and classification at decision time.
- Historical reports do not drift when current config changes.
- Replay tests show reproducible historical outputs.

---

## Epic E6: Reporting Contract and Migration Safety (P2)
Owner tags: @reporting @data @qa @release

### Story E6-S1: Bind metrics dictionary to audited events
Priority: P2  
Owner tags: @reporting @analytics

Acceptance criteria:
- Each dashboard metric maps to one documented audited event definition.
- Label and semantic mismatches are removed.
- Reporting dictionary is published and reviewed.

### Story E6-S2: Tenant-safe global rollout with parity gates
Priority: P2  
Owner tags: @release @qa @data

Acceptance criteria:
- Rollout sequence: migration, dual-write, parity validation, read-switch, cleanup.
- Parity report passes for representative tenant samples.
- Rollback plan is tested before read-switch.

---

## Recommended Sprint Sequence
- Sprint 1: E1 + E2 (hard blockers)
- Sprint 2: E3 + E4 (workflow and compliance closure)
- Sprint 3: E5 + E6 (billing traceability and reporting reliability)

## Risk Register (Top)
- High: Missing timesheet and currency audit trails can invalidate compliance evidence.
- High: Override outcomes without explicit events break non-repudiation guarantees.
- Medium: Parallel history systems can drift without correlation IDs and parity checks.
- Medium: Reporting trust degrades if metrics are not event-contract bound.

## Release Gate (Must Pass)
- 100% required activity coverage in audit matrix.
- No unaudited privileged mutation paths in scoped modules.
- Redaction validation for sensitive fields.
- Deterministic event replay for approved tenant test cases.
- Sign-off from Security, Data, and Product owners.
