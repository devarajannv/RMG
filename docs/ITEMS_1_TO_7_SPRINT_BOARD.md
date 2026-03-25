# Items 1–7 Execution Sprint Board

Date: 2026-02-23  
Timestamp (UTC): 2026-02-23 10:53:00 UTC  
Scope: Convert approved decision items (1–7) into an executable, tenant-safe delivery plan.

## Decision Items in Scope
1. Tenant-configurable contract/project invoicing taxonomy  
2. Billability domain model (eligibility, intent, outcome)  
3. As-was historical semantics  
4. Approval-driven override matrix with mandatory audit trail  
5. Reporting dictionary and dashboard label contract  
6. Migration, backfill, and validation strategy (global tenant-safe rollout)  
7. Audit-trail coverage completion and gap closure

## Program Goal
Establish consistent billing semantics and compliance-grade traceability so operational workflows, reporting, and audits remain correct even when rules evolve over time.

## Global Definition of Done
- Billing and billability semantics are tenant-configurable and versioned.
- Historical reports are reproducible as-was for any date range.
- Override outcomes are approval-governed and non-repudiable.
- Audit coverage reaches 100% for required high-risk activities.
- Dashboard/report labels and calculations match approved dictionary definitions.

---

## Epic I1: Tenant Taxonomy & Configuration (Item 1)
Owner tags: @product @backend-config @frontend-settings
Priority: P0

### Story I1-S1: Model tenant billing taxonomy
Acceptance criteria:
- Tenant can configure contract/project billing taxonomy without code changes.
- Config supports contract-led, project-led, and mixed invoicing patterns.
- Settings are scoped by tenant and include effective date/version metadata.

### Story I1-S2: Enforce taxonomy in workflow decisions
Acceptance criteria:
- Request/workflow validations reference tenant taxonomy at decision time.
- Invalid combinations are blocked with clear user-facing errors.
- Policy version used for decision is persisted for as-was replay.

---

## Epic I2: Billability Domain Refactor (Item 2)
Owner tags: @domain @timesheets @allocations
Priority: P0

### Story I2-S1: Separate eligibility, intent, and outcome
Acceptance criteria:
- Domain model distinguishes billable eligibility, operational intent, and invoicing outcome.
- Transitions are explicit and validated by state rules.
- Existing APIs remain backward-compatible during migration window.

### Story I2-S2: Capture partial billing semantics
Acceptance criteria:
- Partial billing supports per-entry or per-period attribution.
- Non-billable exceptions and override reasons are first-class fields.
- Derived metrics do not collapse partial billing into binary flags.

---

## Epic I3: As-Was Historical Truth (Item 3)
Owner tags: @data @reporting @backend-platform
Priority: P0

### Story I3-S1: Snapshot decision context
Acceptance criteria:
- Every billability-impacting decision stores policy version, actor role, and source context.
- Historical snapshots are immutable after commit.
- Re-running report logic on historical windows yields consistent results.

### Story I3-S2: Historical query contract
Acceptance criteria:
- Query layer defaults to as-was semantics for historical reports.
- Current-state views are explicitly labeled and separated.
- API docs specify as-was vs current-state behavior for each endpoint.

---

## Epic I4: Override Workflow Governance (Item 4)
Owner tags: @workflow @security @approvals
Priority: P1

### Story I4-S1: Implement approval matrix for override outcomes
Acceptance criteria:
- Outcomes include approved, rejected, expired, and cancelled.
- Actor permissions and approval levels are enforced per outcome.
- No automatic completion of override actions without required confirmation.

### Story I4-S2: Mandatory audit for each override outcome
Acceptance criteria:
- Each outcome emits immutable audit events with reason and timestamps.
- Event chain supports full reconstruction of who changed what and why.
- Missing reason/comment is blocked where policy requires justification.

---

## Epic I5: Reporting Dictionary Contract (Item 5)
Owner tags: @reporting @analytics @product
Priority: P1

### Story I5-S1: Publish metric and label dictionary
Acceptance criteria:
- Each dashboard label has a single approved semantic definition.
- Calculation formulas map to explicit audited event sources.
- Ambiguous labels are removed or renamed with product sign-off.

### Story I5-S2: Enforce dictionary in UI/API
Acceptance criteria:
- API response fields and UI labels align with dictionary naming.
- Any fallback/hardcoded assumptions are removed from critical metrics.
- Regression checks validate metric parity against SQL/source truth.

---

## Epic I6: Migration & Backfill Safety (Item 6)
Owner tags: @db @release @qa @data
Priority: P1

### Story I6-S1: Global tenant-safe migration sequence
Acceptance criteria:
- Sequence is defined: schema migration → backfill → dual-write/dual-read checks → switch.
- Rollout avoids tenant-specific canary branching unless critical rollback is needed.
- Operational runbook includes rollback and data repair steps.

### Story I6-S2: Data validation and reconciliation gates
Acceptance criteria:
- Pre/post-migration reconciliation validates totals, statuses, and sampled histories.
- Any drift above agreed thresholds blocks cutover.
- Sign-off required from Product, Data, and Engineering.

---

## Epic I7: Audit Coverage Closure (Item 7)
Owner tags: @security @backend-platform @compliance
Priority: P0

### Story I7-S1: Close missing audit paths
Acceptance criteria:
- Missing high-risk paths from audit assessment are remediated.
- Timesheet lifecycle and currency governance actions are auditable.
- Direct bypasses of shared audit helper are eliminated in scoped modules.

### Story I7-S2: Compliance evidence pack generation
Acceptance criteria:
- System can export tenant-scoped evidence for selected periods.
- Evidence includes override outcomes and approval rationale.
- Redaction policy is consistently applied in exported audit artifacts.

---

## Recommended Delivery Sequence
- Sprint A (Blockers): I1 + I2 + I7
- Sprint B (Correctness): I3 + I4
- Sprint C (Trust & Cutover): I5 + I6

## Dependency Notes
- I3 depends on I1/I2 for stable semantics.
- I4 depends on I7 event completeness for compliance readiness.
- I6 depends on I5 dictionary finalization for parity validation.

## Release Gates (Must Pass)
- 100% coverage for required audit activities.
- Deterministic as-was replay for representative scenarios.
- Dictionary parity between backend metrics and dashboard labels.
- Migration reconciliation passes on production-like datasets.
- Security/compliance sign-off before enabling override outcomes broadly.
