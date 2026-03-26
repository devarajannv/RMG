# Module Audit Dossier: webhooks

## Metadata
- Module: `webhooks`
- Wave: `wave-3`
- Last Updated: 2026-02-24 12:00:00 UTC
- Reviewer: GitHub Copilot (GPT-5.3-Codex)
- Status: COMPLETE (Deep Audit Wave 3 + Remediation Update)

## 1. Objective & Scope
Provides webhook registration, delivery, retries, signatures, health stats, and delivery logs.

## 2. Current Functionality (Code-Evidenced)
- Admin-gated management routes are in `webhook.controller.ts`.
- Delivery/circuit-breaker/retry logic is in `webhook.service.ts`.
- URL validation and signature creation are implemented for outbound safety/authenticity.

## 3. Product Objective Alignment
Strong for integration requirements; substantial enterprise features are implemented.

## 4. Functional Gaps (Real Scenarios)
- Cross-tenant update risk: `updateWebhook` updates by `id` before tenant ownership verification.
- Retry-chain bug: payload no longer stores `tenantId`, but retry path reads `payload.tenantId`, causing subsequent retries to lose tenant context.
- Delivery is fire-and-forget from trigger path without bounded queue/backpressure controls.

## 5. Improvement Opportunities
- Enforce tenant in `where` clause for all mutating operations.
- Use explicit retry envelope fields (event/data/tenant) rather than reading from mutable payload assumptions.
- Add bounded async worker/queue instrumentation.

## 6. Code Quality
Feature richness is high; service complexity is also high and requires stronger invariants around retry state.

## 7. Database Schema Quality
Webhook/webhook-log persistence is well structured and supports operational analytics.

## 8. Enterprise Security Posture
SSRF-aware URL validation and HMAC signatures are strong controls.
Tenant-unsafe update path is a critical security defect.

## 9. Reliability & Resilience
Circuit breaker and retry mechanics are robust conceptually.
Retry-context bug can prematurely terminate retry chains.

## 10. Data Integrity & Correctness
Delivery logging and state tracking are comprehensive; tenant/context correctness in retries must be fixed.

## 11. Performance Tuning (Code)
Asynchronous delivery avoids request blocking; queue/backpressure controls need production hardening.

## 12. Performance Tuning (Database)
Find/count patterns are bounded and paginated for admin views.

## 13. API / Contract Quality
API is comprehensive; update-route tenant safety and retry contract are currently fragile.

## 14. Observability / Operability
Good logging and health/stats endpoints; add explicit metrics for retry exhaustion and tenant mismatch drops.

## 15. Compliance / Governance
Integration auditability is good through logs; tenant mutation isolation defect must be remediated for enterprise compliance.

## 16. Test Confidence / Release Safety
`webhook.service.test.ts` exists; add dedicated tests for tenant-isolation mutation and multi-retry context propagation.

## Scoring (Deep Audit Wave 3)
- Functional Fit: 8.2/10
- Code Quality: 6.9/10
- Schema Quality: 7.6/10
- Security: 6.0/10
- Reliability: 6.6/10
- Data Integrity: 6.6/10
- Perf Code: 7.2/10
- Perf DB: 7.4/10
- Contract Quality: 6.4/10
- Operability: 7.3/10
- Compliance: 6.8/10
- Test/Release: 6.8/10
- Weighted Overall: 69.8/100 (L3 Stable)

## Findings Register
| ID | Severity | Finding | Evidence | Recommendation |
|---|---|---|---|---|
| WH-F01 | Resolved | Cross-tenant update path is now fail-closed and tenant-scoped | `updateWebhook` now uses `updateMany` with `{ id, tenantId }` and tenant-scoped refetch in `webhook.service.ts` | Closed on 2026-03-04 with targeted test validation |
| WH-F02 | Resolved | Retry chain now uses explicit tenant context and no longer reads tenant from payload | `retryDelivery` now forwards function `tenantId` to `deliverWebhook` and payload type excludes tenant | Closed on 2026-03-04 with targeted test validation |
| WH-F03 | Medium | Fire-and-forget trigger path lacks bounded backpressure controls | `triggerWebhook` async delivery launch | Introduce managed worker queue and saturation metrics |

## Action Plan
| Priority | Action | Owner | Effort | Target Date | Success Metric |
|---|---|---|---|---|---|
| Done | Fix tenant-safe update path | Webhooks owner | S | 2026-03-04 | Cross-tenant update attempts return not-found/forbidden with no mutation |
| Done | Repair retry tenant-context propagation | Webhooks owner | M | 2026-03-04 | Retries continue correctly through max-attempt policy |
| P1 | Add queue saturation controls and metrics | Webhooks owner | M | 2026-03-07 | Trigger throughput stable under burst load with bounded failures |
