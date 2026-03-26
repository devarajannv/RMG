# Module Audit Dossier: import

## Metadata
- Module: `import`
- Wave: `wave-4`
- Last Updated: 2026-02-24 13:00:00 UTC
- Reviewer: GitHub Copilot (GPT-5.3-Codex)
- Status: COMPLETE (Deep Audit Wave 4 + Remediation Update)

## 1. Objective & Scope
Supports CSV-based import of resources, allocations, and projects with optional update behavior and pre-validation.

## 2. Current Functionality (Code-Evidenced)
- Protected write routes for import actions and validation endpoint in `import.controller.ts`.
- Service parses CSV, resolves references, and performs per-row import/update operations in `import.service.ts`.

## 3. Product Objective Alignment
High Writer value for onboarding and data operations; aligns with non-AI fallback requirements.

## 4. Functional Gaps (Real Scenarios)
- New resources are created with `benchSince: new Date()` by default, potentially marking all imports as bench resources.
- Import operations are row-by-row without transactional boundaries, so partial writes are expected under mid-run failures.
- Template endpoint is authenticated but not permission-gated.

## 5. Improvement Opportunities
- Set bench status from explicit import data or default to null for active joins.
- Add import job semantics or chunked transactions with resumability/idempotency keys.
- Add authorization check for template retrieval based on import-read permission.

## 6. Code Quality
Implementation is understandable and practical; parsing and mutation logic are tightly coupled in one service.

## 7. Database Schema Quality
Reference resolution and upsert behavior fit domain model; lacks explicit import-audit entity linkage.

## 8. Enterprise Security Posture
Write paths are authorized; permission inconsistency remains for template endpoint.

## 9. Reliability & Resilience
Per-row error capture avoids total failure but leaves partial state without rollback guarantees.

## 10. Data Integrity & Correctness
Major correctness risk from default benching behavior on resource import.

## 11. Performance Tuning (Code)
Nested per-row DB lookups and per-skill upserts are expensive at high volumes.

## 12. Performance Tuning (Database)
No raw SQL risk; batched operations are limited and can be improved.

## 13. API / Contract Quality
Response contract is clear (imported/skipped/errors). CSV data passed as raw string in body may stress API gateways for large files.

## 14. Observability / Operability
Limited import telemetry (duration, throughput, failure rate by reason).

## 15. Compliance / Governance
Data mutation path lacks stronger audit hooks and rollback semantics for compliance-grade imports.

## 16. Test Confidence / Release Safety
Has targeted service tests and good baseline confidence, but critical correctness path (`benchSince`) is not guarded by regression tests.

## Scoring (Deep Audit Wave 4)
- Functional Fit: 7.0/10
- Code Quality: 6.2/10
- Schema Quality: 6.5/10
- Security: 6.6/10
- Reliability: 5.8/10
- Data Integrity: 5.2/10
- Perf Code: 5.9/10
- Perf DB: 6.4/10
- Contract Quality: 6.7/10
- Operability: 6.1/10
- Compliance: 6.2/10
- Test/Release: 6.5/10
- Weighted Overall: 64.8/100 (L2 Emerging)

## Findings Register
| ID | Severity | Finding | Evidence | Recommendation |
|---|---|---|---|---|
| IMPORT-F01 | Resolved | Imported resources no longer default to bench state | `import.service.ts` create path now sets `benchSince: null` and update path does not force `benchSince` | Closed on 2026-03-04 with targeted regression assertions |
| IMPORT-F02 | Medium | Import writes are non-transactional and can leave partial state on failure | row-by-row mutation loops in `import.service.ts` | Introduce chunk transactions with resumable checkpoints |
| IMPORT-F03 | Medium | Template endpoint lacks explicit authorization gate | `GET /template/:type` in `import.controller.ts` | Add `authorize('import:read')` (or equivalent) to template route |

## Action Plan
| Priority | Action | Owner | Effort | Target Date | Success Metric |
|---|---|---|---|---|---|
| Done | Fix default `benchSince` import behavior | Import owner | S | 2026-03-04 | New active resource imports no longer appear on bench by default |
| P1 | Add transactional chunking/resume strategy | Import owner | M | 2026-03-11 | Mid-import failures can resume without duplicate or inconsistent writes |
| P1 | Enforce permission check on template endpoint | Import owner + security | S | 2026-03-04 | Unauthorized users cannot access import templates |
