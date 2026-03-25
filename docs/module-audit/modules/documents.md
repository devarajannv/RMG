# Module Audit Dossier: documents

## Metadata
- Module: `documents`
- Wave: `wave-3`
- Last Updated: 2026-02-24 12:00:00 UTC
- Reviewer: GitHub Copilot (GPT-5.3-Codex)
- Status: COMPLETE (Deep Audit Wave 3)

## 1. Objective & Scope
Implements document CRUD, versioning, download, access control, and access logging for tenant data.

## 2. Current Functionality (Code-Evidenced)
- Route auth and granular permissions are defined in `apps/api/src/modules/documents/document.routes.ts`.
- File/type controls exist via multer whitelist and size cap.
- Service handles storage, versioning, and access records in `document.service.ts`.

## 3. Product Objective Alignment
Strong Writer alignment for enterprise document workflows.

## 4. Functional Gaps (Real Scenarios)
- Service instantiates `new PrismaClient()` directly instead of shared singleton.
- Upload path performs file write + DB creates without transaction/compensation, leaving orphan files/rows on partial failure.
- Access model is user-rule-first with a comment placeholder for full role-based evaluation.
- File I/O uses sync APIs (`writeFileSync`/`readFileSync`) on request path, hurting event-loop latency under load.

## 5. Improvement Opportunities
- Adopt shared Prisma client and transaction-bound upload/version flows.
- Replace sync file I/O with async streams.
- Complete role-based access resolution and add policy tests.

## 6. Code Quality
Good separation of route/controller/service; maintainability risk from broad service responsibilities and mixed storage concerns.

## 7. Database Schema Quality
Document models are normalized with version and access relations; indexing supports key lookups.

## 8. Enterprise Security Posture
Strong route-level permission usage; access engine needs completion for role inheritance and policy consistency.

## 9. Reliability & Resilience
No transactional envelope around multi-step upload/version operations; crash/failure can create storage/DB drift.

## 10. Data Integrity & Correctness
Tenant scoping is present on core reads/writes; object-level access semantics remain partially implemented.

## 11. Performance Tuning (Code)
Sync disk operations are the main bottleneck candidate.

## 12. Performance Tuning (Database)
No unsafe raw SQL; DB profile is conventional and index-friendly for document operations.

## 13. API / Contract Quality
API surface is rich and coherent; upload/version failure semantics need explicit contract hardening.

## 14. Observability / Operability
Access logging is present; deeper metrics for storage failures and latency would improve operations.

## 15. Compliance / Governance
Classification and access logs are good compliance foundations.

## 16. Test Confidence / Release Safety
`document.service.comprehensive.test.ts` exists; more tests needed for failure/rollback and access-policy edges.

## Scoring (Deep Audit Wave 3)
- Functional Fit: 8.0/10
- Code Quality: 6.8/10
- Schema Quality: 7.7/10
- Security: 7.1/10
- Reliability: 6.4/10
- Data Integrity: 6.8/10
- Perf Code: 6.4/10
- Perf DB: 7.6/10
- Contract Quality: 7.0/10
- Operability: 7.0/10
- Compliance: 7.3/10
- Test/Release: 6.8/10
- Weighted Overall: 70.1/100 (L3 Stable)

## Findings Register
| ID | Severity | Finding | Evidence | Recommendation |
|---|---|---|---|---|
| DOC-F01 | High | Upload/version workflows are not transaction-safe | `document.service.ts` multi-step file+DB operations | Add transactional/compensating workflow and cleanup jobs |
| DOC-F02 | Medium | Blocking sync file I/O on request path | `readFileSync`/`writeFileSync` in `document.service.ts` | Move to async file operations/streaming |
| DOC-F03 | Medium | Access model incomplete for role-based effective permissions | role-based comment in `checkAccess` | Implement full role/practice policy resolution + tests |
| DOC-F04 | Medium | Local Prisma client instance diverges from platform standard | `const prisma = new PrismaClient()` in service | Reuse shared prisma client |

## Action Plan
| Priority | Action | Owner | Effort | Target Date | Success Metric |
|---|---|---|---|---|---|
| P0 | Transactionalize upload/version flows with rollback cleanup | Documents owner | M | 2026-03-06 | No orphaned files/rows on injected failures |
| P1 | Replace sync storage ops with async streaming | Documents owner | M | 2026-03-07 | P95 upload/download latency improves under load |
| P1 | Implement complete access-policy resolution | Documents owner + security | M | 2026-03-08 | Role/practice access paths verified by tests |
