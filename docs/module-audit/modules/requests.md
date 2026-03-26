# Module Audit Dossier: requests

## Metadata
- Module: `requests`
- Wave: `wave-1`
- Last Updated: 2026-02-25 05:13:00 UTC
- Reviewer: GitHub Copilot (GPT-5.3-Codex)
- Status: COMPLETE (Deep Audit Wave 1 + Remediation Update)

## 1. Objective & Scope
Core request-flow engine: request CRUD, approval chains, SLA, triggers/webhooks, notifications, comments/history, and invoice-linkage operations.

## 2. Current Functionality (Code-Evidenced)
- Rich route surface with explicit authz in `request.routes.ts`, `approval-chain.routes.ts`, `sla.routes.ts`, `trigger.routes.ts`, `notification.routes.ts`.
- Request data schemas in `request.schemas.ts` and companion schemas for chains/types.
- Service depth in `request.service.ts` (~2000 lines) and supporting services.
- Comprehensive tests exist (`request.service.comprehensive.test.ts`, `workflow-integration.test.ts`, `sla.service.comprehensive.test.ts`, trigger tests).

## 3. Product Objective Alignment
Very strong: this module is central to Writer operational workflows.

## 4. Functional Gaps (Real Scenarios)
- Validation parity is now enforced for request-id params and action/update payloads (update/return/cancel/comment/invoice-link paths) using strict Zod schemas in controller.
- Visibility policy is now enforced in `getRequest` based on `RequestType.visibilityScope` (`TENANT` / `PRACTICE` / `PARTICIPANTS` / `CONFIDENTIAL`) with participant, practice, and admin checks.
- Request-type and workflow create paths now support optional code input with server-side code generation and conflict suffix resolution (`_2`, `_3`, ...).
- Cancel flow currently enforces requester-only and leaves admin override as TODO.
- Multiple workflow/notification TODOs indicate partially implemented lifecycle side effects.

## 5. Improvement Opportunities
- Complete remaining schema parity in adjacent request-trigger surfaces.
- Implement admin cancel policy.
- Move asynchronous side effects to queue/worker with retriable semantics.
- Decompose request service into domain-focused components.

## 6. Code Quality
- Strong feature coverage but very high complexity and TODO density.
- Single large service file increases regression risk and review overhead.

## 7. Database Schema Quality
- Tenant scoping is prevalent in key request queries.
- Large include trees in read paths need periodic contract and exposure review.

## 8. Enterprise Security Posture
- Route-level authorization is strong and explicit across major paths.
- Visibility-scope enforcement is implemented for single-request reads; key residual risk is TODO-based side-effect policy placeholders.

## 9. Reliability & Resilience
- Core transactional flow appears stable.
- Notification and post-approval side effects have sync/TODO boundaries that may reduce reliability under load/failure.

## 10. Data Integrity & Correctness
- History/audit integration exists and is mature.
- Full requestData schema validation remains partial (required-fields only + TODO for AJV).

## 11. Performance Tuning (Code)
- Dense branching and large orchestration logic suggest hotspot potential in approval transitions.

## 12. Performance Tuning (Database)
- Heavy relational includes in get/list endpoints can become expensive at scale without selective projection/caching.

## 13. API / Contract Quality
- Broad and well-documented route taxonomy.
- Contract strictness is improved with request-id UUID and action/update payload schema enforcement.

## 14. Observability / Operability
- Logging and history present.
- Side-effect observability (notifications/handlers) should be improved with queue metrics.

## 15. Compliance / Governance
- Audit/history trail is strong.
- Admin override and async side-effect TODOs remain for full governance confidence.

## 16. Test Confidence / Release Safety
- Best-in-class coverage within Wave 1 modules.
- Added targeted route integration and higher-fidelity visibility remediation E2E coverage.

## Validation Evidence
- Fast targeted tests:
	- `cd apps/api && npx vitest run src/modules/requests/request.service.comprehensive.test.ts src/modules/requests/request.routes.integration.test.ts`
	- Result: PASS (34/34)
	- `cd apps/api && npx vitest run src/modules/requests/code-generation.service.test.ts`
	- Result: PASS (4/4)
- Higher-fidelity functional test:
	- Test ID / Scenario: `REQUESTS-HF-001` (non-participant denied for `PARTICIPANTS`-scoped request), `REQUESTS-HF-002` (approval chain create without code auto-generates and conflict suffixes)
	- Command: `cd apps/api && npx vitest run src/test/e2e/requests.remediation.e2e.test.ts`
	- Environment: live API endpoint (`http://localhost:4000`) with DB-backed tenant/user/request-type/request state
	- Result: PASS (2/2)

## Scoring (Deep Audit Wave 1)
- Functional Fit: 9.3/10
- Code Quality: 6.6/10
- Schema Quality: 7.4/10
- Security: 7.8/10
- Reliability: 7.5/10
- Data Integrity: 7.8/10
- Perf Code: 6.8/10
- Perf DB: 6.7/10
- Contract Quality: 7.4/10
- Operability: 7.2/10
- Compliance: 8.2/10
- Test/Release: 8.7/10
- Weighted Overall: 78.4/100 (L4 Production-Strong)

## Findings Register
| ID | Severity | Finding | Evidence | Recommendation |
|---|---|---|---|---|
| REQUESTS-F01 | Resolved | Visibility scope enforcement implemented | `request.service.ts` `getRequest` now applies `RequestType.visibilityScope` policy checks | Closed on 2026-02-24 with fast + higher-fidelity validation evidence |
| REQUESTS-F02 | Resolved | Validation parity implemented for key update/action paths | `request.controller.ts` now parses UUID params and strict payload schemas | Closed on 2026-02-24 with route integration + E2E evidence |
| REQUESTS-F05 | Resolved | Manual code dependency removed for workflow/request-type create paths with deterministic server-side generation and conflict suffixing | `request-types.service.ts`, `approval-chain.service.ts`, `approval-chain.controller.ts`, `request-types.controller.ts`, `code-generation.service.test.ts` | Closed on 2026-02-25 with targeted fast tests + high-fidelity workflow API evidence |
| REQUESTS-F03 | Medium | Cancel policy lacks admin override path despite TODO note | TODO near cancel logic in `request.service.ts` | Implement explicit admin cancel authorization contract |
| REQUESTS-F04 | Medium | Multiple side-effect TODOs (notifications/async handlers) reduce operational completeness | TODO markers across `request.service.ts` and related services | Queue async side effects and add delivery/failure observability |

## Action Plan
| Priority | Action | Owner | Effort | Target Date | Success Metric |
|---|---|---|---|---|---|
| Done | Implement visibility-scope policy checks + tests | Requests owner | M | 2026-02-24 | Unauthorized non-participant access blocked for participants-scoped requests |
| Done | Enforce zod validation parity for key request mutations/actions | Requests owner | M | 2026-02-24 | Raw-body update/action handlers replaced with strict schema parse on remediated paths |
| Done | Remove mandatory manual code input for request types/workflows | Requests owner | M | 2026-02-25 | Server auto-generates valid unique codes when omitted and resolves conflicts deterministically |
| P1 | Implement admin cancel policy and document governance rules | Requests owner + Product | S | 2026-03-08 | Policy-complete cancel flow tested |
| P1 | Move side-effects to async queue with retries/metrics | Requests owner + Platform | M | 2026-03-12 | Observable async success/failure SLOs |
