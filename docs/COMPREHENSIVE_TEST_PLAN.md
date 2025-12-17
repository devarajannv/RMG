# RMGaaS Comprehensive Test Plan

> Complete test specification with 1,224 planned test cases across 7 layers

**Version:** 1.1  
**Created:** December 16, 2025  
**Updated:** December 17, 2025
**Status:** Partially Implemented

## Current Implementation Status

| Layer | Planned | Implemented | Status |
|-------|---------|-------------|--------|
| Backend Tests | 390+ | 889 | ✅ Complete |
| Frontend UI Tests | 325 | 204 | ✅ Complete |
| **Total** | **1,224** | **1,093** | **89%** |

> Note: Additional E2E, security, and performance tests can be added in future sprints.

---

## Table of Contents

1. [Layer 1: Unit Tests (213)](#layer-1-unit-tests)
2. [Layer 2: Integration Tests (70)](#layer-2-integration-tests)
3. [Layer 3: API Tests (390)](#layer-3-api-tests)
4. [Layer 4: UI Tests (325)](#layer-4-ui-tests)
5. [Layer 5: E2E Tests (69)](#layer-5-e2e-tests)
6. [Layer 6: Security Tests (103)](#layer-6-security-tests)
7. [Layer 7: Performance Tests (54)](#layer-7-performance-tests)

---

# Layer 1: Unit Tests

## 1.1 AUTH MODULE (12 tests)

### VALIDATION Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| AUTH-U-001 | Reject password < 12 chars | "short123!" | ValidationError: Password must be at least 12 characters | High |
| AUTH-U-002 | Reject password without uppercase | "alllowercase123!" | ValidationError: Password must contain uppercase | High |
| AUTH-U-003 | Reject password without number | "NoNumbersHere!" | ValidationError: Password must contain number | High |
| AUTH-U-004 | Reject password without special char | "NoSpecialChar123" | ValidationError: Password must contain special character | High |
| AUTH-U-005 | Reject common passwords | "Password123!" | ValidationError: Password too common | Medium |
| AUTH-U-006 | Reject invalid email domain | "user@" | ValidationError: Invalid email format | High |

### EDGE CASE Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| AUTH-U-007 | Login with different case email | "John@Example.COM" vs "john@example.com" | Both should work (case-insensitive) | Medium |
| AUTH-U-008 | Multiple failed logins trigger lockout | 5 failed attempts | Account locked for 15 minutes | High |
| AUTH-U-009 | Token expired by 1 second | Token with exp = now - 1 | 401 Unauthorized | High |
| AUTH-U-010 | Refresh token reuse detection | Use same refresh token twice | Second use rejected, all tokens invalidated | High |

### BUSINESS RULE Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| AUTH-U-011 | First login forces password change | New user first login | Redirect to change password | Medium |
| AUTH-U-012 | Password history prevents reuse | Last 5 passwords | ValidationError: Cannot reuse recent password | Medium |

---

## 1.2 RESOURCES MODULE (13 tests)

### VALIDATION Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| RES-U-001 | Validate employeeId format | "EMP-001" valid, "123" invalid | Format: EMP-XXX required | High |
| RES-U-002 | Validate phone number format | "+91-9876543210" | Valid Indian mobile format | Medium |
| RES-U-003 | Reject future joinDate | joinDate = tomorrow | ValidationError: Join date cannot be in future | High |
| RES-U-004 | Reject negative cost rate | costRate = -100 | ValidationError: Cost rate must be positive | High |

### EDGE CASE Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| RES-U-005 | Handle resource with 0 skills | skills = [] | Resource created, utilization = 0 | Medium |
| RES-U-006 | Handle resource with 100 skills | skills = [100 items] | Resource created successfully | Low |
| RES-U-007 | Search with empty string | search = "" | Return all resources | Medium |
| RES-U-008 | Search with SQL injection | search = "'; DROP TABLE--" | Sanitized, no error | High |
| RES-U-009 | Filter by non-existent practice | practiceId = "invalid-uuid" | Return empty array, no error | Medium |

### BUSINESS RULE Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| RES-U-010 | Auto-calculate utilization | Add 50% allocation | Utilization = 50% | High |
| RES-U-011 | Status change on allocation | First allocation added | Status: AVAILABLE → ALLOCATED | High |
| RES-U-012 | Cannot delete with active allocations | Delete resource with allocation | Error: Cannot delete, has active allocations | High |
| RES-U-013 | Skill proficiency validation | proficiency = 6 | ValidationError: Proficiency must be 1-5 | Medium |

---

## 1.3 PROJECTS MODULE (12 tests)

### VALIDATION Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| PROJ-U-001 | Project code format | "PROJ-001" valid, "123" invalid | Format: Alphanumeric with dash | High |
| PROJ-U-002 | Start date before end date | start > end | ValidationError: Start must be before end | High |
| PROJ-U-003 | Budget non-negative | budget = -1000 | ValidationError: Budget must be positive | High |
| PROJ-U-004 | Valid status transitions | PIPELINE → CANCELLED | Invalid: Cannot skip ACTIVE | Medium |

### EDGE CASE Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| PROJ-U-005 | Project with no allocations | allocations = [] | Valid project, team size = 0 | Medium |
| PROJ-U-006 | Project with 100+ allocations | 100 team members | Project created successfully | Low |
| PROJ-U-007 | Project spanning multiple years | 3-year project | Valid, dates calculated correctly | Medium |
| PROJ-U-008 | Project with null end date | endDate = null | Valid (ongoing project) | Medium |

### BUSINESS RULE Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| PROJ-U-009 | Cannot complete with pending timesheets | Status → COMPLETED | Error: Pending timesheets exist | High |
| PROJ-U-010 | Health status auto-calculation | Budget 80% used, timeline 90% | Health = AMBER | Medium |
| PROJ-U-011 | Cannot delete with active allocations | Delete project | Error: Has active allocations | High |
| PROJ-U-012 | Budget vs actual tracking | Log expense | Actual updated, variance calculated | Medium |

---

## 1.4 ALLOCATIONS MODULE (13 tests)

### VALIDATION Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| ALLOC-U-001 | Percentage between 1-100 | percentage = 0 | ValidationError: Must be 1-100 | High |
| ALLOC-U-002 | Percentage between 1-100 | percentage = 101 | ValidationError: Must be 1-100 | High |
| ALLOC-U-003 | Start date before end date | start > end | ValidationError: Invalid date range | High |
| ALLOC-U-004 | Resource must exist | resourceId = "invalid" | Error: Resource not found | High |
| ALLOC-U-005 | Project must exist and active | projectId = "cancelled" | Error: Project not active | High |

### EDGE CASE Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| ALLOC-U-006 | Over-allocation detection | 100% + 50% = 150% | Warning: Over-allocated by 50% | High |
| ALLOC-U-007 | Same day start and end | start = end | Valid (1-day allocation) | Medium |
| ALLOC-U-008 | Allocation spanning weekends | Mon-Fri allocation | Weekends excluded from calculation | Low |

### BUSINESS RULE Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| ALLOC-U-009 | Total per resource ≤ 100% | Check total | Sum of active allocations | High |
| ALLOC-U-010 | Overlap detection | Same resource, overlapping dates | Warning: Overlapping allocation | High |
| ALLOC-U-011 | Auto-update resource status | Allocation created | Resource status → ALLOCATED | High |
| ALLOC-U-012 | Billable vs non-billable | Track separately | Utilization splits by type | Medium |
| ALLOC-U-013 | Cannot allocate RESIGNED | Resource status = RESIGNED | Error: Resource not available | High |

---

## 1.5 CLIENTS MODULE (11 tests)

### VALIDATION Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| CLI-U-001 | Client code uniqueness | Duplicate code | Error: Code already exists | High |
| CLI-U-002 | Website URL format | "not-a-url" | ValidationError: Invalid URL | Medium |
| CLI-U-003 | Valid tier values | tier = "INVALID" | ValidationError: Must be STRATEGIC/KEY/STANDARD | Medium |
| CLI-U-004 | Contact email format | "invalid-email" | ValidationError: Invalid email | High |

### EDGE CASE Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| CLI-U-005 | Client with no contracts | contracts = [] | Valid client | Medium |
| CLI-U-006 | Client with no contacts | contacts = [] | Valid client | Medium |
| CLI-U-007 | Client name with special chars | "O'Brien & Co." | Valid, properly escaped | Medium |
| CLI-U-008 | Duplicate contact emails | Same email twice | Error: Duplicate contact | Medium |

### BUSINESS RULE Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| CLI-U-009 | Cannot delete with active contracts | Delete client | Error: Has active contracts | High |
| CLI-U-010 | Status change affects projects | Client → INACTIVE | Warning: X active projects | Medium |
| CLI-U-011 | Tier upgrade/downgrade | Change tier | Audit log created | Low |

---

## 1.6 CONTRACTS MODULE (13 tests)

### VALIDATION Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| CON-U-001 | Contract value non-negative | value = -1000 | ValidationError: Value must be positive | High |
| CON-U-002 | Valid contract type | type = "INVALID" | ValidationError: Must be MSA/SOW/CR | High |
| CON-U-003 | Start before end date | start > end | ValidationError: Invalid date range | High |
| CON-U-004 | SOW must link to MSA | SOW without parentId | ValidationError: SOW requires MSA | High |

### EDGE CASE Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| CON-U-005 | Contract with $0 value | value = 0 | Valid (pro-bono/internal) | Medium |
| CON-U-006 | Contract with no end date | endDate = null | Valid (perpetual) | Medium |
| CON-U-007 | CR without parent SOW | CR type, no parentId | Error: CR requires SOW | High |
| CON-U-008 | Multiple active SOWs under MSA | 3 active SOWs | Valid, total tracked | Medium |

### BUSINESS RULE Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| CON-U-009 | MSA required before SOW | Create SOW, no MSA | Error: Create MSA first | High |
| CON-U-010 | SOW required before CR | Create CR, no SOW | Error: Create SOW first | High |
| CON-U-011 | Auto-expire on end date | End date passed | Status → EXPIRED | Medium |
| CON-U-012 | Cannot delete with invoices | Delete contract | Error: Has linked invoices | High |
| CON-U-013 | Renewal workflow | Contract expiring in 30 days | Alert triggered | Medium |

---

## 1.7 TIMESHEETS MODULE (15 tests)

### VALIDATION Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| TS-U-001 | Hours per day ≤ 24 | hours = 25 | ValidationError: Max 24 hours/day | High |
| TS-U-002 | Hours per week ≤ 168 | total = 170 | ValidationError: Max 168 hours/week | High |
| TS-U-003 | Date within allocation period | Date outside allocation | ValidationError: Not allocated on this date | High |
| TS-U-004 | Project must be allocated | Project not allocated | Error: Not allocated to this project | High |

### EDGE CASE Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| TS-U-005 | Zero hours entry | hours = 0 | Valid (leave day) | Medium |
| TS-U-006 | Timesheet for future week | Week = next week | Error: Cannot log future time | High |
| TS-U-007 | Timesheet for old week | Week = 3 months ago | Warning: Late submission | Medium |
| TS-U-008 | Decimal hours | hours = 7.5 | Valid, stored as decimal | Medium |
| TS-U-009 | Week spanning two months | Week = Jan 30 - Feb 5 | Valid, both months tracked | Low |

### BUSINESS RULE Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| TS-U-010 | Cannot submit empty | All zeros | Error: No hours logged | Medium |
| TS-U-011 | Cannot edit after approval | Edit approved timesheet | Error: Already approved | High |
| TS-U-012 | Manager approves own team only | Approve other team | Error: Not authorized | High |
| TS-U-013 | Re-submission resets status | Re-submit rejected | Status → PENDING | High |
| TS-U-014 | Total vs allocated validation | 50 hours, allocated 40 | Warning: Exceeds allocation | Medium |
| TS-U-015 | Lock after payroll date | Edit after lock | Error: Payroll locked | High |

---

## 1.8 BENCH MODULE (11 tests)

### VALIDATION Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| BENCH-U-001 | Valid date range | start > end | ValidationError: Invalid range | Medium |
| BENCH-U-002 | Practice ID exists | Invalid practiceId | Error: Practice not found | Medium |

### EDGE CASE Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| BENCH-U-003 | Zero bench resources | No one on bench | Return empty array, benchCost = 0 | Medium |
| BENCH-U-004 | All resources on bench | 100% on bench | All listed, high alert | Medium |
| BENCH-U-005 | Resource on bench 1 day | Just started | Included, daysOnBench = 1 | Medium |
| BENCH-U-006 | Resource on bench 1+ year | Long bench | High priority flag | Medium |

### BUSINESS RULE Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| BENCH-U-007 | Bench cost calculation | 10 resources × ₹1L | ₹10L/month | High |
| BENCH-U-008 | Days on bench (weekends) | Include or exclude? | Configurable setting | Low |
| BENCH-U-009 | Long bench alert | > 30 days | Alert triggered | High |
| BENCH-U-010 | Forecast accuracy | 30/60/90 days | Based on rolloffs | Medium |
| BENCH-U-011 | Quick allocate updates status | Allocate from bench | Resource → ALLOCATED | High |

---

## 1.9 INTELLIGENCE MODULE (12 tests)

### VALIDATION Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| INT-U-001 | Valid skill IDs | Invalid skillId | Error: Skill not found | High |
| INT-U-002 | Minimum resources count | limit = 0 | ValidationError: Min 1 | Medium |

### EDGE CASE Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| INT-U-003 | No matching resources | Rare skill combo | Return empty, suggestions | Medium |
| INT-U-004 | All perfect matches | Simple requirement | All 100% scores | Low |
| INT-U-005 | Requirement with 20+ skills | Complex project | Handles gracefully | Medium |
| INT-U-006 | Skills with no resources | New skill | Warning: No proficient resources | Medium |

### BUSINESS RULE Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| INT-U-007 | Match score calculation | Known inputs | Expected score (verify formula) | High |
| INT-U-008 | Weight factors correct | Skill 40%, Availability 30% | Weights applied correctly | High |
| INT-U-009 | Availability check | 80% allocated | 20% available flagged | High |
| INT-U-010 | Location preference | Onsite required | Remote resources lower score | Medium |
| INT-U-011 | Experience level match | 5 years required | < 5 years lower score | Medium |
| INT-U-012 | Certification bonus | Has AWS cert | +5 bonus points | Low |

---

## 1.10 ANALYTICS MODULE (11 tests)

### VALIDATION Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| ANA-U-001 | Valid date range | start > end | ValidationError: Invalid range | High |
| ANA-U-002 | Valid practice filter | Invalid practiceId | Error: Practice not found | Medium |

### EDGE CASE Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| ANA-U-003 | Analytics with no data | Empty tenant | Return zeros, no error | Medium |
| ANA-U-004 | Single day range | start = end | Valid, one day data | Low |
| ANA-U-005 | Full year range | 365 days | Handles large dataset | Medium |
| ANA-U-006 | Future date range | Next month | Return zeros (no data yet) | Low |

### BUSINESS RULE Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| ANA-U-007 | Utilization % calculation | 40 billable / 50 total | 80% utilization | High |
| ANA-U-008 | Bench cost calculation | Sum of bench × cost rate | Accurate total | High |
| ANA-U-009 | Trend calculation | Last 3 months | up/down/stable correct | Medium |
| ANA-U-010 | Practice rollup | Sum of child practices | Total matches | Medium |
| ANA-U-011 | Financial projections | Based on current rate | 90-day forecast | Medium |

---

## 1.11 EXPORT MODULE (10 tests)

### VALIDATION Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| EXP-U-001 | Valid export type | type = "invalid" | Error: Unknown export type | High |
| EXP-U-002 | Valid format | format = "xml" | Error: Only CSV/JSON | High |

### EDGE CASE Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| EXP-U-003 | Export 0 records | Empty filters | Empty file with headers | Medium |
| EXP-U-004 | Export 10,000+ records | Large dataset | Handles without timeout | Medium |
| EXP-U-005 | Special chars in data | Name = "O'Brien, Jr." | Properly escaped in CSV | High |
| EXP-U-006 | Null fields | Missing optional data | Empty string or null | Medium |

### BUSINESS RULE Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| EXP-U-007 | CSV escaping | Commas in data | Quoted correctly | High |
| EXP-U-008 | JSON structure | Export resources | Valid JSON, schema match | High |
| EXP-U-009 | Date format | All dates | ISO 8601 format | Medium |
| EXP-U-010 | Sensitive data excluded | Export includes password? | No, excluded | High |

---

## 1.12 IMPORT MODULE (14 tests)

### VALIDATION Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| IMP-U-001 | Valid file format | .txt file | Error: Only CSV supported | High |
| IMP-U-002 | Required columns | Missing "email" column | Error: Required column missing | High |
| IMP-U-003 | Data type validation | "abc" for number field | Error: Invalid data type | High |
| IMP-U-004 | Row limit | 6000 rows | Error: Max 5000 rows | Medium |

### EDGE CASE Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| IMP-U-005 | Empty file | 0 bytes | Error: File is empty | Medium |
| IMP-U-006 | Headers only | No data rows | Error: No data to import | Medium |
| IMP-U-007 | Duplicate rows | Same email twice | Error on row 2: Duplicate | High |
| IMP-U-008 | Mixed valid/invalid | 50% valid | Partial import, errors listed | High |
| IMP-U-009 | Very large file | 100MB | Error: Max 50MB | Medium |

### BUSINESS RULE Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| IMP-U-010 | Duplicate detection | Existing email | Error: Already exists | High |
| IMP-U-011 | Partial import | Some errors | Valid rows imported | Medium |
| IMP-U-012 | Rollback on critical | DB error mid-import | All rolled back | High |
| IMP-U-013 | Import audit log | Successful import | Log: who, when, count | Medium |
| IMP-U-014 | Conflict resolution | skip/update/error | Configurable behavior | Medium |

---

## 1.13 WEBHOOKS MODULE (12 tests)

### VALIDATION Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| WH-U-001 | Valid URL format | "not-a-url" | Error: Invalid URL | High |
| WH-U-002 | Valid event types | events = ["invalid"] | Error: Unknown event type | High |
| WH-U-003 | Secret key format | secret = "short" | Warning: Weak secret | Medium |

### EDGE CASE Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| WH-U-004 | Unreachable URL | URL returns timeout | Marked failed, retry scheduled | High |
| WH-U-005 | Slow endpoint | > 30s response | Timeout, retry | Medium |
| WH-U-006 | Error response | URL returns 500 | Marked failed, retry | High |
| WH-U-007 | Duplicate URL | Same URL registered | Error: Already exists | Medium |

### BUSINESS RULE Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| WH-U-008 | Retry logic | First failure | Retry after 1 min | High |
| WH-U-009 | Exponential backoff | Multiple failures | 1m, 5m, 15m delays | Medium |
| WH-U-010 | Payload signature | Verify HMAC | Valid signature in header | High |
| WH-U-011 | Event filtering | Subscribe to "resource.*" | Only resource events sent | Medium |
| WH-U-012 | Disable after failures | 10 consecutive failures | Webhook disabled, admin notified | Medium |

---

## 1.14 CURRENCY MODULE (14 tests)

### VALIDATION Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| CUR-U-001 | Valid currency code | code = "USDD" | Error: Must be 3 chars ISO | High |
| CUR-U-002 | Rate must be positive | rate = 0 | Error: Rate must be > 0 | High |
| CUR-U-003 | Rate must be positive | rate = -1 | Error: Rate must be > 0 | High |
| CUR-U-004 | Valid effective dates | effectiveFrom > effectiveTo | Error: Invalid date range | High |

### EDGE CASE Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| CUR-U-005 | Same currency conversion | USD → USD | Return same amount | Medium |
| CUR-U-006 | Very small amounts | 0.001 USD | Handles precision | Medium |
| CUR-U-007 | Very large amounts | 1 billion USD | No overflow | Medium |
| CUR-U-008 | Historical rate not found | Date = 1990 | Error: No rate for date | Medium |
| CUR-U-009 | Future effective date | effectiveFrom = next month | Valid, not active yet | Medium |

### BUSINESS RULE Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| CUR-U-010 | Only one base currency | Set second as base | Error: Base already exists | High |
| CUR-U-011 | Latest effective rate used | Multiple rates | Most recent returned | High |
| CUR-U-012 | Inverse rate calculation | INR→USD from USD→INR | Calculated correctly | Medium |
| CUR-U-013 | Cannot delete base | Delete USD (base) | Error: Cannot delete base | High |
| CUR-U-014 | Cannot delete with transactions | Delete INR with invoices | Error: Has transactions | High |

---

## 1.15 ROLES MODULE (13 tests)

### VALIDATION Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| ROL-U-001 | Role name uniqueness | Duplicate name | Error: Name already exists | High |
| ROL-U-002 | Valid permission IDs | Invalid permissionId | Error: Permission not found | High |
| ROL-U-003 | Valid hierarchy level | level = 10 | Error: Max level is 5 | Medium |

### EDGE CASE Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| ROL-U-004 | Role with 0 permissions | permissions = [] | Valid (view-only role) | Medium |
| ROL-U-005 | Role with all permissions | All 30+ permissions | Valid (superadmin) | Medium |
| ROL-U-006 | Circular parent reference | A → B → A | Error: Circular reference | High |
| ROL-U-007 | Deep hierarchy | 10 levels deep | Error: Max 5 levels | Medium |

### BUSINESS RULE Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| ROL-U-008 | Cannot delete system roles | Delete "Admin" | Error: System role protected | High |
| ROL-U-009 | Cannot delete with users | Delete role with 5 users | Error: Reassign users first | High |
| ROL-U-010 | Permission inheritance | Child role | Gets parent permissions + own | High |
| ROL-U-011 | Hierarchy level enforcement | Level 3 manages Level 4+ | Cannot manage higher levels | High |
| ROL-U-012 | Audit trail on changes | Update role permissions | Audit log created | Medium |
| ROL-U-013 | Role assignment creates audit | Assign role to user | RoleAssignmentAudit entry | Medium |

---

## 1.16 DOCUMENTS MODULE (14 tests)

### VALIDATION Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| DOC-U-001 | Valid file type | .exe file | Error: File type not allowed | High |
| DOC-U-002 | File size limit | 60MB file | Error: Max 50MB | High |
| DOC-U-003 | Valid classification | classification = "TOP_SECRET" | Error: Invalid classification | High |

### EDGE CASE Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| DOC-U-004 | Empty file upload | 0 bytes | Error: File is empty | Medium |
| DOC-U-005 | File with no extension | "document" | Warning: No extension | Medium |
| DOC-U-006 | Unicode filename | "文档.pdf" | Valid, encoded correctly | Medium |
| DOC-U-007 | Duplicate filename | Same name exists | Renamed: "file (1).pdf" | Medium |

### BUSINESS RULE Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| DOC-U-008 | Version increment | Update document | Version: 1 → 2 | High |
| DOC-U-009 | Access check before download | No permission | Error: Access denied | High |
| DOC-U-010 | Classification-based access | CONFIDENTIAL doc, User role | Access denied | High |
| DOC-U-011 | Time-bound access expiry | Access expired | Error: Access expired | High |
| DOC-U-012 | Audit log on access | Download document | DocumentAccessLog entry | High |
| DOC-U-013 | Cannot delete with references | Doc linked to contract | Error: Has references | Medium |
| DOC-U-014 | Version restore | Restore v1 from v3 | Creates v4 with v1 content | Medium |

---

## 1.17 AGENT MODULE (13 tests)

### VALIDATION Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| AGT-U-001 | Query not empty | query = "" | Error: Query required | High |
| AGT-U-002 | Query length limit | 5000 chars | Error: Max 1000 chars | Medium |
| AGT-U-003 | Valid conversation ID | Invalid conversationId | Error: Conversation not found | Medium |

### EDGE CASE Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| AGT-U-004 | Very long query | 1000 chars exactly | Valid, processed | Medium |
| AGT-U-005 | Query with only special chars | "!@#$%^&*()" | Error: No valid content | Medium |
| AGT-U-006 | Query in non-English | "कितने लोग बेंच पर हैं?" | Handled gracefully | Low |
| AGT-U-007 | Rapid successive queries | 10 queries/second | Rate limited | High |

### BUSINESS RULE Tests

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| AGT-U-008 | Query classification accuracy | "How many on bench?" | Classified as: metrics | High |
| AGT-U-009 | Tier routing correctness | Simple vs complex | T1 vs T3 routing | High |
| AGT-U-010 | Permission-aware responses | Non-admin asks for CTC | Access denied response | High |
| AGT-U-011 | Session memory limits | 20 messages | Only last 10 in context | Medium |
| AGT-U-012 | Feedback storage | Thumbs up/down | Stored with message | Medium |
| AGT-U-013 | Rate limiting per user | 100 queries/hour | Limit enforced | High |

---

# Layer 2: Integration Tests

## 2.1 API ENDPOINT TESTS (35 tests)

| ID | Endpoint | Test Case | Expected | Priority |
|----|----------|-----------|----------|----------|
| INT-API-001 | POST /auth/login | Invalid credentials | 401, error message | High |
| INT-API-002 | POST /auth/login | Locked account | 403, lockout message | High |
| INT-API-003 | POST /auth/login | SSO flow initiation | Redirect to Microsoft | High |
| INT-API-004 | GET /resources | Pagination page=1, limit=10 | First 10 resources | High |
| INT-API-005 | GET /resources | Filter by skill | Matching resources only | High |
| INT-API-006 | GET /resources | Sort by name ASC | Alphabetically sorted | Medium |
| INT-API-007 | POST /allocations | Over-allocation attempt | Warning response | High |
| INT-API-008 | POST /allocations | Overlap detection | Error: Overlapping | High |
| INT-API-009 | POST /allocations | Invalid date range | 400 error | High |
| INT-API-010 | POST /timesheets/submit | Already submitted | Error: Already submitted | High |
| INT-API-011 | POST /timesheets/submit | Future week | Error: Cannot submit future | High |
| INT-API-012 | GET /analytics/executive | Empty data | Zeros, no error | Medium |
| INT-API-013 | GET /analytics/executive | Large date range | Valid response | Medium |
| INT-API-014 | POST /import/resources | Invalid CSV | Error with row details | High |
| INT-API-015 | POST /import/resources | Partial success | Import count + errors | High |
| INT-API-016 | POST /agent/query | Long query | Processed or truncated | Medium |
| INT-API-017 | POST /agent/query | Unauthorized data access | Permission denied response | High |
| INT-API-018 | GET /bench/resources | With practice filter | Filtered results | Medium |
| INT-API-019 | POST /contracts | MSA creation | Created with ID | High |
| INT-API-020 | POST /contracts | SOW without MSA | Error: MSA required | High |
| INT-API-021 | GET /projects/:id | With allocations expanded | Full team list | High |
| INT-API-022 | PUT /resources/:id | Partial update | Only changed fields | Medium |
| INT-API-023 | DELETE /resources/:id | With allocations | Error: Has allocations | High |
| INT-API-024 | POST /export/resources | CSV format | Valid CSV file | High |
| INT-API-025 | POST /export/resources | JSON format | Valid JSON file | High |
| INT-API-026 | GET /webhooks | List all | Paginated list | Medium |
| INT-API-027 | POST /webhooks/test | Send test | Test payload sent | Medium |
| INT-API-028 | GET /currency/convert | USD to INR | Converted amount | High |
| INT-API-029 | GET /currency/convert | Historical rate | Rate at date | Medium |
| INT-API-030 | POST /roles | Create custom role | Created with ID | High |
| INT-API-031 | POST /roles/assign | Assign to user | Assignment created | High |
| INT-API-032 | POST /documents/upload | Valid file | Document created | High |
| INT-API-033 | GET /documents/:id/download | With access | File downloaded | High |
| INT-API-034 | GET /documents/:id/download | Without access | 403 Forbidden | High |
| INT-API-035 | GET /documents/:id/versions | Version history | List of versions | Medium |

---

## 2.2 DATA FLOW TESTS (15 tests)

| ID | Test Case | Trigger | Expected Result | Priority |
|----|-----------|---------|-----------------|----------|
| INT-DF-001 | Resource appears in search | Create resource | Searchable immediately | High |
| INT-DF-002 | Utilization updates | Create allocation | Resource utilization recalculated | High |
| INT-DF-003 | Bench status updates | Delete allocation | Resource → BENCH if no others | High |
| INT-DF-004 | Timesheet in reports | Approve timesheet | Hours in utilization report | High |
| INT-DF-005 | Contract expiry flags | Contract expires | Linked projects flagged | Medium |
| INT-DF-006 | Exchange rate affects conversion | Update rate | New conversions use new rate | High |
| INT-DF-007 | Role permissions active | Assign role | Permissions immediately active | High |
| INT-DF-008 | Document version created | Upload new version | Version number incremented | High |
| INT-DF-009 | Webhook fires on create | Create resource | Webhook payload sent | High |
| INT-DF-010 | Dashboard metrics update | Any change | Dashboard reflects change | Medium |
| INT-DF-011 | Skill match updates | Add skill to resource | Match scores recalculated | Medium |
| INT-DF-012 | Client tier affects contracts | Update client tier | Contract visibility changes | Low |
| INT-DF-013 | Project health recalculates | Budget change | Health status updated | Medium |
| INT-DF-014 | Bench cost recalculates | Resource cost change | Bench cost updated | Medium |
| INT-DF-015 | Audit trail created | Any sensitive action | Audit log entry | High |

---

## 2.3 TRANSACTION TESTS (8 tests)

| ID | Test Case | Operation | Expected | Priority |
|----|-----------|-----------|----------|----------|
| INT-TX-001 | Bulk import atomicity | Import 100 resources, error at 50 | All rolled back | High |
| INT-TX-002 | Allocation creation | Resource + Project + Allocation | All created or none | High |
| INT-TX-003 | Contract chain | MSA → SOW → CR | All linked correctly | High |
| INT-TX-004 | User onboarding | User + Role + Resource | All created atomically | High |
| INT-TX-005 | Project closure | Status + Archive + Notify | All complete or none | Medium |
| INT-TX-006 | Document with access | Doc + Access rules | Both created or none | High |
| INT-TX-007 | Role with permissions | Role + Permissions | Both assigned or none | High |
| INT-TX-008 | Currency with rates | Currency + Initial rate | Both created or none | Medium |

---

## 2.4 CROSS-MODULE TESTS (12 tests)

| ID | Modules | Test Case | Expected | Priority |
|----|---------|-----------|----------|----------|
| INT-XM-001 | Auth → Resources | User creates resource profile | Resource linked to user | High |
| INT-XM-002 | Allocations → Bench | Allocation ends | Resource added to bench | High |
| INT-XM-003 | Timesheets → Analytics | Approved hours | Reflected in utilization | High |
| INT-XM-004 | Contracts → Projects | Contract expires | Projects flagged | Medium |
| INT-XM-005 | Intelligence → Allocations | Accept recommendation | Allocation created | Medium |
| INT-XM-006 | Currency → Analytics | Multi-currency report | Correct conversions | High |
| INT-XM-007 | Roles → All Modules | Permission check | Enforced everywhere | High |
| INT-XM-008 | Documents → Contracts | Link document | Accessible from contract | Medium |
| INT-XM-009 | Webhooks → Resources | Resource created | Webhook fired | High |
| INT-XM-010 | Agent → Resources | Query "find Java devs" | Returns from Resources | High |
| INT-XM-011 | Agent → Analytics | Query "utilization rate" | Returns from Analytics | High |
| INT-XM-012 | Agent → Bench | Query "bench count" | Returns from Bench | High |

---

# Layer 3: API Tests

## 3.1 STATUS CODE TESTS (250 tests)

*For each endpoint, test these status codes:*

| Status | Scenario |
|--------|----------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation) |
| 401 | Unauthorized (no token) |
| 403 | Forbidden (wrong tenant/role) |
| 404 | Not Found |
| 409 | Conflict |
| 500 | Server Error |

### Sample for /resources endpoint:

| ID | Endpoint | Method | Scenario | Expected Code |
|----|----------|--------|----------|---------------|
| API-SC-001 | /resources | GET | Valid request | 200 |
| API-SC-002 | /resources | GET | No auth token | 401 |
| API-SC-003 | /resources | GET | Invalid token | 401 |
| API-SC-004 | /resources | GET | Wrong tenant | 403 |
| API-SC-005 | /resources/:id | GET | Valid ID | 200 |
| API-SC-006 | /resources/:id | GET | Invalid UUID | 400 |
| API-SC-007 | /resources/:id | GET | Non-existent ID | 404 |
| API-SC-008 | /resources | POST | Valid body | 201 |
| API-SC-009 | /resources | POST | Missing required field | 400 |
| API-SC-010 | /resources | POST | Invalid email format | 400 |
| API-SC-011 | /resources | POST | Duplicate employeeId | 409 |
| API-SC-012 | /resources/:id | PUT | Valid update | 200 |
| API-SC-013 | /resources/:id | PUT | Invalid body | 400 |
| API-SC-014 | /resources/:id | DELETE | Valid ID | 200 |
| API-SC-015 | /resources/:id | DELETE | Has allocations | 409 |

*Repeat pattern for all 50+ endpoints = ~250 tests*

---

## 3.2 RESPONSE FORMAT TESTS (30 tests)

| ID | Test Case | Expected Format | Priority |
|----|-----------|-----------------|----------|
| API-RF-001 | GET /resources list | { data: [], meta: { total, page, limit } } | High |
| API-RF-002 | GET /resources/:id | { id, firstName, lastName, ... } | High |
| API-RF-003 | POST /resources | { id, ...created resource } | High |
| API-RF-004 | Error response | { error: { code, message, details } } | High |
| API-RF-005 | Validation error | { error: { code: "VALIDATION", fields: [] } } | High |
| API-RF-006 | Date format | ISO 8601: "2025-12-16T10:30:00Z" | High |
| API-RF-007 | Enum values | Only valid enum strings | High |
| API-RF-008 | Null vs undefined | Consistent handling | Medium |
| API-RF-009 | Nested relations | Properly structured | Medium |
| API-RF-010 | Array response | Always array, never null | High |
| ... | ... | ... | ... |

---

## 3.3 ERROR MESSAGE TESTS (20 tests)

| ID | Scenario | Bad Message | Good Message | Priority |
|----|----------|-------------|--------------|----------|
| API-EM-001 | Missing email | "Validation failed" | "Email is required" | High |
| API-EM-002 | Invalid email | "email: invalid" | "Invalid email format" | High |
| API-EM-003 | Not found | "null reference" | "Resource not found" | High |
| API-EM-004 | Server error | Stack trace | "Internal server error" | High |
| API-EM-005 | Duplicate | "unique constraint" | "Email already exists" | High |
| API-EM-006 | Invalid date | "date parse error" | "Invalid date format" | Medium |
| API-EM-007 | Invalid UUID | "invalid uuid" | "Invalid ID format" | Medium |
| API-EM-008 | File too large | "LIMIT_FILE_SIZE" | "File exceeds 50MB limit" | Medium |
| API-EM-009 | Unauthorized | "jwt malformed" | "Please login again" | High |
| API-EM-010 | Forbidden | "forbidden" | "You don't have permission" | High |
| ... | ... | ... | ... | ... |

---

## 3.4 HEADER TESTS (15 tests)

| ID | Header | Test Case | Expected | Priority |
|----|--------|-----------|----------|----------|
| API-HD-001 | Content-Type | All responses | application/json | High |
| API-HD-002 | Content-Type | File download | application/octet-stream | High |
| API-HD-003 | CORS | Origin allowed | Access-Control-Allow-Origin | High |
| API-HD-004 | CORS | Origin not allowed | No CORS header | High |
| API-HD-005 | X-Request-ID | All responses | UUID present | Medium |
| API-HD-006 | Cache-Control | GET endpoints | max-age or no-cache | Medium |
| API-HD-007 | X-RateLimit-Limit | All responses | Limit number | Medium |
| API-HD-008 | X-RateLimit-Remaining | All responses | Remaining count | Medium |
| API-HD-009 | X-RateLimit-Reset | All responses | Reset timestamp | Medium |
| API-HD-010 | Content-Disposition | File download | attachment; filename=... | High |
| ... | ... | ... | ... | ... |

---

## 3.5 PAGINATION TESTS (20 tests)

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| API-PG-001 | Default pagination | No params | page=1, limit=20 | High |
| API-PG-002 | Custom page | page=2 | Second page | High |
| API-PG-003 | Custom limit | limit=50 | 50 items | High |
| API-PG-004 | Zero limit | limit=0 | Error: Invalid limit | High |
| API-PG-005 | Max limit | limit=1000 | Capped at 100 | High |
| API-PG-006 | Negative page | page=-1 | Error: Invalid page | Medium |
| API-PG-007 | Empty page | page=999 | Empty array | Medium |
| API-PG-008 | Total count | Any request | Accurate total | High |
| API-PG-009 | Last page | page = ceil(total/limit) | Correct items | Medium |
| API-PG-010 | Meta structure | Any request | { total, page, limit, pages } | High |
| ... | ... | ... | ... | ... |

---

## 3.6 AUTHENTICATION TESTS (15 tests)

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| API-AU-001 | No token | Missing Authorization | 401 | High |
| API-AU-002 | Expired token | Token exp < now | 401 | High |
| API-AU-003 | Malformed token | Invalid JWT format | 401 | High |
| API-AU-004 | Wrong algorithm | HS256 vs RS256 | 401 | High |
| API-AU-005 | Valid token | Correct JWT | 200 | High |
| API-AU-006 | Refresh in cookie | HttpOnly cookie | Valid | High |
| API-AU-007 | Refresh reuse | Same token twice | 401, all invalidated | High |
| API-AU-008 | Logout | POST /auth/logout | Token invalidated | High |
| API-AU-009 | Cookie path | Refresh token | Path=/api/auth | Medium |
| API-AU-010 | Cookie flags | Refresh token | Secure, HttpOnly, SameSite | High |
| ... | ... | ... | ... | ... |

---

## 3.7 AUTHORIZATION TESTS (40 tests)

| ID | Test Case | Actor | Action | Expected | Priority |
|----|-----------|-------|--------|----------|----------|
| API-AZ-001 | Tenant isolation | Tenant A | Read Tenant B resource | 403 | High |
| API-AZ-002 | Tenant isolation | Tenant A | Update Tenant B project | 403 | High |
| API-AZ-003 | Tenant isolation | Tenant A | Delete Tenant B contract | 403 | High |
| API-AZ-004 | Role: Employee | Employee | Create resource | 403 | High |
| API-AZ-005 | Role: Employee | Employee | Approve timesheet | 403 | High |
| API-AZ-006 | Role: Manager | Manager | Create resource | 200 | High |
| API-AZ-007 | Role: Manager | Manager | Approve own team | 200 | High |
| API-AZ-008 | Role: Manager | Manager | Approve other team | 403 | High |
| API-AZ-009 | Role: Admin | Admin | All operations | 200 | High |
| API-AZ-010 | Own data | User | Read own profile | 200 | High |
| API-AZ-011 | Own data | User | Read other's CTC | 403 | High |
| API-AZ-012 | Own data | User | Update own timesheet | 200 | High |
| API-AZ-013 | Own data | User | Update other's timesheet | 403 | High |
| API-AZ-014 | Document access | No access | Download CONFIDENTIAL | 403 | High |
| API-AZ-015 | Document access | With access | Download CONFIDENTIAL | 200 | High |
| ... | ... | ... | ... | ... | ... |

---

# Layer 4: UI Tests

## 4.1 COMPONENT TESTS (120 tests)

*Each component: renders, handles props, handles states*

### Layout Components

| ID | Component | Test Case | Expected | Priority |
|----|-----------|-----------|----------|----------|
| UI-CP-001 | MainLayout | Renders with sidebar | Sidebar visible | High |
| UI-CP-002 | MainLayout | Renders with header | Header visible | High |
| UI-CP-003 | MainLayout | Sidebar collapsed on mobile | Hamburger menu | High |
| UI-CP-004 | Sidebar | Active item highlighted | Visual indicator | Medium |
| UI-CP-005 | Sidebar | Navigation works | Route changes | High |
| UI-CP-006 | Header | User info displayed | Name, role visible | Medium |
| UI-CP-007 | Header | Logout button works | Logs out user | High |

### Page Components

| ID | Component | Test Case | Expected | Priority |
|----|-----------|-----------|----------|----------|
| UI-CP-008 | DashboardPage | Renders KPI cards | 4 cards visible | High |
| UI-CP-009 | DashboardPage | Renders charts | Charts load | Medium |
| UI-CP-010 | ResourcesPage | Renders table | Table with headers | High |
| UI-CP-011 | ResourcesPage | Renders filters | Filter controls | High |
| UI-CP-012 | ResourcesPage | Renders pagination | Page controls | High |
| UI-CP-013 | ResourceDetailPage | Renders profile | All fields shown | High |
| UI-CP-014 | ResourceDetailPage | Renders skills | Skills list | High |
| UI-CP-015 | ResourceDetailPage | Renders allocations | Allocation history | Medium |
| UI-CP-016 | ProjectsPage | Renders project cards | Cards visible | High |
| UI-CP-017 | ProjectDetailPage | Renders team | Team members | High |
| UI-CP-018 | AllocationsPage | Renders grid | Allocation grid | High |
| UI-CP-019 | TimesheetsPage | Renders weekly grid | 7-day grid | High |
| UI-CP-020 | BenchAnalysisPage | Renders 5 tabs | All tabs | High |
| ... | ... | ... | ... | ... |

---

## 4.2 INTERACTION TESTS (100 tests)

### Login Flow

| ID | Action | Expected Result | Priority |
|----|--------|-----------------|----------|
| UI-INT-001 | Enter email | Field updates | High |
| UI-INT-002 | Enter password | Field updates (masked) | High |
| UI-INT-003 | Click login | Shows loading | High |
| UI-INT-004 | Success login | Redirect to dashboard | High |
| UI-INT-005 | Failed login | Error message shown | High |
| UI-INT-006 | Click "Forgot Password" | Opens reset form | Medium |

### Resource Management

| ID | Action | Expected Result | Priority |
|----|--------|-----------------|----------|
| UI-INT-007 | Click filter dropdown | Options shown | High |
| UI-INT-008 | Select skill filter | List filtered | High |
| UI-INT-009 | Clear filter | All resources shown | High |
| UI-INT-010 | Click resource row | Navigate to detail | High |
| UI-INT-011 | Click "Add Resource" | Modal opens | High |
| UI-INT-012 | Fill form correctly | Submit enabled | High |
| UI-INT-013 | Submit form | Resource created, toast shown | High |
| UI-INT-014 | Cancel form | Modal closes | Medium |

### Timesheet

| ID | Action | Expected Result | Priority |
|----|--------|-----------------|----------|
| UI-INT-015 | Click cell | Becomes editable | High |
| UI-INT-016 | Enter hours | Cell updates | High |
| UI-INT-017 | Tab to next cell | Focus moves | Medium |
| UI-INT-018 | Enter invalid (25) | Error shown | High |
| UI-INT-019 | Click Submit | Status → PENDING | High |
| UI-INT-020 | Already submitted | Submit disabled | High |

### Agent Widget

| ID | Action | Expected Result | Priority |
|----|--------|-----------------|----------|
| UI-INT-021 | Click widget | Expands | High |
| UI-INT-022 | Type query | Text appears | High |
| UI-INT-023 | Press Enter | Query sent | High |
| UI-INT-024 | Click suggestion | Fills input | Medium |
| UI-INT-025 | Click thumbs up | Feedback recorded | Medium |
| UI-INT-026 | Press Cmd+K | Palette opens | High |

... *Continue for all 100 tests*

---

## 4.3 STATE TESTS (50 tests)

| ID | State | Test Case | Expected | Priority |
|----|-------|-----------|----------|----------|
| UI-ST-001 | Loading | Data fetching | Spinner shown | High |
| UI-ST-002 | Empty | No resources | Empty message shown | High |
| UI-ST-003 | Error | API error | Error message + retry | High |
| UI-ST-004 | Success | Data loaded | Content shown | High |
| UI-ST-005 | Stale | Cache expired | Refresh indicator | Low |
| UI-ST-006 | Optimistic | Create resource | Appears immediately | Medium |
| UI-ST-007 | Rollback | Create fails | Removed from list | Medium |
| ... | ... | ... | ... | ... |

---

## 4.4 RESPONSIVE TESTS (25 tests)

| ID | Viewport | Component | Expected | Priority |
|----|----------|-----------|----------|----------|
| UI-RS-001 | Mobile (375px) | Sidebar | Collapsed/hamburger | High |
| UI-RS-002 | Mobile (375px) | Table | Horizontal scroll or cards | High |
| UI-RS-003 | Mobile (375px) | Charts | Resize correctly | Medium |
| UI-RS-004 | Mobile (375px) | Touch targets | Min 44px | High |
| UI-RS-005 | Mobile (375px) | No horizontal scroll | Page content | High |
| UI-RS-006 | Tablet (768px) | Sidebar | Collapsed | Medium |
| UI-RS-007 | Tablet (768px) | Grid | 2 columns | Medium |
| UI-RS-008 | Desktop (1440px) | Full layout | Sidebar expanded | High |
| ... | ... | ... | ... | ... |

---

## 4.5 ACCESSIBILITY TESTS (30 tests)

| ID | Requirement | Test Case | Expected | Priority |
|----|-------------|-----------|----------|----------|
| UI-A11Y-001 | Images | Alt text present | All images | High |
| UI-A11Y-002 | Forms | Labels for inputs | All inputs labeled | High |
| UI-A11Y-003 | Contrast | Color contrast | WCAG AA (4.5:1) | High |
| UI-A11Y-004 | Keyboard | Tab navigation | All interactive elements | High |
| UI-A11Y-005 | Keyboard | Enter activates buttons | Buttons triggered | High |
| UI-A11Y-006 | Keyboard | Escape closes modals | Modal dismissed | High |
| UI-A11Y-007 | Focus | Visible focus indicator | 2px outline | High |
| UI-A11Y-008 | Screen reader | ARIA labels | Announced correctly | Medium |
| UI-A11Y-009 | Screen reader | Live regions | Updates announced | Medium |
| UI-A11Y-010 | Skip links | Skip to content | Focus jumps | Medium |
| ... | ... | ... | ... | ... |

---

# Layer 5: E2E Tests

## 5.1 AUTHENTICATION FLOWS (6 tests)

| ID | Flow | Steps | Expected | Priority |
|----|------|-------|----------|----------|
| E2E-AUTH-001 | Email login | 1. Open /login 2. Enter email/password 3. Click Login | Dashboard shown | High |
| E2E-AUTH-002 | Microsoft SSO | 1. Click "Sign in with Microsoft" 2. Complete Microsoft auth 3. Redirect back | Dashboard shown | High |
| E2E-AUTH-003 | Logout | 1. Click user menu 2. Click Logout | Login page shown | High |
| E2E-AUTH-004 | Session expiry | 1. Wait for token expiry 2. Make request | Redirect to login | High |
| E2E-AUTH-005 | Invalid credentials | 1. Enter wrong password 2. Click Login | Error message | High |
| E2E-AUTH-006 | Password reset | 1. Click Forgot 2. Enter email 3. Check email 4. Reset | New password works | Medium |

---

## 5.2 RESOURCE MANAGEMENT (6 tests)

| ID | Flow | Steps | Expected | Priority |
|----|------|-------|----------|----------|
| E2E-RES-001 | Create resource | 1. Click Add 2. Fill form 3. Submit | Resource in list | High |
| E2E-RES-002 | Add skills | 1. Open resource 2. Click Add Skill 3. Select skill 4. Save | Skill shown | High |
| E2E-RES-003 | Update resource | 1. Open resource 2. Edit fields 3. Save | Changes saved | High |
| E2E-RES-004 | Search by skill | 1. Enter skill in search 2. View results | Matching resources | High |
| E2E-RES-005 | View profile | 1. Click resource row 2. View detail page | Full profile shown | High |
| E2E-RES-006 | Archive resource | 1. Open resource 2. Click Archive 3. Confirm | Resource archived | Medium |

---

## 5.3 PROJECT & ALLOCATION (6 tests)

| ID | Flow | Steps | Expected | Priority |
|----|------|-------|----------|----------|
| E2E-PROJ-001 | Create project | 1. Click Add 2. Fill form 3. Submit | Project in list | High |
| E2E-PROJ-002 | Allocate resource | 1. Open project 2. Click Allocate 3. Select resource 4. Save | Resource in team | High |
| E2E-PROJ-003 | Extend allocation | 1. Open allocation 2. Change end date 3. Save | Date updated | High |
| E2E-PROJ-004 | End allocation | 1. Open allocation 2. Set end date to today 3. Save | Allocation ended | High |
| E2E-PROJ-005 | View team | 1. Open project 2. View allocations tab | All team members | High |
| E2E-PROJ-006 | Close project | 1. Open project 2. Change status to Completed 3. Save | Project closed | Medium |

---

## 5.4 TIMESHEET (8 tests)

| ID | Flow | Steps | Expected | Priority |
|----|------|-------|----------|----------|
| E2E-TS-001 | Open timesheet | 1. Navigate to Timesheets 2. Select week | Weekly grid shown | High |
| E2E-TS-002 | Enter hours | 1. Click cell 2. Enter hours 3. Tab out | Hours saved | High |
| E2E-TS-003 | Add notes | 1. Click notes icon 2. Enter text 3. Save | Notes saved | Medium |
| E2E-TS-004 | Submit | 1. Fill timesheet 2. Click Submit | Status = PENDING | High |
| E2E-TS-005 | Manager views | 1. Login as manager 2. View pending | Pending list shown | High |
| E2E-TS-006 | Approve | 1. Select timesheet 2. Click Approve | Status = APPROVED | High |
| E2E-TS-007 | Reject | 1. Select timesheet 2. Click Reject 3. Enter reason | Status = REJECTED | High |
| E2E-TS-008 | Re-submit | 1. Open rejected 2. Fix 3. Submit | Status = PENDING | High |

---

*Continue for remaining E2E sections (5.5 - 5.12)...*

---

# Layer 6: Security Tests

## 6.1 AUTHENTICATION SECURITY (18 tests)

### Brute Force Protection

| ID | Test Case | Attack | Expected Defense | Priority |
|----|-----------|--------|------------------|----------|
| SEC-AUTH-001 | Account lockout | 5 wrong passwords | Account locked 15 min | High |
| SEC-AUTH-002 | Lockout escalation | Repeated lockouts | Duration increases | High |
| SEC-AUTH-003 | CAPTCHA trigger | 3 wrong attempts | CAPTCHA required | Medium |
| SEC-AUTH-004 | IP rate limit | 100 req/min same IP | IP blocked temporarily | High |

### Session Security

| ID | Test Case | Attack | Expected Defense | Priority |
|----|-----------|--------|------------------|----------|
| SEC-AUTH-005 | Session fixation | Set session before login | New session on login | High |
| SEC-AUTH-006 | Session timeout | Idle 30+ minutes | Session expired | High |
| SEC-AUTH-007 | Concurrent sessions | Login from 4 devices | Oldest session killed | Medium |
| SEC-AUTH-008 | Session in URL | Session ID in URL | Never exposed | High |

### Token Security

| ID | Test Case | Attack | Expected Defense | Priority |
|----|-----------|--------|------------------|----------|
| SEC-AUTH-009 | JWT tampering | Modify payload | Signature invalid | High |
| SEC-AUTH-010 | JWT expiry | Use expired token | 401 Unauthorized | High |
| SEC-AUTH-011 | Refresh token reuse | Use same token twice | All tokens revoked | High |
| SEC-AUTH-012 | Token in localStorage | Check storage | Not in localStorage | High |

### Password Security

| ID | Test Case | Attack | Expected Defense | Priority |
|----|-----------|--------|------------------|----------|
| SEC-AUTH-013 | Hash algorithm | Check stored hash | Argon2id used | High |
| SEC-AUTH-014 | Unique salt | Compare salts | Different per user | High |
| SEC-AUTH-015 | Password reuse | Use old password | Rejected (last 5) | Medium |
| SEC-AUTH-016 | Password in logs | Search logs | Never logged | High |
| SEC-AUTH-017 | Password in response | Check API response | Never returned | High |
| SEC-AUTH-018 | Timing attack | Compare response times | Constant time | Medium |

---

## 6.2 AUTHORIZATION SECURITY (16 tests)

### Horizontal Privilege Escalation

| ID | Test Case | Attack | Expected Defense | Priority |
|----|-----------|--------|------------------|----------|
| SEC-AZ-001 | Cross-user read | User A reads User B data | 403 Forbidden | High |
| SEC-AZ-002 | Cross-user write | User A edits User B data | 403 Forbidden | High |
| SEC-AZ-003 | Cross-tenant read | Tenant A reads Tenant B | 403 Forbidden | High |
| SEC-AZ-004 | Cross-tenant write | Tenant A writes Tenant B | 403 Forbidden | High |

### Vertical Privilege Escalation

| ID | Test Case | Attack | Expected Defense | Priority |
|----|-----------|--------|------------------|----------|
| SEC-AZ-005 | Employee → Admin | Employee accesses admin route | 403 Forbidden | High |
| SEC-AZ-006 | Manager → Admin | Manager creates role | 403 Forbidden | High |
| SEC-AZ-007 | Bypass role check | Direct API call | Role verified server-side | High |
| SEC-AZ-008 | Manipulate role in JWT | Edit JWT role claim | Signature verification fails | High |

### IDOR (Insecure Direct Object Reference)

| ID | Test Case | Attack | Expected Defense | Priority |
|----|-----------|--------|------------------|----------|
| SEC-AZ-009 | Change ID in URL | /resources/other-id | 403 or 404, no data leak | High |
| SEC-AZ-010 | Sequential ID enum | Try id+1, id+2, ... | UUIDs prevent guessing | High |
| SEC-AZ-011 | Existence oracle | Different error for exists vs not | Same error message | Medium |
| SEC-AZ-012 | Bulk fetch bypass | Request IDs not owned | Only owned returned | High |

### Additional

| ID | Test Case | Attack | Expected Defense | Priority |
|----|-----------|--------|------------------|----------|
| SEC-AZ-013 | Force browse | Direct URL to admin | Redirect to login | High |
| SEC-AZ-014 | HTTP method tampering | GET instead of POST | Method not allowed | Medium |
| SEC-AZ-015 | Parameter pollution | Duplicate params | First value used | Medium |
| SEC-AZ-016 | Mass assignment | Extra fields in body | Ignored or error | High |

---

## 6.3 INPUT SECURITY (22 tests)

### SQL Injection

| ID | Test Case | Payload | Expected | Priority |
|----|-----------|---------|----------|----------|
| SEC-INP-001 | Basic SQLi | ' OR 1=1 -- | Sanitized/escaped | High |
| SEC-INP-002 | Drop table | '; DROP TABLE users; -- | No execution | High |
| SEC-INP-003 | Union injection | ' UNION SELECT * FROM users -- | No data leak | High |
| SEC-INP-004 | Blind SQLi | ' AND SLEEP(5) -- | No delay | High |
| SEC-INP-005 | Parameterized check | All queries | Using prepared statements | High |

### XSS (Cross-Site Scripting)

| ID | Test Case | Payload | Expected | Priority |
|----|-----------|---------|----------|----------|
| SEC-INP-006 | Script tag | `<script>alert('xss')</script>` | Escaped in output | High |
| SEC-INP-007 | Event handler | `<img onerror="alert('xss')">` | Escaped | High |
| SEC-INP-008 | javascript: URL | `javascript:alert('xss')` | Rejected | High |
| SEC-INP-009 | Stored XSS | Save script in name | Escaped on display | High |
| SEC-INP-010 | DOM XSS | URL parameter injection | Sanitized | High |

### Command Injection

| ID | Test Case | Payload | Expected | Priority |
|----|-----------|---------|----------|----------|
| SEC-INP-011 | Shell command | `; rm -rf /` | Not executed | High |
| SEC-INP-012 | Pipe command | `| cat /etc/passwd` | Not executed | High |
| SEC-INP-013 | Backticks | `` `whoami` `` | Not executed | High |

### Path Traversal

| ID | Test Case | Payload | Expected | Priority |
|----|-----------|---------|----------|----------|
| SEC-INP-014 | Directory traversal | `../../../etc/passwd` | Blocked | High |
| SEC-INP-015 | URL encoded | `%2e%2e%2f` | Blocked | High |
| SEC-INP-016 | Null byte | `file.txt%00.jpg` | Blocked | High |

### File Upload

| ID | Test Case | Payload | Expected | Priority |
|----|-----------|---------|----------|----------|
| SEC-INP-017 | Executable | .exe file | Rejected | High |
| SEC-INP-018 | Server script | .php file | Rejected | High |
| SEC-INP-019 | Double extension | file.jpg.php | Rejected | High |
| SEC-INP-020 | MIME mismatch | .jpg with PHP content | Rejected (magic bytes) | High |
| SEC-INP-021 | Huge file | 100MB file | Size limit error | High |
| SEC-INP-022 | Malicious filename | `../../../etc/passwd` | Sanitized | High |

---

*Continue for Security sections 6.4-6.6...*

---

# Layer 7: Performance Tests

## 7.1 LOAD TESTS (15 tests)

| ID | Test Case | Load | Success Criteria | Priority |
|----|-----------|------|------------------|----------|
| PERF-LD-001 | GET /resources list | 50 users, 60s | p95 < 200ms | High |
| PERF-LD-002 | GET /resources/:id | 50 users, 60s | p95 < 100ms | High |
| PERF-LD-003 | GET /projects | 50 users, 60s | p95 < 200ms | High |
| PERF-LD-004 | GET /dashboard | 50 users, 60s | p95 < 300ms | High |
| PERF-LD-005 | GET /analytics | 50 users, 60s | p95 < 500ms | High |
| PERF-LD-006 | POST /timesheets | 50 users, 60s | p95 < 200ms | High |
| PERF-LD-007 | GET /bench | 50 users, 60s | p95 < 300ms | High |
| PERF-LD-008 | POST /agent/query | 50 users, 60s | p95 < 1000ms | High |
| PERF-LD-009 | Sustained throughput | 100 rps, 5m | No errors | High |
| PERF-LD-010 | Concurrent users | 50 users | All succeed | High |
| PERF-LD-011 | Memory under load | 50 users, 5m | Stable (no growth) | High |
| PERF-LD-012 | CPU under load | 50 users, 5m | < 70% | High |
| PERF-LD-013 | DB connections | 50 users | Pool not exhausted | High |
| PERF-LD-014 | Redis connections | 50 users | Stable | Medium |
| PERF-LD-015 | Error rate | 50 users, 5m | < 0.1% | High |

---

## 7.2-7.6 (Stress, Spike, Endurance, Scalability, Feature tests)

*Documented similarly with specific metrics and success criteria...*

---

# Summary

## Test Counts by Layer

| Layer | Tests |
|-------|-------|
| 1. Unit Tests | 213 |
| 2. Integration Tests | 70 |
| 3. API Tests | 390 |
| 4. UI Tests | 325 |
| 5. E2E Tests | 69 |
| 6. Security Tests | 103 |
| 7. Performance Tests | 54 |
| **TOTAL** | **1,224** |

---

## Implementation Priority

### Phase 1: Critical (Week 1)
- Unit Tests: Auth, Resources, Allocations (38 tests)
- API Tests: Status codes for core endpoints (50 tests)
- Security Tests: Auth + Input (40 tests)
- **Total: 128 tests**

### Phase 2: High Priority (Week 2)
- Unit Tests: Remaining high priority (100 tests)
- Integration Tests: All (70 tests)
- E2E Tests: Critical flows (30 tests)
- **Total: 200 tests**

### Phase 3: Medium Priority (Week 3)
- API Tests: Response format, pagination (100 tests)
- UI Tests: Components + interactions (150 tests)
- Security Tests: Authorization (30 tests)
- **Total: 280 tests**

### Phase 4: Complete Coverage (Week 4)
- Remaining Unit Tests (75 tests)
- Remaining API Tests (240 tests)
- Remaining UI Tests (175 tests)
- Remaining Security Tests (33 tests)
- Performance Tests (54 tests)
- Remaining E2E Tests (39 tests)
- **Total: 616 tests**

---

*Document maintained by AI development assistant*
*Version 1.0 - December 16, 2025*


