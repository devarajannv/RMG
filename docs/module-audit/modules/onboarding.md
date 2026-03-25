# Module Audit Dossier: onboarding

## Metadata
- Module: `onboarding`
- Wave: `wave-1`
- Last Updated: 2026-02-24 10:00:00 UTC
- Reviewer: GitHub Copilot (GPT-5.3-Codex)
- Status: COMPLETE (Deep Audit Wave 1)

## 1. Objective & Scope
Implements tenant organization onboarding across identity, structure, business roles, people setup, and governance.

## 2. Current Functionality (Code-Evidenced)
- Large route surface in `onboarding.routes.ts` with public + authenticated flows.
- Strong schema layer in `onboarding.schemas.ts` used by controller for many write operations.
- Domain-specific services split by area (`identity.service.ts`, `structure.service.ts`, `roles.service.ts`, `people.service.ts`, `governance.service.ts`).

## 3. Product Objective Alignment
Very strong: this module resolves foundational tenant setup required for downstream writer modules.

## 4. Functional Gaps (Real Scenarios)
- Controller helper throws generic errors when user/tenant context missing (`getTenantId/getUserId`), potentially producing 500 vs explicit auth errors if reused incorrectly.
- Several read endpoints remain open to any authenticated user by design; sensitive boundaries depend on route-level role checks and should be periodically threat-reviewed.

## 5. Improvement Opportunities
- Standardize auth-context error handling to explicit 401/403 responses.
- Add scenario tests for mixed-role access across read endpoints.
- Split monolithic controller file into phase-based controllers for maintainability.

## 6. Code Quality
- Strong schema coverage and service decomposition.
- Controller size (650+ lines) indicates maintainability pressure.

## 7. Database Schema Quality
- Rich domain model implied via service segmentation; tenant scope appears consistently threaded in route/controller signatures.

## 8. Enterprise Security Posture
- Good write-operation protection (`orgAdmin` guard) and public endpoint rate limits.
- Sensitive endpoints (grade bands/invitations/export/delegation rules) are role-restricted.

## 9. Reliability & Resilience
- Robust endpoint partitioning and predictable orchestration patterns.
- Import and invitation flows need explicit chaos/failure-path regression tests.

## 10. Data Integrity & Correctness
- Structured zod contracts reduce malformed data risk.
- Bulk import correctness depends on downstream service validation behavior.

## 11. Performance Tuning (Code)
- Controller dispatch overhead is acceptable; main performance profile likely in people import and structure list operations.

## 12. Performance Tuning (Database)
- Needs explicit large-tenant benchmarks for list/import operations.

## 13. API / Contract Quality
- Broad and well-organized route taxonomy.
- Mostly consistent response envelope.

## 14. Observability / Operability
- Requires dedicated operational dashboards for import/invitation failure rates.

## 15. Compliance / Governance
- Strong access restrictions on sensitive HR/governance surfaces.

## 16. Test Confidence / Release Safety
- Service-level tests exist across onboarding subdomains; missing single consolidated end-to-end onboarding contract test.

## Scoring (Deep Audit Wave 1)
- Functional Fit: 9.0/10
- Code Quality: 7.0/10
- Schema Quality: 8.2/10
- Security: 8.0/10
- Reliability: 7.6/10
- Data Integrity: 8.0/10
- Perf Code: 7.1/10
- Perf DB: 7.0/10
- Contract Quality: 8.2/10
- Operability: 7.0/10
- Compliance: 8.1/10
- Test/Release: 7.4/10
- Weighted Overall: 77.2/100 (L4 Production-Strong)

## Findings Register
| ID | Severity | Finding | Evidence | Recommendation |
|---|---|---|---|---|
| ONBOARD-F01 | Medium | Controller context helpers can produce generic 500-style failures if auth context absent | `onboarding.controller.ts` `getTenantId/getUserId` throw generic Error | Convert to explicit auth/tenant ApiError responses |
| ONBOARD-F02 | Medium | Controller is monolithic and difficult to evolve safely | `onboarding.controller.ts` ~650 lines spanning all phases | Split into phase controllers and shared response utilities |
| ONBOARD-F03 | Low | Read-surface exposure requires continuous role-model review | Multiple GET routes in `onboarding.routes.ts` open to authenticated users | Add periodic access matrix tests and review gate |

## Action Plan
| Priority | Action | Owner | Effort | Target Date | Success Metric |
|---|---|---|---|---|---|
| P1 | Refactor controller by phase boundaries | Onboarding owner | M | 2026-03-10 | Each phase isolated with lower file complexity |
| P1 | Add explicit auth-context error handling | Onboarding owner | S | 2026-03-05 | No generic context-missing exceptions |
| P2 | Add role-matrix regression tests for read endpoints | QA + Security | M | 2026-03-12 | Unauthorized role access test suite green |
