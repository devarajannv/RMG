# Implementation Plan: Approval Functions & Org Structure Redesign

**Document Created:** January 20, 2026 @ 11:45 IST  
**Last Updated:** January 20, 2026 @ 14:00 IST  
**Author:** AI Assistant (Claude)  
**Status:** ✅ PHASE 1 COMPLETE - Core Implementation Done  
**Estimated Duration:** 13-17 working days  

---

## 🎉 Implementation Status Summary

### ✅ COMPLETED (January 20, 2026)

| Task | Status | Details |
|------|--------|---------|
| Database Schema | ✅ DONE | Added `ApprovalFunction`, `FunctionAssignment` models |
| Migration | ✅ DONE | `20260120080411_add_approval_functions` applied |
| Backend Service | ✅ DONE | `functions.service.ts` with full CRUD |
| REST API | ✅ DONE | Endpoints at `/api/v1/functions` and `/api/v1/assignments` |
| Approver Resolution | ✅ DONE | `FUNCTION` type added to `resolveStepApprovers()` |
| System Functions | ✅ DONE | 10 default functions seeded |
| Validation | ✅ DONE | API tested and working |

### 📋 Pending (Future Phases)

| Task | Priority | Notes |
|------|----------|-------|
| Frontend UI for function management | HIGH | Add to admin panel |
| Workflow builder integration | HIGH | Allow FUNCTION approver type selection |
| Audit logging | MEDIUM | Track function assignments |
| Delegation UI | MEDIUM | UI for temporary delegation |

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Design Philosophy](#2-design-philosophy)
3. [Implementation Tasks](#3-implementation-tasks)
4. [Database Changes](#4-database-changes)
5. [Impacted Modules](#5-impacted-modules)
6. [Validation Plan](#6-validation-plan)
7. [Rollback Strategy](#7-rollback-strategy)
8. [Timeline](#8-timeline)

---

## 1. Problem Statement

### 1.1 Current State

The system conflates **organizational structure** with **approval authority**:

| Current Behavior | Problem |
|-----------------|---------|
| `Practice.headId` points to a person | If person is on leave, approvals are stuck |
| `ApprovalStep.approverUserId` is hard-coded | Cannot dynamically reassign approval authority |
| Department/Team are rigid hierarchies | Doesn't match how orgs actually work |
| Delegation is person-to-person | Should be function-to-person |

### 1.2 Desired State

| Concept | New Behavior |
|---------|--------------|
| **Org Structure** | Defined ONLY by `Resource.managerId` (reporting line) |
| **Approval Authority** | Defined by **Functions** (hats anyone can wear) |
| **Departments/Teams** | Flexible groupings for reporting/filtering, not structural |
| **Delegation** | Transfer of function, not person-to-person handoff |

### 1.3 Business Impact of Not Fixing

1. **Approval bottlenecks** - When Practice Head is unavailable, work stops
2. **Rigid org structure** - Can't accommodate matrix organizations
3. **Poor scalability** - Adding new approval types requires code changes
4. **Compliance risk** - Audit trail doesn't show function-based accountability

---

## 2. Design Philosophy

### 2.1 The Two Separations

```
┌─────────────────────────────────────────────────────────────────┐
│  SEPARATION 1: Structure vs Authority                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ORG STRUCTURE (Who reports to whom)                           │
│  ════════════════════════════════════                          │
│  Resource.managerId → Creates org chart                        │
│  • Defines visibility (managers see team data)                 │
│  • Defines accountability (who is responsible)                 │
│  • Rarely changes (reorgs)                                     │
│                                                                 │
│  APPROVAL AUTHORITY (Who can approve what)                     │
│  ═════════════════════════════════════════                     │
│  FunctionAssignment → Who holds what "hat"                     │
│  • Defines who can take action                                 │
│  • Changes frequently (delegation, rotation)                   │
│  • Multiple people can hold same function                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  SEPARATION 2: System Roles vs Business Functions              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SYSTEM ROLE (What can they do in the app)                     │
│  ═════════════════════════════════════════                     │
│  Role model - Admin, Manager, User, Read-Only                  │
│  • Controls UI access, menu visibility                         │
│  • Controls API permissions                                    │
│  • One per user                                                │
│                                                                 │
│  APPROVAL FUNCTION (What business action can they approve)     │
│  ═════════════════════════════════════════════════════════     │
│  ApprovalFunction model - RESOURCE_ALLOCATOR, LEAVE_APPROVER   │
│  • Controls approval workflow steps                            │
│  • Multiple per user                                           │
│  • Can be scoped (practice, project, etc.)                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Implementation Tasks

### Task 1: Create ApprovalFunction Model

#### 3.1.1 What is to be fixed?
Add a new database model `ApprovalFunction` to define approval capabilities as abstract "hats" that can be assigned to anyone.

#### 3.1.2 Where?
| File | Location | Action |
|------|----------|--------|
| `apps/api/prisma/schema.prisma` | After line 3193 (end of file) | ADD new model |

#### 3.1.3 Why does it need to be fixed?
Currently, approval authority is hard-coded:
- `Practice.headId` (line 648) - Links practice head directly to a person
- `ApprovalStep.approverUserId` (line 1557) - Links approval step to a specific user
- These cannot be dynamically reassigned without changing the source record

#### 3.1.4 New Schema Definition
```prisma
// =============================================================================
// APPROVAL FUNCTIONS (Business Capabilities as "Hats")
// =============================================================================

model ApprovalFunction {
  id          String   @id @default(uuid()) @db.Uuid
  tenantId    String   @db.Uuid
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  // Identity
  code        String   @db.VarChar(50)   // RESOURCE_ALLOCATOR, LEAVE_APPROVER, etc.
  name        String   @db.VarChar(100)
  description String?  @db.VarChar(500)
  category    FunctionCategory @default(APPROVAL)
  
  // Scope Configuration
  scopeType   FunctionScopeType @default(TENANT)  // Where can this function operate
  
  // Behavior
  allowMultipleHolders Boolean @default(true)   // Can multiple people hold this?
  requiresApproval     Boolean @default(false)  // Does assignment need approval?
  canDelegate          Boolean @default(true)   // Can holder delegate?
  maxDelegationDays    Int?                     // Max delegation period
  
  // Status
  status      EntityStatus @default(ACTIVE)
  isSystem    Boolean      @default(false)      // System-defined vs tenant-defined
  sortOrder   Int          @default(0)
  
  // Audit
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
  
  // Relations
  assignments    FunctionAssignment[]
  approvalSteps  ApprovalStep[]  @relation("StepApprovalFunction")
  
  @@unique([tenantId, code])
  @@index([tenantId, status])
  @@index([tenantId, category])
}

enum FunctionCategory {
  APPROVAL        // Can approve requests
  MANAGEMENT      // Can manage entities (projects, teams)
  FINANCIAL       // Can approve financial decisions
  ADMINISTRATIVE  // Administrative functions
  CUSTOM          // Tenant-defined
}

enum FunctionScopeType {
  TENANT          // Org-wide
  PRACTICE        // Within a practice
  DEPARTMENT      // Within a department
  PROJECT         // Within a project
  TEAM            // Within a team
}
```

#### 3.1.5 Impacted Modules
| Module | Impact Type | Reason |
|--------|-------------|--------|
| `apps/api/src/modules/requests/` | Enhancement | Will use functions for approver resolution |
| `apps/api/src/modules/onboarding/` | Enhancement | Will include function setup in onboarding |
| NEW: `apps/api/src/modules/functions/` | New Module | CRUD for approval functions |

#### 3.1.6 Tables Affected
| Table | Change Type | Reason |
|-------|-------------|--------|
| `ApprovalFunction` | NEW | Core function definition |
| `Tenant` | ADD RELATION | Tenant has many functions |

#### 3.1.7 Expected Outcome
- Admin can define approval functions like "Resource Allocator", "Leave Approver"
- Functions are tenant-scoped (each org defines their own)
- System functions are seeded (cannot be deleted)

#### 3.1.8 Validation Criteria
```sql
-- After implementation, verify:

-- 1. Table exists with correct structure
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'ApprovalFunction';

-- 2. System functions are seeded
SELECT code, name, isSystem FROM "ApprovalFunction" 
WHERE "isSystem" = true;
-- Expected: RESOURCE_ALLOCATOR, LEAVE_APPROVER, TIMESHEET_APPROVER, etc.

-- 3. Tenant can create custom function
-- Test via API: POST /api/functions
```

---

### Task 2: Create FunctionAssignment Model

#### 3.2.1 What is to be fixed?
Add a model to track who holds which function, with time bounds and scope.

#### 3.2.2 Where?
| File | Location | Action |
|------|----------|--------|
| `apps/api/prisma/schema.prisma` | After ApprovalFunction model | ADD new model |

#### 3.2.3 Why does it need to be fixed?
Currently, there's no way to:
- Assign approval authority dynamically
- Time-bound the assignment
- Scope the assignment to a practice/project
- Track who assigned it and when

#### 3.2.4 New Schema Definition
```prisma
model FunctionAssignment {
  id              String    @id @default(uuid()) @db.Uuid
  tenantId        String    @db.Uuid
  
  // What function
  functionId      String    @db.Uuid
  function        ApprovalFunction @relation(fields: [functionId], references: [id], onDelete: Cascade)
  
  // Who holds it
  userId          String    @db.Uuid
  user            User      @relation("UserFunctionAssignments", fields: [userId], references: [id])
  
  // Scope (optional narrowing)
  scopeType       FunctionScopeType?
  scopeEntityId   String?   @db.Uuid  // practiceId, projectId, departmentId, etc.
  
  // Time bounds
  effectiveFrom   DateTime  @default(now())
  effectiveTo     DateTime?
  
  // Delegation tracking
  isDelegated     Boolean   @default(false)
  delegatedFromId String?   @db.Uuid  // Original holder who delegated
  delegatedFrom   User?     @relation("DelegatedFunctions", fields: [delegatedFromId], references: [id])
  delegationReason String?  @db.VarChar(500)
  
  // Assignment tracking
  assignedById    String    @db.Uuid
  assignedBy      User      @relation("FunctionAssigner", fields: [assignedById], references: [id])
  assignedAt      DateTime  @default(now())
  
  // Approval (if required)
  approvalStatus  AssignmentApprovalStatus @default(APPROVED)
  approvedById    String?   @db.Uuid
  approvedAt      DateTime?
  
  // Status
  status          EntityStatus @default(ACTIVE)
  revokedAt       DateTime?
  revokedById     String?   @db.Uuid
  revocationReason String?  @db.VarChar(500)
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([tenantId, functionId, status])
  @@index([tenantId, userId, status])
  @@index([tenantId, scopeType, scopeEntityId])
  @@index([effectiveFrom, effectiveTo])
}

enum AssignmentApprovalStatus {
  PENDING
  APPROVED
  REJECTED
}
```

#### 3.2.5 Impacted Modules
| Module | Impact Type | Reason |
|--------|-------------|--------|
| `apps/api/src/modules/users/` | Enhancement | User has function assignments |
| `apps/api/src/modules/requests/` | Enhancement | Approver resolution uses assignments |
| NEW: `apps/api/src/modules/functions/` | New Module | Assignment management |

#### 3.2.6 Tables Affected
| Table | Change Type | Reason |
|-------|-------------|--------|
| `FunctionAssignment` | NEW | Assignment tracking |
| `User` | ADD RELATIONS | User has many assignments |

#### 3.2.7 Expected Outcome
- Admin can assign functions to users: "Sarah is Resource Allocator for Utilities Practice"
- Assignments can be time-bound: "Valid until Feb 28"
- Assignments can be scoped: "Only for Project Phoenix"
- Delegation creates new assignment with `isDelegated=true`

#### 3.2.8 Validation Criteria
```sql
-- After implementation, verify:

-- 1. Can create assignment
INSERT INTO "FunctionAssignment" (...) VALUES (...);

-- 2. Can query active assignments for a user
SELECT f.code, fa.scopeType, fa.effectiveTo
FROM "FunctionAssignment" fa
JOIN "ApprovalFunction" f ON fa."functionId" = f.id
WHERE fa."userId" = :userId
  AND fa.status = 'ACTIVE'
  AND fa."effectiveFrom" <= NOW()
  AND (fa."effectiveTo" IS NULL OR fa."effectiveTo" >= NOW());

-- 3. Can query who holds a function
SELECT u.email, fa."effectiveTo"
FROM "FunctionAssignment" fa
JOIN "User" u ON fa."userId" = u.id
WHERE fa."functionId" = :functionId
  AND fa.status = 'ACTIVE';
```

---

### Task 3: Update ApprovalStep to Support Functions

#### 3.3.1 What is to be fixed?
Add `approvalFunctionId` to `ApprovalStep` so steps can be assigned to functions instead of specific users.

#### 3.3.2 Where?
| File | Line | Current Code | Action |
|------|------|--------------|--------|
| `apps/api/prisma/schema.prisma` | 1554-1560 | `approverType`, `approverUserId`, `approverRoleId` | ADD `approvalFunctionId` |

#### 3.3.3 Current Code (Lines 1554-1560)
```prisma
model ApprovalStep {
  // ...
  
  // Primary Approver
  approverType   ApproverType
  approverRoleId String?      @db.Uuid
  approverRole   Role?        @relation("StepApproverRole", fields: [approverRoleId], references: [id])
  approverUserId String?      @db.Uuid
  approverUser   User?        @relation("StepApprover", fields: [approverUserId], references: [id])
```

#### 3.3.4 New Code
```prisma
model ApprovalStep {
  // ...
  
  // Primary Approver
  approverType   ApproverType
  approverRoleId String?      @db.Uuid
  approverRole   Role?        @relation("StepApproverRole", fields: [approverRoleId], references: [id])
  approverUserId String?      @db.Uuid  // DEPRECATED - use approvalFunctionId
  approverUser   User?        @relation("StepApprover", fields: [approverUserId], references: [id])
  
  // NEW: Function-based approval (preferred)
  approvalFunctionId String?  @db.Uuid
  approvalFunction   ApprovalFunction? @relation("StepApprovalFunction", fields: [approvalFunctionId], references: [id])
```

#### 3.3.5 Why does it need to be fixed?
- Current `approverUserId` ties step to a specific person
- If that person is unavailable, the step cannot be completed
- `approvalFunctionId` allows dynamic resolution: "Find whoever currently holds this function"

#### 3.3.6 Impacted Modules
| Module | Impact Type | Reason |
|--------|-------------|--------|
| `apps/api/src/modules/requests/approval-chain.service.ts` | Major Change | Approver resolution logic |
| `apps/api/src/modules/requests/request.service.ts` | Minor Change | Uses resolved approvers |
| `apps/frontend/src/pages/WorkflowBuilderPage.tsx` | Enhancement | UI to select function |
| `apps/frontend/src/components/workflows/WorkflowBuilder.tsx` | Enhancement | Step config UI |

#### 3.3.7 Tables Affected
| Table | Change Type | Reason |
|-------|-------------|--------|
| `ApprovalStep` | ADD COLUMN | New `approvalFunctionId` |

#### 3.3.8 Expected Outcome
- Workflow builder allows selecting "Function" as approver type
- Step can be configured with: "Resource Allocator (Utilities Practice)"
- System resolves to whoever holds that function when request is submitted

#### 3.3.9 Validation Criteria
```sql
-- 1. Column exists
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'ApprovalStep' AND column_name = 'approvalFunctionId';

-- 2. Can create step with function
INSERT INTO "ApprovalStep" (
  "chainId", "stepOrder", "name", "approverType", "approvalFunctionId"
) VALUES (
  :chainId, 1, 'Resource Allocator Approval', 'FUNCTION', :functionId
);

-- 3. Existing steps still work (backward compatibility)
SELECT * FROM "ApprovalStep" WHERE "approverUserId" IS NOT NULL;
```

---

### Task 4: Update Approver Resolution Logic

#### 3.4.1 What is to be fixed?
Update `resolveStepApprovers()` to resolve functions to current holders.

#### 3.4.2 Where?
| File | Lines | Function |
|------|-------|----------|
| `apps/api/src/modules/requests/approval-chain.service.ts` | 590-830 | `resolveStepApprovers()` |

#### 3.4.3 Current Code (Lines 700-710)
```typescript
switch (step.approverType) {
  case 'USER':
    // ❌ HARD-CODED: Returns specific userId
    if (step.approverUserId) {
      approvers.push({
        userId: step.approverUserId,
        stepId: step.id,
        // ...
      });
    }
    break;
```

#### 3.4.4 New Code
```typescript
switch (step.approverType) {
  case 'FUNCTION':
    // NEW: Resolve function to current holders
    if (step.approvalFunctionId) {
      const holders = await resolveFunctionHolders(
        tenantId,
        step.approvalFunctionId,
        request // For scope context
      );
      for (const holder of holders) {
        approvers.push({
          userId: holder.userId,
          stepId: step.id,
          stepOrder: step.stepOrder,
          stepName: step.name,
          approverType: 'FUNCTION',
          reason: `Function: ${holder.functionName}`,
          functionAssignmentId: holder.assignmentId,
        });
      }
    }
    break;

  case 'USER':
    // DEPRECATED but kept for backward compatibility
    if (step.approverUserId) {
      approvers.push({
        userId: step.approverUserId,
        // ...
      });
    }
    break;
```

#### 3.4.5 New Helper Function
```typescript
async function resolveFunctionHolders(
  tenantId: string,
  functionId: string,
  request: any
): Promise<{ userId: string; functionName: string; assignmentId: string }[]> {
  const now = new Date();
  
  // Get function details
  const func = await prisma.approvalFunction.findUnique({
    where: { id: functionId },
  });
  
  if (!func) return [];
  
  // Build scope filter based on function scope type and request context
  const scopeFilter = buildScopeFilter(func.scopeType, request);
  
  // Find active assignments
  const assignments = await prisma.functionAssignment.findMany({
    where: {
      tenantId,
      functionId,
      status: 'ACTIVE',
      approvalStatus: 'APPROVED',
      effectiveFrom: { lte: now },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: now } },
      ],
      ...scopeFilter,
    },
    include: {
      user: { select: { id: true, email: true } },
    },
  });
  
  return assignments.map(a => ({
    userId: a.userId,
    functionName: func.name,
    assignmentId: a.id,
  }));
}
```

#### 3.4.6 Why does it need to be fixed?
- Current resolution is static (hard-coded user IDs)
- New resolution is dynamic (query current function holders)
- Enables delegation without changing workflow definition

#### 3.4.7 Impacted Modules
| Module | Impact Type | Reason |
|--------|-------------|--------|
| `apps/api/src/modules/requests/approval-chain.service.ts` | Major Change | Core resolution logic |
| `apps/api/src/modules/requests/request.service.ts` | Minor Change | Uses resolved approvers |

#### 3.4.8 Expected Outcome
- When request is submitted, system queries `FunctionAssignment` for current holders
- If holder is on leave and delegated, delegation assignment is used
- Multiple holders are supported (based on step's `approvalMode`)

#### 3.4.9 Validation Criteria
```typescript
// Integration test
describe('Function-based approver resolution', () => {
  it('should resolve function to current holders', async () => {
    // Setup: Create function and assignment
    const func = await createApprovalFunction({ code: 'TEST_APPROVER' });
    const assignment = await createFunctionAssignment({
      functionId: func.id,
      userId: testUser.id,
    });
    
    // Create chain with function-based step
    const chain = await createApprovalChain({
      steps: [{
        approverType: 'FUNCTION',
        approvalFunctionId: func.id,
      }],
    });
    
    // Resolve approvers
    const approvers = await resolveApproversForRequest(
      tenantId, requestId, chain.id
    );
    
    expect(approvers).toHaveLength(1);
    expect(approvers[0].userId).toBe(testUser.id);
  });
  
  it('should use delegated holder when original is unavailable', async () => {
    // Setup: Original holder delegates to another user
    await createFunctionAssignment({
      functionId: func.id,
      userId: delegateUser.id,
      isDelegated: true,
      delegatedFromId: originalUser.id,
    });
    
    // Deactivate original assignment
    await updateFunctionAssignment(originalAssignment.id, { status: 'INACTIVE' });
    
    // Resolve approvers
    const approvers = await resolveApproversForRequest(...);
    
    expect(approvers[0].userId).toBe(delegateUser.id);
  });
});
```

---

### Task 5: Add FUNCTION to ApproverType Enum

#### 3.5.1 What is to be fixed?
Add `FUNCTION` to the `ApproverType` enum.

#### 3.5.2 Where?
| File | Line | Current Code |
|------|------|--------------|
| `apps/api/prisma/schema.prisma` | 2509-2520 | `enum ApproverType` |

#### 3.5.3 Current Code
```prisma
enum ApproverType {
  ROLE
  USER
  MANAGER
  RESOURCE_MANAGER
  PRACTICE_HEAD
  PROJECT_MANAGER
  CONTRACT_OWNER
  CUSTOM
}
```

#### 3.5.4 New Code
```prisma
enum ApproverType {
  // NEW: Function-based (preferred)
  FUNCTION          // Resolved via FunctionAssignment
  
  // Dynamic (use org structure - KEEP)
  MANAGER           // Resource's manager (from Resource.managerId)
  RESOURCE_MANAGER  // Same as MANAGER, kept for clarity
  
  // Legacy (hard-coded - DEPRECATE over time)
  ROLE              // Users with a system role
  USER              // Specific user ID
  PRACTICE_HEAD     // Practice.headId (migrate to FUNCTION)
  PROJECT_MANAGER   // Project.managerId (migrate to FUNCTION)
  CONTRACT_OWNER    // Contract.accountMgrId (migrate to FUNCTION)
  CUSTOM            // Custom resolution logic
}
```

#### 3.5.5 Impacted Modules
| Module | Impact |
|--------|--------|
| All modules using ApproverType | Enum value added |

#### 3.5.6 Tables Affected
| Table | Change |
|-------|--------|
| `ApprovalStep` | Enum column can now have `FUNCTION` value |
| `RequestApproval` | `assignedVia` can now be `FUNCTION` |

---

### Task 6: Update ApproverType Enum in ApprovalStep

#### 3.6.1 What is to be fixed?
Deprecate `PRACTICE_HEAD`, `PROJECT_MANAGER` in favor of `FUNCTION`.

#### 3.6.2 Where?
| File | Lines | Current Code |
|------|-------|--------------|
| `apps/api/src/modules/requests/approval-chain.service.ts` | 765-800 | `case 'PRACTICE_HEAD':` |

#### 3.6.3 Current Code (Lines 765-790)
```typescript
case 'PRACTICE_HEAD':
  // ⚠️ HARD-CODED: Uses Practice.headId (person, not function)
  let practiceLeadId: string | null = null;

  const practiceSource = step.practiceSource;
  if (practiceSource === 'RESOURCE' && request.resource?.practice?.headId) {
    practiceLeadId = request.resource.practice.headId;
  } else if (practiceSource === 'PROJECT' && request.project?.practice?.headId) {
    practiceLeadId = request.project.practice.headId;
  }
  // ...
  break;
```

#### 3.6.4 New Code
```typescript
case 'PRACTICE_HEAD':
  // DEPRECATED: Migrate existing chains to use FUNCTION with PRACTICE_HEAD function
  console.warn('PRACTICE_HEAD approverType is deprecated. Use FUNCTION with practice_head function.');
  
  // Fallback: Look for PRACTICE_HEAD function assignment
  const practiceHeadFunc = await prisma.approvalFunction.findFirst({
    where: { tenantId, code: 'PRACTICE_HEAD', status: 'ACTIVE' },
  });
  
  if (practiceHeadFunc) {
    // Determine practice scope from request
    const practiceId = request.resource?.practiceId || request.project?.practiceId;
    
    const holders = await resolveFunctionHolders(
      tenantId,
      practiceHeadFunc.id,
      { ...request, scopeEntityId: practiceId }
    );
    
    approvers.push(...holders.map(h => ({
      userId: h.userId,
      stepId: step.id,
      stepOrder: step.stepOrder,
      stepName: step.name,
      approverType: 'FUNCTION',
      reason: 'Practice Head (via function)',
    })));
  } else {
    // Legacy fallback: Use Practice.headId
    // ... existing code ...
  }
  break;
```

#### 3.6.5 Why does it need to be fixed?
- `PRACTICE_HEAD` currently looks up `Practice.headId` which is a hard-coded person
- Should resolve via function assignment for flexibility
- Backward compatibility maintained with legacy fallback

---

### Task 7: Remove Hard-coded Head References (Future)

#### 3.7.1 What is to be fixed?
Eventually remove `headId` from Practice, Department, Team models.

#### 3.7.2 Where?
| File | Line | Field | Replacement |
|------|------|-------|-------------|
| `apps/api/prisma/schema.prisma` | 648 | `Practice.headId` | FunctionAssignment(PRACTICE_HEAD, scope:practice) |
| `apps/api/prisma/schema.prisma` | 2861 | `Department.headId` | FunctionAssignment(DEPARTMENT_HEAD, scope:department) |
| `apps/api/prisma/schema.prisma` | 2934 | `Team.leadId` | FunctionAssignment(TEAM_LEAD, scope:team) |
| `apps/api/prisma/schema.prisma` | 513 | `Project.managerId` | FunctionAssignment(PROJECT_MANAGER, scope:project) |

#### 3.7.3 Migration Strategy
1. **Phase 1:** Add function support (Tasks 1-6) - Keep legacy fields
2. **Phase 2:** Migrate existing data - Create function assignments from legacy fields
3. **Phase 3:** Update all code to use functions - Mark legacy fields as deprecated
4. **Phase 4:** Remove legacy fields - Breaking change, major version bump

#### 3.7.4 Migration Script (Phase 2)
```typescript
async function migrateLegacyHeadsToFunctions(tenantId: string) {
  // 1. Migrate Practice Heads
  const practices = await prisma.practice.findMany({
    where: { tenantId, headId: { not: null } },
  });
  
  const practiceHeadFunc = await prisma.approvalFunction.findFirst({
    where: { tenantId, code: 'PRACTICE_HEAD' },
  });
  
  for (const practice of practices) {
    // Get user for this resource
    const user = await prisma.user.findFirst({
      where: { resourceId: practice.headId },
    });
    
    if (user) {
      await prisma.functionAssignment.create({
        data: {
          tenantId,
          functionId: practiceHeadFunc.id,
          userId: user.id,
          scopeType: 'PRACTICE',
          scopeEntityId: practice.id,
          assignedById: systemUserId,
          // Mark as migrated
          metadata: { migratedFrom: 'Practice.headId' },
        },
      });
    }
  }
  
  // 2. Migrate Department Heads
  // ... similar logic ...
  
  // 3. Migrate Team Leads
  // ... similar logic ...
  
  // 4. Migrate Project Managers
  // ... similar logic ...
}
```

---

### Task 8: Create Functions Module (Backend)

#### 3.8.1 What is to be fixed?
Create new module for CRUD operations on ApprovalFunction and FunctionAssignment.

#### 3.8.2 Where?
| Path | Files to Create |
|------|-----------------|
| `apps/api/src/modules/functions/` | `index.ts`, `functions.routes.ts`, `functions.controller.ts`, `functions.service.ts` |

#### 3.8.3 Service Methods Required
```typescript
// functions.service.ts

// ApprovalFunction CRUD
export async function createApprovalFunction(tenantId, input): Promise<ApprovalFunction>;
export async function getApprovalFunction(tenantId, id): Promise<ApprovalFunction>;
export async function listApprovalFunctions(tenantId, filters): Promise<ApprovalFunction[]>;
export async function updateApprovalFunction(tenantId, id, input): Promise<ApprovalFunction>;
export async function deleteApprovalFunction(tenantId, id): Promise<void>;

// FunctionAssignment CRUD
export async function createFunctionAssignment(tenantId, input): Promise<FunctionAssignment>;
export async function getFunctionAssignment(tenantId, id): Promise<FunctionAssignment>;
export async function listFunctionAssignments(tenantId, filters): Promise<FunctionAssignment[]>;
export async function updateFunctionAssignment(tenantId, id, input): Promise<FunctionAssignment>;
export async function revokeFunctionAssignment(tenantId, id, reason): Promise<void>;

// Query helpers
export async function getAssignmentsForUser(tenantId, userId): Promise<FunctionAssignment[]>;
export async function getHoldersForFunction(tenantId, functionId, scope?): Promise<User[]>;
export async function checkUserHasFunction(tenantId, userId, functionCode, scope?): Promise<boolean>;

// Delegation
export async function delegateFunction(tenantId, assignmentId, delegateUserId, endDate, reason): Promise<FunctionAssignment>;
export async function revokeDelegation(tenantId, delegationId, reason): Promise<void>;
```

#### 3.8.4 API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/functions` | List approval functions |
| POST | `/api/functions` | Create approval function |
| GET | `/api/functions/:id` | Get function details |
| PUT | `/api/functions/:id` | Update function |
| DELETE | `/api/functions/:id` | Delete function |
| GET | `/api/functions/:id/holders` | Get current holders |
| GET | `/api/function-assignments` | List assignments |
| POST | `/api/function-assignments` | Create assignment |
| GET | `/api/function-assignments/:id` | Get assignment |
| PUT | `/api/function-assignments/:id` | Update assignment |
| DELETE | `/api/function-assignments/:id` | Revoke assignment |
| POST | `/api/function-assignments/:id/delegate` | Delegate to another user |

---

### Task 9: Create Functions UI (Frontend)

#### 3.9.1 What is to be fixed?
Create admin UI for managing approval functions and assignments.

#### 3.9.2 Where?
| Path | Files to Create |
|------|-----------------|
| `apps/frontend/src/pages/` | `FunctionsPage.tsx` |
| `apps/frontend/src/features/functions/` | `api.ts`, `types.ts`, components |

#### 3.9.3 UI Components Required
1. **Functions List Page** - Table of all approval functions
2. **Function Detail/Edit Form** - Create/edit function
3. **Assignments Panel** - Who holds this function
4. **User Functions View** - What functions does user hold
5. **Delegate Modal** - Delegate a function to another user

#### 3.9.4 Navigation
```typescript
// Add to Settings menu
{
  name: 'Approval Functions',
  path: '/settings/functions',
  icon: KeyIcon,
  permission: 'functions:manage',
}
```

---

### Task 10: Update Workflow Builder UI

#### 3.10.1 What is to be fixed?
Add "Function" as approver type option in workflow builder.

#### 3.10.2 Where?
| File | Lines | Component |
|------|-------|-----------|
| `apps/frontend/src/pages/WorkflowBuilderPage.tsx` | 1200-1300 | Step configuration panel |
| `apps/frontend/src/components/workflows/WorkflowBuilder.tsx` | 650-700 | Step form |

#### 3.10.3 Current Code (WorkflowBuilderPage.tsx ~Line 1205)
```tsx
<Label>Approver Type</Label>
<Select
  value={step.approverType}
  onValueChange={(value) => updateStep(step.id, { approverType: value })}
>
  <SelectItem value="ROLE">Role</SelectItem>
  <SelectItem value="USER">Specific User</SelectItem>
  <SelectItem value="MANAGER">Manager</SelectItem>
  <SelectItem value="PRACTICE_HEAD">Practice Head</SelectItem>
</Select>
```

#### 3.10.4 New Code
```tsx
<Label>Approver Type</Label>
<Select
  value={step.approverType}
  onValueChange={(value) => updateStep(step.id, { approverType: value })}
>
  {/* Recommended */}
  <SelectItem value="FUNCTION">Approval Function</SelectItem>
  <SelectItem value="MANAGER">Reporting Manager</SelectItem>
  
  {/* Legacy - show deprecation warning */}
  <SelectItem value="ROLE">System Role (legacy)</SelectItem>
  <SelectItem value="USER">Specific User (legacy)</SelectItem>
  <SelectItem value="PRACTICE_HEAD">Practice Head (legacy)</SelectItem>
</Select>

{step.approverType === 'FUNCTION' && (
  <div className="mt-2">
    <Label>Select Function</Label>
    <FunctionPicker
      value={step.approvalFunctionId}
      onChange={(id) => updateStep(step.id, { approvalFunctionId: id })}
    />
    
    <Label>Scope</Label>
    <ScopePicker
      functionId={step.approvalFunctionId}
      value={step.functionScope}
      onChange={(scope) => updateStep(step.id, { functionScope: scope })}
    />
  </div>
)}
```

---

### Task 11: Seed System Functions

#### 3.11.1 What is to be fixed?
Create seed data for system-defined approval functions.

#### 3.11.2 Where?
| File | Action |
|------|--------|
| `apps/api/prisma/seed.ts` | ADD function seeding |

#### 3.11.3 Seed Data
```typescript
const SYSTEM_FUNCTIONS = [
  {
    code: 'RESOURCE_ALLOCATOR',
    name: 'Resource Allocator',
    description: 'Can approve resource allocation requests',
    category: 'APPROVAL',
    scopeType: 'PRACTICE',
    allowMultipleHolders: true,
    canDelegate: true,
    isSystem: true,
  },
  {
    code: 'LEAVE_APPROVER',
    name: 'Leave Approver',
    description: 'Can approve leave requests',
    category: 'APPROVAL',
    scopeType: 'TENANT',
    allowMultipleHolders: true,
    canDelegate: true,
    isSystem: true,
  },
  {
    code: 'TIMESHEET_APPROVER',
    name: 'Timesheet Approver',
    description: 'Can approve timesheets',
    category: 'APPROVAL',
    scopeType: 'PROJECT',
    allowMultipleHolders: true,
    canDelegate: true,
    isSystem: true,
  },
  {
    code: 'PRACTICE_HEAD',
    name: 'Practice Head',
    description: 'Head of a practice/business unit',
    category: 'MANAGEMENT',
    scopeType: 'PRACTICE',
    allowMultipleHolders: false,
    canDelegate: true,
    isSystem: true,
  },
  {
    code: 'PROJECT_MANAGER',
    name: 'Project Manager',
    description: 'Manager of a project',
    category: 'MANAGEMENT',
    scopeType: 'PROJECT',
    allowMultipleHolders: false,
    canDelegate: true,
    isSystem: true,
  },
  {
    code: 'DEPARTMENT_HEAD',
    name: 'Department Head',
    description: 'Head of a department',
    category: 'MANAGEMENT',
    scopeType: 'DEPARTMENT',
    allowMultipleHolders: false,
    canDelegate: true,
    isSystem: true,
  },
  {
    code: 'FINANCIAL_APPROVER',
    name: 'Financial Approver',
    description: 'Can approve financial decisions',
    category: 'FINANCIAL',
    scopeType: 'TENANT',
    allowMultipleHolders: true,
    canDelegate: true,
    isSystem: true,
  },
  {
    code: 'CONTRACT_APPROVER',
    name: 'Contract Approver',
    description: 'Can approve contract changes',
    category: 'APPROVAL',
    scopeType: 'TENANT',
    allowMultipleHolders: true,
    canDelegate: true,
    isSystem: true,
  },
];
```

---

### Task 12: Update Onboarding Flow

#### 3.12.1 What is to be fixed?
Add function assignment to onboarding wizard.

#### 3.12.2 Where?
| File | Lines | Change |
|------|-------|--------|
| `apps/api/src/modules/onboarding/onboarding.service.ts` | 46-86 | Add Phase for Functions |
| `apps/frontend/src/features/onboarding/components/OnboardingWizard.tsx` | | Add step |

#### 3.12.3 Updated Onboarding Phases
```typescript
const ONBOARDING_PHASES = [
  {
    phase: 1,
    name: 'Organization Identity',
    steps: [
      { stepCode: 'COMPANY_PROFILE', stepName: 'Company Profile', isRequired: true },
      { stepCode: 'BRANDING', stepName: 'Branding Settings', isRequired: false },
      { stepCode: 'REGIONAL_SETTINGS', stepName: 'Regional Settings', isRequired: true },
    ],
  },
  {
    phase: 2,
    name: 'Organization Structure',
    steps: [
      { stepCode: 'REPORTING_STRUCTURE', stepName: 'Reporting Structure', isRequired: true },  // NEW: Focus on managerId
      { stepCode: 'GROUPINGS', stepName: 'Groupings (Departments/Teams)', isRequired: false }, // RENAMED: Now optional
      { stepCode: 'COST_CENTERS', stepName: 'Cost Centers', isRequired: false },
    ],
  },
  {
    phase: 3,
    name: 'Roles & Functions',  // RENAMED
    steps: [
      { stepCode: 'GRADE_BANDS', stepName: 'Grade Bands', isRequired: true },
      { stepCode: 'BUSINESS_ROLES', stepName: 'Business Roles', isRequired: true },
      { stepCode: 'APPROVAL_FUNCTIONS', stepName: 'Approval Functions', isRequired: true },  // NEW
    ],
  },
  {
    phase: 4,
    name: 'People Setup',
    steps: [
      { stepCode: 'RESOURCES', stepName: 'Add Resources', isRequired: true },
      { stepCode: 'USER_ACCOUNTS', stepName: 'User Accounts', isRequired: true },
      { stepCode: 'FUNCTION_ASSIGNMENTS', stepName: 'Assign Functions', isRequired: true },  // NEW
    ],
  },
  {
    phase: 5,
    name: 'Governance',
    steps: [
      { stepCode: 'APPROVAL_WORKFLOWS', stepName: 'Approval Workflows', isRequired: true },
      { stepCode: 'DELEGATION_RULES', stepName: 'Delegation Rules', isRequired: false },
    ],
  },
];
```

---

## 4. Database Changes Summary

### 4.1 New Tables

| Table | Purpose | Foreign Keys |
|-------|---------|--------------|
| `ApprovalFunction` | Define approval capabilities | `tenantId` → Tenant |
| `FunctionAssignment` | Track who holds what function | `tenantId`, `functionId` → ApprovalFunction, `userId` → User |

### 4.2 Modified Tables

| Table | Change | Reason |
|-------|--------|--------|
| `ApprovalStep` | Add `approvalFunctionId` column | Link step to function |
| `Tenant` | Add relation to `ApprovalFunction[]` | Tenant owns functions |
| `User` | Add relations to `FunctionAssignment[]` | User holds functions |

### 4.3 New Enums

| Enum | Values |
|------|--------|
| `FunctionCategory` | APPROVAL, MANAGEMENT, FINANCIAL, ADMINISTRATIVE, CUSTOM |
| `FunctionScopeType` | TENANT, PRACTICE, DEPARTMENT, PROJECT, TEAM |
| `AssignmentApprovalStatus` | PENDING, APPROVED, REJECTED |

### 4.4 Modified Enums

| Enum | Change |
|------|--------|
| `ApproverType` | Add `FUNCTION` value |

### 4.5 Migration Order

```
1. Create FunctionCategory enum
2. Create FunctionScopeType enum
3. Create AssignmentApprovalStatus enum
4. Create ApprovalFunction table
5. Create FunctionAssignment table
6. Add FUNCTION to ApproverType enum
7. Add approvalFunctionId to ApprovalStep
8. Add relations to Tenant and User
```

---

## 5. Impacted Modules Summary

### 5.1 Backend Modules

| Module | Impact Level | Changes |
|--------|--------------|---------|
| NEW: `functions/` | NEW | Full module creation |
| `requests/` | HIGH | Approver resolution logic |
| `onboarding/` | MEDIUM | Add function setup phases |
| `users/` | LOW | Add function assignment relations |
| `roles/` | LOW | Clarify distinction from functions |

### 5.2 Frontend Modules

| Module | Impact Level | Changes |
|--------|--------------|---------|
| NEW: `features/functions/` | NEW | Full feature creation |
| `pages/WorkflowBuilderPage.tsx` | MEDIUM | Add function picker |
| `features/onboarding/` | MEDIUM | Add function setup steps |
| `pages/SettingsPage.tsx` | LOW | Add functions menu item |

### 5.3 Shared Packages

| Package | Impact Level | Changes |
|---------|--------------|---------|
| `packages/shared/src/types/` | LOW | Add function types |

---

## 6. Validation Plan

### 6.1 Database Validation

```sql
-- Run after migration

-- 1. Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('ApprovalFunction', 'FunctionAssignment');

-- 2. Verify columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'ApprovalFunction';

-- 3. Verify enum values
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ApproverType');

-- 4. Verify foreign keys
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint 
WHERE contype = 'f' AND conrelid = 'FunctionAssignment'::regclass;
```

### 6.2 API Validation

```bash
# Test function CRUD
curl -X POST http://localhost:4000/api/functions \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"code": "TEST_FUNC", "name": "Test Function"}'

curl -X GET http://localhost:4000/api/functions

# Test assignment CRUD
curl -X POST http://localhost:4000/api/function-assignments \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"functionId": "...", "userId": "..."}'

curl -X GET http://localhost:4000/api/function-assignments
```

### 6.3 Integration Validation

```typescript
// Test approver resolution
describe('Approver Resolution', () => {
  test('FUNCTION type resolves to current holder', async () => {
    // Setup
    const func = await createFunction('RESOURCE_ALLOCATOR');
    const assignment = await assignFunction(func.id, user.id);
    const chain = await createChain({
      steps: [{ approverType: 'FUNCTION', approvalFunctionId: func.id }]
    });
    
    // Execute
    const approvers = await resolveApprovers(chain.id, request);
    
    // Verify
    expect(approvers[0].userId).toBe(user.id);
  });
  
  test('Delegation is respected', async () => {
    // Setup: Original holder delegates
    await createFunctionAssignment({
      functionId: func.id,
      userId: delegate.id,
      isDelegated: true,
      delegatedFromId: original.id,
    });
    await deactivateAssignment(originalAssignment.id);
    
    // Execute
    const approvers = await resolveApprovers(chain.id, request);
    
    // Verify: Delegate is resolved
    expect(approvers[0].userId).toBe(delegate.id);
  });
});
```

### 6.4 UI Validation

| Screen | Test Case | Expected Result |
|--------|-----------|-----------------|
| Functions List | Load page | See list of system functions |
| Create Function | Fill form, submit | Function created |
| Assign Function | Select user, submit | Assignment created |
| Workflow Builder | Select FUNCTION type | Show function picker |
| Workflow Builder | Save step | Step saved with functionId |

### 6.5 End-to-End Validation

```gherkin
Feature: Function-based Approvals

Scenario: Request is approved by function holder
  Given Sarah holds the "Resource Allocator" function for "Utilities" practice
  And a resource allocation request is created for Utilities practice
  When the request is submitted
  Then Sarah receives an approval notification
  And the request shows "Pending Approval: Sarah (Resource Allocator)"

Scenario: Delegation works correctly
  Given Sarah holds the "Resource Allocator" function
  And Sarah delegates to John for 7 days
  When a new request is submitted
  Then John receives the approval notification
  And the request shows "Pending Approval: John (delegated from Sarah)"

Scenario: Backward compatibility
  Given an existing workflow uses "PRACTICE_HEAD" approver type
  And Practice.headId is set to Mike
  When a request is submitted
  Then Mike receives the approval notification (legacy fallback)
```

---

## 7. Rollback Strategy

### 7.1 Database Rollback

```sql
-- If issues occur, rollback in reverse order:

-- 1. Remove new column from ApprovalStep
ALTER TABLE "ApprovalStep" DROP COLUMN "approvalFunctionId";

-- 2. Remove FUNCTION from ApproverType enum
-- Note: Enum value removal requires careful handling
ALTER TYPE "ApproverType" RENAME TO "ApproverType_old";
CREATE TYPE "ApproverType" AS ENUM (...old values without FUNCTION...);
-- Update tables, drop old type

-- 3. Drop new tables
DROP TABLE IF EXISTS "FunctionAssignment";
DROP TABLE IF EXISTS "ApprovalFunction";

-- 4. Drop new enums
DROP TYPE IF EXISTS "FunctionCategory";
DROP TYPE IF EXISTS "FunctionScopeType";
DROP TYPE IF EXISTS "AssignmentApprovalStatus";
```

### 7.2 Code Rollback

- All changes are in new files or clearly marked sections
- Legacy approver resolution logic is preserved (not deleted)
- Feature flag can disable function-based resolution

---

## 8. Timeline

### Phase 1: Foundation (Days 1-4)
| Day | Tasks |
|-----|-------|
| Day 1 | Create schema (ApprovalFunction, FunctionAssignment, enums) |
| Day 2 | Write migration, update ApprovalStep, test migration |
| Day 3 | Create functions module (service, controller, routes) |
| Day 4 | Create seed data, test API endpoints |

### Phase 2: Integration (Days 5-8)
| Day | Tasks |
|-----|-------|
| Day 5 | Update approver resolution logic |
| Day 6 | Add FUNCTION support to approval-chain.service.ts |
| Day 7 | Write integration tests |
| Day 8 | Fix issues, edge cases |

### Phase 3: Frontend (Days 9-12)
| Day | Tasks |
|-----|-------|
| Day 9 | Create functions feature (types, api, hooks) |
| Day 10 | Create FunctionsPage, AssignmentsPage |
| Day 11 | Update WorkflowBuilderPage |
| Day 12 | Update onboarding wizard |

### Phase 4: Testing & Polish (Days 13-15)
| Day | Tasks |
|-----|-------|
| Day 13 | End-to-end testing |
| Day 14 | Bug fixes, documentation |
| Day 15 | Code review, final testing |

### Milestones
| Milestone | Date | Criteria |
|-----------|------|----------|
| Schema Ready | Day 2 | Migration runs successfully |
| API Ready | Day 4 | All endpoints work |
| Resolution Ready | Day 8 | Function-based approval works |
| UI Ready | Day 12 | Admin can manage functions |
| Complete | Day 15 | All tests pass |

---

## Appendix A: File Change Summary

### New Files
```
apps/api/src/modules/functions/
├── index.ts
├── functions.routes.ts
├── functions.controller.ts
├── functions.service.ts
└── functions.test.ts

apps/frontend/src/features/functions/
├── api.ts
├── types.ts
└── components/
    ├── FunctionsList.tsx
    ├── FunctionForm.tsx
    ├── FunctionAssignments.tsx
    └── FunctionPicker.tsx

apps/frontend/src/pages/
└── FunctionsPage.tsx
```

### Modified Files
```
apps/api/prisma/schema.prisma                          # Add models, enums
apps/api/prisma/seed.ts                                # Add function seeds
apps/api/src/modules/requests/approval-chain.service.ts # Update resolution
apps/api/src/modules/onboarding/onboarding.service.ts   # Add phases
apps/frontend/src/pages/WorkflowBuilderPage.tsx         # Add function picker
apps/frontend/src/components/workflows/WorkflowBuilder.tsx
apps/frontend/src/features/onboarding/components/OnboardingWizard.tsx
```

---

## Appendix B: Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Backward compatibility breaks | Medium | High | Keep legacy resolution as fallback |
| Performance degradation | Low | Medium | Index function assignments properly |
| Migration data loss | Low | High | Test migration on copy first |
| UI complexity increase | Medium | Medium | Clear UX for function vs role |
| User confusion | Medium | Low | Documentation, tooltips |

---

## Appendix C: Open Questions

1. **Q:** Should we auto-migrate existing Practice.headId to function assignments?
   **A:** Recommended yes, with migration script

2. **Q:** Can a user hold the same function multiple times with different scopes?
   **A:** Yes, e.g., "Resource Allocator" for Practice A and Practice B

3. **Q:** What happens if no one holds a function when request is submitted?
   **A:** Fallback to legacy resolution, or escalate to admin

4. **Q:** Should function assignment require approval?
   **A:** Configurable per function (`requiresApproval` flag)

---

**Document End**

*Implementation Plan v1.0 - January 20, 2026*
