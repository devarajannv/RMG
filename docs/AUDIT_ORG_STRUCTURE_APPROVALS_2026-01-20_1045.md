# System Audit: Org Structure & Approval Functions
## From the Perspective of "Reporting = Org Structure" and "Approvals = Functions (Hats)"

**Audit Date:** January 20, 2026  
**Auditor:** AI Assistant (Claude)  
**Scope:** Full codebase analysis - schema, services, controllers, frontend  
**Last Updated:** January 20, 2026 @ 14:00 IST  

---

## 🎉 Implementation Update (January 20, 2026)

**The recommendations from this audit have been implemented!**

### What Was Done

1. ✅ **New Models Added**
   - `ApprovalFunction` - Defines approval capabilities ("hats")
   - `FunctionAssignment` - Tracks who holds what function
   
2. ✅ **New API Endpoints**
   - `GET /api/v1/functions` - List all functions
   - `POST /api/v1/functions` - Create function
   - `GET /api/v1/functions/:id/holders` - Get who holds a function
   - `POST /api/v1/functions/:id/assignments` - Assign function to user
   - `DELETE /api/v1/assignments/:id` - Revoke assignment
   - `POST /api/v1/assignments/:id/delegate` - Delegate function

3. ✅ **Approver Resolution Updated**
   - Added `FUNCTION` to `ApproverType` enum
   - Added `approvalFunctionId` to `ApprovalStep`
   - Updated `resolveStepApprovers()` to dynamically resolve function holders

4. ✅ **System Functions Seeded**
   - RESOURCE_ALLOCATOR, LEAVE_APPROVER, TIMESHEET_APPROVER
   - PRACTICE_HEAD, PROJECT_MANAGER, HIRING_MANAGER
   - BUDGET_APPROVER, TRAVEL_APPROVER, EXPENSE_APPROVER, ASSET_APPROVER

### What Remains

- [ ] Frontend UI for managing functions
- [ ] Workflow builder UI to select FUNCTION approver type
- [ ] Delegation UI for temporary function transfers

---

## Executive Summary

### The New Design Philosophy

| Concept | Definition | Status in Current System |
|---------|------------|-------------------------|
| **Org Structure** | Defined by reporting relationships (who reports to whom) | ⚠️ PARTIALLY ALIGNED |
| **Approval Functions** | "Hats" that anyone can wear at a given time - not tied to people | ❌ NOT IMPLEMENTED |

### Key Finding

**The current system conflates "Approvers" with "People" instead of treating approvals as assignable functions.**

Current: `ApprovalStep → approverUserId` (hard-coded person)  
Needed: `ApprovalStep → functionCode` → `FunctionAssignment → userId` (dynamic)

---

## Part 1: Org Structure Analysis

### 1.1 What Defines Org Structure Today

**Schema Location:** [schema.prisma](../apps/api/prisma/schema.prisma)

#### Current Fields (Resource Model - Lines 207-286)

```prisma
model Resource {
  // ✅ CORRECT: Reporting relationship
  managerId  String?   @db.Uuid
  manager    Resource? @relation("ResourceManager", fields: [managerId], references: [id])
  
  // ⚠️ REDUNDANT: These create parallel hierarchies
  practiceId    String?   @db.Uuid    // Practice membership
  departmentId  String?   @db.Uuid    // Department membership
  
  // Direct reports (derived from managerId)
  directReports Resource[] @relation("ResourceManager")
}
```

#### Assessment

| Aspect | Status | Notes |
|--------|--------|-------|
| `managerId` on Resource | ✅ EXISTS | Core reporting relationship - this is correct |
| Manager hierarchy traversal | ✅ EXISTS | Can walk up the tree via `managerId` |
| Redundant `departmentId` | ⚠️ CONFLICTS | Creates separate hierarchy that may not match reporting |
| Redundant `practiceId` | ⚠️ CONFLICTS | Another separate hierarchy |

#### Verdict: Partially Aligned

The `managerId` field correctly captures reporting structure, but the system also has `departmentId` and `practiceId` which create competing hierarchies. Per the new philosophy, these should be **tags/groupings** for aggregation, NOT structural definitions.

---

### 1.2 Organization Structure Tables (Redundant?)

**Schema Location:** Lines 2849-2969

```prisma
model Department {
  id         String         @id
  parentId   String?        // Hierarchical departments
  headId     String?        // Department head
  ...
}

model Team {
  id           String       @id
  departmentId String       // Team belongs to department
  leadId       String?      // Team lead
  ...
}
```

#### Assessment

| Table | Purpose | New Philosophy |
|-------|---------|----------------|
| `Department` | Hierarchical org structure | Should be **grouping tag**, not structure |
| `Department.headId` | Links to a person | Should be **function assignment**, not direct link |
| `Team` | Sub-grouping within department | Should be **grouping tag** |
| `Team.leadId` | Links to a person | Should be **function assignment** |

#### Verdict: NEEDS REDESIGN

These tables impose a rigid Department → Team hierarchy. In the new model:
- Structure comes from `Resource.managerId` only
- Departments/Teams become flexible groupings for reporting/filtering
- "Department Head" and "Team Lead" become **functions** anyone can hold

---

### 1.3 Practice Model (Another Hierarchy)

**Schema Location:** Lines 641-673

```prisma
model Practice {
  id       String    @id
  headId   String?   @db.Uuid
  head     Resource? @relation("PracticeHead", fields: [headId], references: [id])
  parentId String?   @db.Uuid  // Hierarchical practices
  parent   Practice? @relation("PracticeHierarchy", fields: [parentId], references: [id])
}
```

#### Assessment

| Aspect | Status | Notes |
|--------|--------|-------|
| `Practice.headId` | ⚠️ HARD-CODED | Links Practice Head directly to a person |
| `Practice.parentId` | ⚠️ REDUNDANT | Creates another hierarchy competing with reporting |

#### Verdict: Practice Head should be a FUNCTION

Currently: `Practice → headId → Resource`  
Should be: `FunctionAssignment(function: "PRACTICE_HEAD", scope: "practice:utilities") → userId`

---

## Part 2: Approval System Analysis

### 2.1 Current Approval Chain Structure

**Schema Location:** Lines 1494-1600 (ApprovalChain, ApprovalStep)  
**Service Location:** [approval-chain.service.ts](../apps/api/src/modules/requests/approval-chain.service.ts)

#### ApprovalStep Model

```prisma
model ApprovalStep {
  // Approver Type
  approverType   ApproverType   // ROLE, USER, MANAGER, PRACTICE_HEAD, etc.
  
  // Direct User Assignment (PROBLEMATIC)
  approverUserId String? @db.Uuid
  approverUser   User?   @relation(...)
  
  // Role-based Assignment (BETTER)
  approverRoleId String? @db.Uuid
  approverRole   Role?   @relation(...)
  
  // Fallback
  fallbackType   ApproverType?
  fallbackUserId String? @db.Uuid
}
```

#### ApproverType Enum (Lines 2509-2520)

```prisma
enum ApproverType {
  ROLE             // ⚠️ Tied to system Role
  USER             // ❌ Hard-coded to a person
  MANAGER          // ✅ Dynamic (from Resource.managerId)
  RESOURCE_MANAGER // ✅ Dynamic
  PRACTICE_HEAD    // ⚠️ Hard-coded via Practice.headId
  PROJECT_MANAGER  // ⚠️ Hard-coded via Project.managerId
  CONTRACT_OWNER   // ⚠️ Hard-coded
  CUSTOM           // Unclear
}
```

### 2.2 Approver Resolution Logic

**Location:** [approval-chain.service.ts](../apps/api/src/modules/requests/approval-chain.service.ts) Lines 590-830

```typescript
async function resolveStepApprovers(tenantId, step, request) {
  switch (step.approverType) {
    case 'USER':
      // ❌ HARD-CODED: Returns specific userId
      if (step.approverUserId) {
        approvers.push({ userId: step.approverUserId, ... });
      }
      break;

    case 'ROLE':
      // ⚠️ SYSTEM ROLE: Finds all users with a system role
      const roleUsers = await prisma.userRole.findMany({...});
      break;

    case 'MANAGER':
      // ✅ DYNAMIC: Uses reporting relationship
      const managerId = request.resource?.managerId;
      break;

    case 'PRACTICE_HEAD':
      // ⚠️ HARD-CODED: Uses Practice.headId (person, not function)
      practiceLeadId = request.resource.practice.leadId;
      break;
  }
}
```

#### Assessment

| ApproverType | Implementation | New Philosophy |
|--------------|----------------|----------------|
| `USER` | Hard-coded userId | ❌ Should be FUNCTION |
| `ROLE` | System permissions role | ⚠️ Conflates permissions with approval functions |
| `MANAGER` | From reporting chain | ✅ CORRECT - uses org structure |
| `RESOURCE_MANAGER` | From reporting chain | ✅ CORRECT |
| `PRACTICE_HEAD` | From Practice.headId | ❌ Should be FUNCTION |
| `PROJECT_MANAGER` | From Project.managerId | ⚠️ Could be function |
| `CONTRACT_OWNER` | From Contract.accountMgrId | ⚠️ Could be function |

---

### 2.3 Delegation System

**Schema Location:** Lines 1976-2030

```prisma
model Delegation {
  delegatorId    String  // Person delegating
  delegateId     String  // Person receiving delegation
  requestTypeIds String[] // Which request types
  startDate      DateTime
  endDate        DateTime
}
```

**Service Location:** [approval-chain.service.ts](../apps/api/src/modules/requests/approval-chain.service.ts) Lines 833-855

```typescript
async function checkDelegation(userId) {
  const delegation = await prisma.delegation.findFirst({
    where: {
      delegatorId: userId,
      approvalStatus: 'APPROVED',
      startDate: { lte: now },
      endDate: { gte: now },
    }
  });
  return delegation;
}
```

#### Assessment

| Aspect | Status | Notes |
|--------|--------|-------|
| Time-bound delegation | ✅ EXISTS | Start/end dates supported |
| Request type scoping | ✅ EXISTS | Can limit to specific types |
| User-to-user model | ⚠️ PERSON-BASED | Delegates from person to person |

#### Verdict: NEEDS EVOLUTION

Current delegation is **person-to-person**: "John delegates to Mary"

New model should be **function-to-person**: "RESOURCE_ALLOCATOR function is assigned to Mary (temporarily)"

---

## Part 3: What's FINISHED

### ✅ 3.1 Core Reporting Structure

| Component | Location | Status |
|-----------|----------|--------|
| `Resource.managerId` | schema.prisma:218 | ✅ Complete |
| `Resource.directReports` | schema.prisma:264 | ✅ Complete |
| Manager hierarchy traversal | approval-chain.service.ts | ✅ Works |
| MANAGER approver type | Enum + resolution logic | ✅ Works correctly |
| RESOURCE_MANAGER approver type | Enum + resolution logic | ✅ Works correctly |

### ✅ 3.2 Workflow Engine Core

| Component | Location | Status |
|-----------|----------|--------|
| ApprovalChain model | schema.prisma:1494-1541 | ✅ Complete |
| ApprovalStep model | schema.prisma:1543-1600 | ✅ Complete |
| Chain CRUD | approval-chain.service.ts | ✅ Complete |
| Step management | approval-chain.service.ts | ✅ Complete |
| Request flow | request.service.ts | ✅ Complete |
| Delegation (basic) | schema + service | ✅ Complete |

### ✅ 3.3 Request System

| Component | Lines/Files | Status |
|-----------|-------------|--------|
| Request model | 1625-1750 | ✅ Complete (45 fields) |
| RequestApproval model | 1752-1820 | ✅ Complete |
| Request types | 1390-1470 | ✅ 10+ types defined |
| Request service | 3500+ lines | ✅ Full lifecycle |
| SLA tracking | Built into Request | ✅ Complete |

### ✅ 3.4 Frontend Workflow Builder

| Component | Status |
|-----------|--------|
| Visual workflow builder | ✅ Exists (WorkflowBuilderPage.tsx) |
| Step configuration UI | ✅ Exists |
| Delegation toggle | ✅ Exists |
| Role/User picker | ✅ Exists |

---

## Part 4: What's NOT DONE (Required Changes)

### ❌ 4.1 Approval Functions (New Concept)

**Status:** NOT IMPLEMENTED

**What's Needed:**

```prisma
// NEW: Approval Function Definition
model ApprovalFunction {
  id          String   @id @default(uuid())
  tenantId    String
  
  code        String   // "RESOURCE_ALLOCATOR", "LEAVE_APPROVER", etc.
  name        String
  description String?
  
  // Scope definition
  scopeType   ScopeType  // TENANT, PRACTICE, DEPARTMENT, PROJECT
  
  // Can be held by multiple people
  allowMultiple Boolean @default(true)
  
  // Behavior
  requiresApproval Boolean @default(false) // Does assignment need approval?
  canDelegate      Boolean @default(true)
  
  status      EntityStatus @default(ACTIVE)
  isSystem    Boolean @default(false)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([tenantId, code])
}

// NEW: Who holds what function
model FunctionAssignment {
  id             String    @id @default(uuid())
  tenantId       String
  
  functionId     String    // Links to ApprovalFunction
  userId         String    // Who holds the function
  
  // Scoping
  scopeType      ScopeType?
  scopeId        String?   // e.g., practiceId, departmentId
  
  // Time bounds
  effectiveFrom  DateTime  @default(now())
  effectiveTo    DateTime?
  
  // Delegation info
  isDelegated    Boolean   @default(false)
  delegatedFromId String?  // Original holder
  
  // Assignment tracking
  assignedBy     String
  assignedAt     DateTime  @default(now())
  
  status         EntityStatus @default(ACTIVE)
  
  @@index([tenantId, functionId, status])
  @@index([tenantId, userId, status])
}

enum ScopeType {
  TENANT
  PRACTICE
  DEPARTMENT
  PROJECT
  TEAM
}
```

**Effort Estimate:** 2-3 days (schema + service + migration)

---

### ❌ 4.2 Update ApprovalStep to Use Functions

**Current:**
```prisma
model ApprovalStep {
  approverType   ApproverType
  approverUserId String?       // ❌ Hard-coded person
  approverRoleId String?       // ⚠️ System role
}
```

**Needed:**
```prisma
model ApprovalStep {
  approverType   ApproverType
  
  // NEW: Function-based approval
  approvalFunctionId String?   // Links to ApprovalFunction
  
  // KEEP: For truly dynamic resolution
  // approverUserId - REMOVE or deprecate
  // approverRoleId - KEEP for backward compatibility
}
```

**Effort Estimate:** 1-2 days (schema change + service updates)

---

### ❌ 4.3 Update Approver Resolution

**Location:** approval-chain.service.ts:resolveStepApprovers()

**Current:** Hardcoded lookups to Practice.headId, Project.managerId, etc.

**Needed:**
```typescript
async function resolveStepApprovers(tenantId, step, request) {
  // NEW: Function-based resolution
  if (step.approvalFunctionId) {
    const assignments = await prisma.functionAssignment.findMany({
      where: {
        tenantId,
        functionId: step.approvalFunctionId,
        status: 'ACTIVE',
        effectiveFrom: { lte: now },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: now } }
        ],
        // Scope matching based on request context
        ...scopeFilter
      }
    });
    return assignments.map(a => ({ userId: a.userId, ... }));
  }
  
  // KEEP: Dynamic resolution for MANAGER, RESOURCE_MANAGER
  // These correctly use org structure (reporting line)
}
```

**Effort Estimate:** 2 days

---

### ❌ 4.4 Refactor Department/Team as Tags

**Current:** Department and Team are structural entities with hierarchy.

**Needed:** Convert to flexible groupings/tags.

```prisma
// Option A: Generic OrgGroup
model OrgGroup {
  id          String   @id
  tenantId    String
  type        String   // "department", "team", "practice", "location", etc.
  code        String
  name        String
  parentId    String?  // Optional hierarchy within type
  
  // Metadata
  attributes  Json?    // Flexible key-value
}

model ResourceGroupMembership {
  resourceId  String
  groupId     String
  isPrimary   Boolean @default(false)
  joinedAt    DateTime
}
```

**Alternative:** Keep Department/Team but treat them as **tags** in business logic, not structural definitions.

**Effort Estimate:** 3-5 days (significant refactor)

---

### ❌ 4.5 Remove Hard-coded Head/Lead References

**Current:**
- `Practice.headId` - Hard-coded
- `Project.managerId` - Hard-coded
- `Team.leadId` - Hard-coded
- `Department.headId` - Hard-coded

**Needed:** Replace with function assignments.

| Current | New |
|---------|-----|
| `Practice.headId` | `FunctionAssignment(function: "PRACTICE_HEAD", scope: practice)` |
| `Project.managerId` | `FunctionAssignment(function: "PROJECT_MANAGER", scope: project)` |
| `Team.leadId` | `FunctionAssignment(function: "TEAM_LEAD", scope: team)` |
| `Department.headId` | `FunctionAssignment(function: "DEPARTMENT_HEAD", scope: department)` |

**Effort Estimate:** 3-4 days (schema + migration + service + UI)

---

### ❌ 4.6 Function Assignment UI

**Status:** NOT IMPLEMENTED

**Needed:**
- Admin UI to define approval functions
- UI to assign functions to users
- UI to view who holds which functions
- Self-service delegation UI (time-bound function transfer)

**Effort Estimate:** 3-4 days (frontend)

---

### ❌ 4.7 Update Onboarding Flow

**Current Onboarding Phases (onboarding.service.ts):**
1. Organization Identity
2. Organization Structure (Departments, Teams) ← NEEDS CHANGE
3. Business Roles
4. People Setup
5. Governance

**Needed Updates:**
- Phase 2: Rename to "Groupings" (flexible tags, not rigid structure)
- Phase 3: Add "Approval Functions" definition
- Phase 4: Add "Function Assignments" to People Setup
- Phase 5: Update Governance to use functions

**Effort Estimate:** 2-3 days

---

## Part 5: Summary Tables

### 5.1 Completion Status by Concept

| Concept | Current State | Aligned with New Philosophy? | Effort to Fix |
|---------|---------------|------------------------------|---------------|
| Reporting Structure (managerId) | ✅ Complete | ✅ YES | None |
| Approval Functions | ❌ Not Built | ❌ NO | 3-4 days |
| Function Assignments | ❌ Not Built | ❌ NO | 2-3 days |
| Function-based Approval Steps | ❌ Not Built | ❌ NO | 2 days |
| Department/Team as Tags | ⚠️ Exists as Structure | ⚠️ PARTIAL | 3-5 days |
| Practice Head as Function | ❌ Hard-coded | ❌ NO | 2 days |
| Project Manager as Function | ❌ Hard-coded | ❌ NO | 2 days |
| Delegation (Person-to-Person) | ✅ Complete | ⚠️ PARTIAL | 1-2 days to evolve |
| Onboarding Flow | ✅ Complete | ⚠️ NEEDS UPDATE | 2-3 days |

### 5.2 Total Effort Estimate

| Category | Effort |
|----------|--------|
| Schema Changes | 3-4 days |
| Service Layer | 4-5 days |
| Frontend | 4-5 days |
| Testing & Migration | 2-3 days |
| **TOTAL** | **13-17 days** |

---

## Part 6: Recommended Implementation Order

### Phase A: Foundation (5-6 days)
1. Create `ApprovalFunction` model
2. Create `FunctionAssignment` model
3. Build basic CRUD services
4. Build admin UI for functions

### Phase B: Integration (4-5 days)
5. Update `ApprovalStep` to support functions
6. Update approver resolution logic
7. Migrate existing hard-coded heads to function assignments
8. Update Workflow Builder UI

### Phase C: Cleanup (4-6 days)
9. Refactor Department/Team to be groupings (optional)
10. Remove deprecated hard-coded fields (Practice.headId, etc.)
11. Update onboarding flow
12. Comprehensive testing

---

## Appendix A: Database Current State

**Audit Timestamp:** January 20, 2026 @ 10:30 IST

```sql
-- Current data (after cleanup on Jan 6, 2026)
Users: 1 (admin@newvision.in)
Roles: 4 (Admin, Resource Manager, Project Manager, Employee)
Tenants: 1 (NewVision Software)
Resources: 0 (cleaned for CSV import)
All other entities: 0
```

---

## Appendix B: Files Requiring Changes

### Schema
- `apps/api/prisma/schema.prisma` - Add ApprovalFunction, FunctionAssignment; update ApprovalStep

### Services
- `apps/api/src/modules/requests/approval-chain.service.ts` - Update approver resolution
- NEW: `apps/api/src/modules/functions/` - New module for function management

### Frontend
- `apps/frontend/src/pages/WorkflowBuilderPage.tsx` - Update step configuration
- NEW: `apps/frontend/src/pages/FunctionsPage.tsx` - Admin UI for functions
- `apps/frontend/src/features/onboarding/` - Update onboarding flow

### Documentation
- `ARCHITECTURE.md` - Update with new philosophy
- `docs/REQUEST_FLOW_SYSTEM.md` - Update approval documentation

---

**End of Audit**

*Generated by AI Assistant on January 20, 2026*
