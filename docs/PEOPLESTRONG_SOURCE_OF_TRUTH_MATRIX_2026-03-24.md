# PeopleStrong Source-of-Truth Matrix

Date: 2026-03-24
Status: Proposal
Scope: People master data ownership between PeopleStrong and RMGaaS

## 1. Purpose

This document defines field-level ownership for people-related data when PeopleStrong is the upstream HR source and RMGaaS is the operational resource-management system.

Core rule:

- PeopleStrong owns employee master data
- RMGaaS owns delivery, staffing, and commercial operations
- shared areas require explicit precedence and conflict rules

This is intentionally a field-level contract, not a vague system-level statement.

## 2. Primary Identity Rule

Canonical match key for PeopleStrong-to-RMG resource sync:

1. `tenantId + employeeId`
2. fallback match: `tenantId + email`

Rationale:

- `employeeId` is stable and already unique per tenant in the current schema
- email can change during lifecycle events and should not be the primary external identity key

## 3. Ownership Categories

The matrix uses four ownership types:

1. `PS_MASTER`
2. `RMG_MASTER`
3. `PS_BASE_RMG_ENRICHED`
4. `SHARED_WITH_REVIEW`

Meaning:

- `PS_MASTER`: PeopleStrong wins automatically
- `RMG_MASTER`: RMGaaS wins; PeopleStrong does not overwrite
- `PS_BASE_RMG_ENRICHED`: PeopleStrong sets the baseline, RMG adds operational overlays
- `SHARED_WITH_REVIEW`: changes may require an exception or approval flow

## 4. Resource Field Ownership

## 4.1 Identity and Core HR Fields

| RMG Field | Ownership | Source Behavior | Notes |
|-----------|-----------|-----------------|-------|
| `employeeId` | `PS_MASTER` | Create and update from PeopleStrong | Stable external identity key |
| `firstName` | `PS_MASTER` | Auto-update | HR legal/master identity |
| `lastName` | `PS_MASTER` | Auto-update | HR legal/master identity |
| `preferredName` | `PS_MASTER` if available, else `RMG_MASTER` | Update from PeopleStrong when provided | RMG may hold interim value until PeopleStrong supports it |
| `email` | `PS_MASTER` | Auto-update with caution | If changed, preserve historical user linkage and create review when login impact exists |
| `phone` | `PS_MASTER` | Auto-update | Treat as employee-contact master data |
| `photoUrl` | `PS_MASTER` if available, else optional | Auto-update if PeopleStrong provides profile image | Non-critical |

## 4.2 Employment Fields

| RMG Field | Ownership | Source Behavior | Notes |
|-----------|-----------|-----------------|-------|
| `employmentType` | `PS_MASTER` | Auto-update | FTE, contractor, etc. |
| `designation` | `PS_MASTER` | Auto-update | HR title |
| `band` | `PS_MASTER` or `SHARED_WITH_REVIEW` | Auto-update only if NewVision confirms HR owns band | Many organizations use HR-owned grade/band |
| `dateOfJoining` | `PS_MASTER` | Auto-update | Joining date is HR truth |
| `dateOfExit` | `PS_MASTER` | Auto-update with operational safeguards | Never hard-delete resource history |
| `exitReason` | `PS_MASTER` | Auto-update | Sensitive but HR-owned |
| `status` | `SHARED_WITH_REVIEW` | Derived from PeopleStrong lifecycle plus RMG operational rules | Avoid silently breaking active allocations |

## 4.3 Org Placement Fields

| RMG Field | Ownership | Source Behavior | Notes |
|-----------|-----------|-----------------|-------|
| `departmentId` | `PS_BASE_RMG_ENRICHED` | Map from PeopleStrong org unit | PeopleStrong provides home org; RMG maps to local department entities |
| `department` legacy string | `PS_BASE_RMG_ENRICHED` | Transitional only | Should not remain the long-term authoritative field |
| `managerId` | `PS_BASE_RMG_ENRICHED` | Map from PeopleStrong manager employee ID | Manager resource must exist or be resolved via deferred linkage |
| `locationId` | `PS_BASE_RMG_ENRICHED` | Map from PeopleStrong location | Requires integration mapping table |
| `gradeBandId` | `PS_BASE_RMG_ENRICHED` or `SHARED_WITH_REVIEW` | Map from HR band/grade if subscribed | Depends on whether PeopleStrong truly owns grade structure |
| `practiceId` | `RMG_MASTER` by default | Do not overwrite from PeopleStrong unless explicitly mapped | Practice is often a delivery construct, not an HR one |

## 4.4 Capacity and Financial Fields

| RMG Field | Ownership | Source Behavior | Notes |
|-----------|-----------|-----------------|-------|
| `capacity` | `RMG_MASTER` | Do not overwrite from PeopleStrong | Operational staffing capacity, may differ from HR FTE data |
| `costPerHour` | `SHARED_WITH_REVIEW` | Optional import from HR/finance source only if approved | Sensitive financial field |
| `billRateDefault` | `RMG_MASTER` | Never overwrite from PeopleStrong | Commercial delivery field |

## 4.5 Operational Status Fields

| RMG Field | Ownership | Source Behavior | Notes |
|-----------|-----------|-----------------|-------|
| `benchSince` | `RMG_MASTER` | Never set from PeopleStrong | Derived from allocations and staffing state |
| `lastAllocatedAt` | `RMG_MASTER` | Never set from PeopleStrong | Operational signal |
| `tags` | `RMG_MASTER` | Never overwrite from PeopleStrong | Local classification |
| `customFields` | `SHARED_WITH_REVIEW` | Namespace by source | Store PeopleStrong metadata in dedicated namespace |

## 5. Related Entity Ownership

## 5.1 Organization Reference Data

| Entity | Ownership | Notes |
|--------|-----------|-------|
| `Location` | `PS_BASE_RMG_ENRICHED` | HR locations can seed baseline; RMG may add operational locations |
| `Department` | `PS_BASE_RMG_ENRICHED` | Home org usually from HR; RMG maps to local hierarchy |
| `Team` | `RMG_MASTER` by default | Teams are often operational, not HR-owned |
| `GradeBand` | `PS_BASE_RMG_ENRICHED` or `RMG_MASTER` | Depends on whether HR grade structure is authoritative |
| `Practice` | `RMG_MASTER` | Delivery construct |

## 5.2 People-to-Org Assignments

| Entity | Ownership | Notes |
|--------|-----------|-------|
| `TeamMember` | `RMG_MASTER` | Operational team membership |
| `ResourceBusinessRole` | `RMG_MASTER` | Business roles for staffing and workflow, not HR titles |
| `User` login account | `RMG_MASTER` | HR does not own app login lifecycle directly |
| `UserRole` system access | `RMG_MASTER` | App permissions stay local |
| `UserInvitation` | `RMG_MASTER` | Tenant app access workflow stays local |

## 5.3 Skills and Capabilities

| Entity | Ownership | Notes |
|--------|-----------|-------|
| `Skill` catalog | `RMG_MASTER` | Already aligned with roadmap: RMGaaS as skills master |
| `ResourceSkill` | `RMG_MASTER` | HR may provide hints, but RMG owns usable skills inventory |

## 5.4 Delivery and Commercial Records

| Entity | Ownership | Notes |
|--------|-----------|-------|
| `Allocation` | `RMG_MASTER` | Never overwritten by PeopleStrong |
| `Project` | `RMG_MASTER` | Delivery-owned |
| `Client` | `RMG_MASTER` | Business-owned |
| `Contract` | `RMG_MASTER` | Commercial-owned |
| `TimesheetEntry` | `RMG_MASTER` | Delivery/finance-owned |
| `Invoice` planned | `RMG_MASTER` | Commercial-owned |

## 6. Event-Level Handling Rules

## 6.1 New Hire

- Create resource from PeopleStrong master data
- Map location, department, manager, and grade if available
- Do not auto-create allocations, projects, roles, or team memberships
- Optionally create an admin task to provision app access

## 6.2 Designation Change

- Update `designation`
- Do not automatically change business roles, workflows, or system permissions
- Create review task only if configured mapping says title change should affect approvals

## 6.3 Manager Change

- Update `managerId`
- Recompute manager-based visibility and approval relationships where needed
- Do not automatically reassign allocations or project ownership

## 6.4 Location Transfer

- Update `locationId`
- Create review if billing region, compliance, or availability rules are affected

## 6.5 Department Transfer

- Update home `departmentId`
- Do not auto-move operational team membership unless policy explicitly allows it

## 6.6 Resignation / Exit

- Set `dateOfExit`
- move status toward inactive or exiting state per policy
- do not delete resource
- do not delete allocations, timesheets, contracts, or project history
- create action items for RM/PMO if active future work exists

## 7. Conflict Rules

## 7.1 Auto-apply without review

- first name, last name
- preferred name when PeopleStrong supplies it
- phone
- designation
- employment type
- joining date
- manager change when manager mapping is unambiguous

## 7.2 Apply with exception logging

- email change
- department change
- location change
- grade/band change

## 7.3 Require review before full operational effect

- termination when future allocations exist
- change that would deactivate an active user with pending approvals
- cost-related updates if PeopleStrong is later allowed to feed cost data

## 8. Integration Mapping Requirements

PeopleStrong values cannot be written directly into relational IDs without a mapping layer.

Required mapping sets:

- PeopleStrong location code -> `Location.id`
- PeopleStrong department code -> `Department.id`
- PeopleStrong manager employee ID -> `Resource.id`
- PeopleStrong grade/band code -> `GradeBand.id`

Optional mapping sets:

- PeopleStrong org unit -> `Practice.id`
- PeopleStrong title family -> `BusinessRole.id` only if explicitly approved

## 9. Recommended Policy Decisions

Recommended default policy for NewVision:

1. PeopleStrong is master for identity, employment, manager, home org, and location
2. RMGaaS is master for skills, teams, business roles, capacity, allocations, projects, contracts, timesheets, and invoicing
3. `practiceId` remains RMG-owned unless NewVision explicitly decides to map HR org units to practices
4. `billRateDefault` remains strictly RMG-owned
5. `costPerHour` remains outside PeopleStrong sync unless Finance approves that integration

## 10. Success Criteria

This contract is working when:

- PeopleStrong changes update employee master data without corrupting delivery state
- RMG operational data survives employee lifecycle changes intact
- field ownership is deterministic and auditable
- admin users can see which fields are HR-owned versus locally managed
- exceptions are queued instead of causing silent destructive updates