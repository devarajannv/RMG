# Module Audit Dossier: clients

## Metadata
- Module: `clients`
- Wave: `wave-2`
- Last Updated: 2026-02-24 11:00:00 UTC
- Reviewer: GitHub Copilot (GPT-5.3-Codex)
- Status: COMPLETE (Deep Audit Wave 2)

## 1. Objective & Scope
Maintains customer account master data, tiering/status, contacts, and client-level rollup stats for projects/contracts.

## 2. Current Functionality (Code-Evidenced)
- CRUD and stats routes are permission-gated in `apps/api/src/modules/clients/client.controller.ts`.
- Business logic and audit writes are in `apps/api/src/modules/clients/client.service.ts`.
- Routes are mounted as `/api/v1/clients` in `apps/api/src/index.ts`.

## 3. Product Objective Alignment
Strong Writer alignment: module supports tenant-level customer portfolio management without AI.

## 4. Functional Gaps (Real Scenarios)
- Delete path comment says active contracts/projects are checked, but implementation checks only active contracts.
- JSON `contacts` and `billingAddress` are lightly validated structurally; business-level constraints (e.g., one primary contact) are not enforced.
- Mutations and audit logging are not transaction-coupled.

## 5. Improvement Opportunities
- Align delete guard implementation with intended policy by checking active projects too.
- Add domain validations on contacts JSON (primary uniqueness, format bounds).
- Wrap mutation + audit writes in transactions for stronger consistency.

## 6. Code Quality
- Service/controller code is concise and readable.
- Contract drift between comments and implementation needs correction to preserve trust.

## 7. Database Schema Quality
- Good model constraints and indexes (`tenantId+code`, status/tier indexes).
- JSON fields are flexible but shift validation burden to application logic.

## 8. Enterprise Security Posture
- Controller consistently enforces `client:read`/`client:write`.
- Tenant scoping is present on all principal reads/writes.

## 9. Reliability & Resilience
- Soft delete and duplication guards are robust.
- Partial consistency risk remains where audit logging can fail after mutation.

## 10. Data Integrity & Correctness
- Unique code checks and status lifecycle behavior are stable.
- Missing active-project check during delete can violate intended lifecycle invariants.

## 11. Performance Tuning (Code)
- List/get methods are reasonably bounded with pagination and limited related rows.
- Current patterns are adequate for expected operational load.

## 12. Performance Tuning (Database)
- Query patterns align with declared indexes.
- No raw SQL/unsafe query behavior identified.

## 13. API / Contract Quality
- API surface is straightforward and consistent.
- Policy/behavior mismatch in delete guard is a contract correctness issue.

## 14. Observability / Operability
- Structured logs and audit events are present for core mutations.
- Additional operational warnings around policy bypass conditions would improve supportability.

## 15. Compliance / Governance
- Audit events for create/update/delete exist.
- Governance confidence improves by enforcing intended delete policy uniformly.

## 16. Test Confidence / Release Safety
- `client.service.comprehensive.test.ts` is present.
- Confidence moderate-high for CRUD, medium for policy edge-cases around deletion constraints.

## Scoring (Deep Audit Wave 2)
- Functional Fit: 8.3/10
- Code Quality: 7.4/10
- Schema Quality: 7.8/10
- Security: 7.3/10
- Reliability: 7.2/10
- Data Integrity: 7.3/10
- Perf Code: 7.3/10
- Perf DB: 7.8/10
- Contract Quality: 7.2/10
- Operability: 7.2/10
- Compliance: 7.4/10
- Test/Release: 7.2/10
- Weighted Overall: 74.2/100 (L4 Production-Strong)

## Findings Register
| ID | Severity | Finding | Evidence | Recommendation |
|---|---|---|---|---|
| CLI-F01 | High | Delete policy implementation does not match intended guard semantics | `deleteClient` in `client.service.ts` checks active contracts only despite “contracts/projects” comment | Add active project checks (or adjust documented policy) and test both paths |
| CLI-F02 | Medium | Flexible JSON contacts model lacks business-rule enforcement | `contacts`/`billingAddress` handling in controller/service | Add service validation for primary-contact uniqueness and normalized contact data |
| CLI-F03 | Medium | Mutation and audit writes are not transaction-bound | Separate client mutation + `auditLog.create` in `client.service.ts` | Use transaction for create/update/delete + audit consistency |

## Action Plan
| Priority | Action | Owner | Effort | Target Date | Success Metric |
|---|---|---|---|---|---|
| P0 | Enforce active-project delete guard parity | Clients owner | S | 2026-03-03 | Delete blocked when active projects or contracts exist |
| P1 | Add contact domain validators and regression tests | Clients owner | M | 2026-03-06 | Invalid contact payloads rejected with actionable 4xx errors |
| P1 | Transaction-wrap mutation + audit writes | Clients owner | S | 2026-03-06 | No partial state where mutation succeeds but audit write is missing |
