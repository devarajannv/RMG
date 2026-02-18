# Implementation Plan: Frontend UI for Approval Functions

**Document Created:** January 20, 2026 @ 14:30 IST  
**Last Updated:** January 20, 2026 @ 14:30 IST  
**Author:** AI Assistant (Claude)  
**Status:** DRAFT - Pending Review  
**Estimated Duration:** 8-12 working days  
**Prerequisites:** Backend implementation complete (done Jan 20, 2026)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Feature 1: Function Management in Admin Panel](#2-feature-1-function-management-in-admin-panel)
3. [Feature 2: Workflow Builder - FUNCTION Approver Type](#3-feature-2-workflow-builder---function-approver-type)
4. [Feature 3: User Delegation UI](#4-feature-3-user-delegation-ui)
5. [New Files to Create](#5-new-files-to-create)
6. [API Integration Points](#6-api-integration-points)
7. [Testing Strategy](#7-testing-strategy)
8. [Timeline & Dependencies](#8-timeline--dependencies)

---

## 1. Executive Summary

### 1.1 What Needs to Be Done

| Feature | Purpose | Priority |
|---------|---------|----------|
| **Function Management UI** | Admin creates/edits approval functions | HIGH |
| **Workflow Builder Integration** | Select FUNCTION as approver type | HIGH |
| **Delegation UI** | Users delegate their functions temporarily | MEDIUM |

### 1.2 Why These Changes Are Needed

1. **Backend is ready, frontend is not** - API endpoints `/api/v1/functions` and `/api/v1/assignments` exist but no UI
2. **Workflow Builder is incomplete** - `ApproverType` only shows ROLE/USER/DYNAMIC, missing `FUNCTION`
3. **No self-service delegation** - Users cannot delegate their approval functions without admin intervention

### 1.3 Expected Outcomes

| Before | After |
|--------|-------|
| Approvals stuck when person unavailable | Functions can be delegated dynamically |
| Hard-coded person in workflow steps | Function-based resolution at runtime |
| No visibility into who holds what function | Clear function assignment management |

---

## 2. Feature 1: Function Management in Admin Panel

### 2.1 What Is To Be Fixed

**Current State:** Settings page has tabs for Users, Roles, Currency, etc. but NO tab for Approval Functions.

**Required:** Add a new "Functions" tab to the Settings page that allows admins to:
- View all approval functions
- Create new custom functions
- Edit existing functions (name, description, scope settings)
- Assign/revoke function holders
- See who currently holds each function

### 2.2 Where (Files & Line Numbers)

| File | Line(s) | What to Change |
|------|---------|----------------|
| [apps/frontend/src/pages/SettingsPage.tsx](../apps/frontend/src/pages/SettingsPage.tsx#L129) | 129 | Add `'functions'` to `TabType` union |
| [apps/frontend/src/pages/SettingsPage.tsx](../apps/frontend/src/pages/SettingsPage.tsx#L1262-L1271) | 1262-1271 | Add `{ id: 'functions', label: 'Functions', icon: '🎭' }` to `tabs` array |
| [apps/frontend/src/pages/SettingsPage.tsx](../apps/frontend/src/pages/SettingsPage.tsx#L1316) | ~1316+ | Add `{activeTab === 'functions' && <FunctionsTab />}` conditional render |
| **NEW FILE** | N/A | Create `apps/frontend/src/components/settings/FunctionsTab.tsx` |
| **NEW FILE** | N/A | Create `apps/frontend/src/components/settings/FunctionFormModal.tsx` |
| **NEW FILE** | N/A | Create `apps/frontend/src/components/settings/AssignmentFormModal.tsx` |
| **NEW FILE** | N/A | Create `apps/frontend/src/hooks/useFunctions.ts` (API hooks) |

### 2.3 Why It Needs To Be Fixed

| Problem | Impact | Solution |
|---------|--------|----------|
| No UI to manage functions | Admins must use API directly or seed data | Add FunctionsTab component |
| No way to assign functions to users | Function assignments only via seed | Add AssignmentFormModal |
| No visibility into current holders | Can't audit who can approve what | Show holders list in function detail |

### 2.4 Impacted Modules

| Module | Impact Type | Details |
|--------|-------------|---------|
| `pages/SettingsPage.tsx` | MODIFICATION | Add new tab, import new component |
| `components/settings/` | NEW DIRECTORY | Create function management components |
| `hooks/` | NEW FILE | Add `useFunctions.ts` for API integration |
| `lib/api.ts` | NO CHANGE | Use existing api helper |

### 2.5 Tables Affected

| Table | Operation | Why |
|-------|-----------|-----|
| `ApprovalFunction` | READ, CREATE, UPDATE, DELETE | CRUD operations via API |
| `FunctionAssignment` | READ, CREATE, DELETE | Assign/revoke functions |
| `User` | READ | Show user list for assignment dropdown |
| `Practice` | READ | Show practice list for scoped functions |
| `Project` | READ | Show project list for project-scoped functions |

### 2.6 Expected Outcome

```
Settings Page
├── Profile
├── Notifications
├── Display
├── Security
├── Users
├── Roles
├── Functions  ← NEW TAB
│   ├── List all functions (table)
│   │   ├── Code, Name, Category, Scope, Holders Count
│   │   └── Actions: Edit, View Holders, Assign
│   ├── Create Function (modal)
│   │   ├── Code, Name, Description
│   │   ├── Category (APPROVAL/LEADERSHIP)
│   │   ├── Scope (TENANT/PRACTICE/PROJECT)
│   │   └── Settings (allowMultiple, canDelegate, etc.)
│   └── Function Detail (expandable or modal)
│       ├── Current holders list
│       ├── Assign new holder button
│       └── Revoke assignment button
├── Currency
├── Organization
└── Audit Logs
```

### 2.7 Validation Post-Fix

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| View functions list | Go to Settings → Functions | See 10 system functions |
| Create custom function | Click "Add Function", fill form | New function appears in list |
| Assign function | Click "Assign" on a function, select user | Assignment created, holder count increases |
| Revoke assignment | Click "Revoke" on an assignment | Assignment removed, holder count decreases |
| Filter by category | Select "APPROVAL" filter | Only approval functions shown |
| Search functions | Type "leave" in search | LEAVE_APPROVER function shown |

---

## 3. Feature 2: Workflow Builder - FUNCTION Approver Type

### 3.1 What Is To Be Fixed

**Current State:** WorkflowBuilderPage has `ApproverType = 'ROLE' | 'USER' | 'DYNAMIC'` but backend now supports `'FUNCTION'`.

**Required:** Add FUNCTION as a fourth approver type option with:
- UI card in approver type selector
- Dropdown to select which function
- Preview showing function name and current holder count

### 3.2 Where (Files & Line Numbers)

| File | Line(s) | What to Change |
|------|---------|----------------|
| [apps/frontend/src/pages/WorkflowBuilderPage.tsx](../apps/frontend/src/pages/WorkflowBuilderPage.tsx#L78) | 78 | Change `type ApproverType = 'ROLE' \| 'USER' \| 'DYNAMIC'` to include `\| 'FUNCTION'` |
| [apps/frontend/src/pages/WorkflowBuilderPage.tsx](../apps/frontend/src/pages/WorkflowBuilderPage.tsx#L89-98) | 89-98 | Add `approvalFunctionId?: string` and `approvalFunction?: ApprovalFunction` to `ApprovalStep` interface |
| [apps/frontend/src/pages/WorkflowBuilderPage.tsx](../apps/frontend/src/pages/WorkflowBuilderPage.tsx#L177-181) | 177-181 | Add `FUNCTION` entry to `APPROVER_TYPE_CONFIG` constant |
| [apps/frontend/src/pages/WorkflowBuilderPage.tsx](../apps/frontend/src/pages/WorkflowBuilderPage.tsx#L557-561) | 557-561 | Add `{step.approverType === 'FUNCTION' && step.approvalFunction?.name}` display |
| [apps/frontend/src/pages/WorkflowBuilderPage.tsx](../apps/frontend/src/pages/WorkflowBuilderPage.tsx#L614-620) | 614-620 | Add `approvalFunctionId: s.approvalFunctionId` to step mapping |
| [apps/frontend/src/pages/WorkflowBuilderPage.tsx](../apps/frontend/src/pages/WorkflowBuilderPage.tsx#L735-738) | 735-738 | Add validation: `if (step.approverType === 'FUNCTION' && !step.approvalFunctionId)` |
| [apps/frontend/src/pages/WorkflowBuilderPage.tsx](../apps/frontend/src/pages/WorkflowBuilderPage.tsx#L1143-1175) | 1143-1175 | Add `{step.approverType === 'FUNCTION' && (...)}` section with function dropdown |

### 3.3 Why It Needs To Be Fixed

| Problem | Impact | Solution |
|---------|--------|----------|
| FUNCTION type not available | Can't create function-based workflows | Add FUNCTION to ApproverType |
| No function selector UI | Can't specify which function to use | Add SearchableSelect for functions |
| Missing from step display | Users don't see what function is assigned | Add function name display |

### 3.4 Impacted Modules

| Module | Impact Type | Details |
|--------|-------------|---------|
| `pages/WorkflowBuilderPage.tsx` | MODIFICATION | Add FUNCTION type, selector, display |
| `hooks/useFunctions.ts` | NEW/SHARED | Need to query functions for dropdown |

### 3.5 Tables Affected (via API)

| Table | Operation | Why |
|-------|-----------|-----|
| `ApprovalFunction` | READ | Populate function dropdown |
| `ApprovalStep` | CREATE, UPDATE | Store `approvalFunctionId` |
| `ApprovalChain` | CREATE, UPDATE | Steps include function references |

### 3.6 Expected Outcome

```
Step Configuration Panel (Workflow Builder)
├── Step Name
├── Instructions
├── Approver Type * ← MODIFIED
│   ├── [ROLE]     Anyone with this role can approve
│   ├── [USER]     Only this specific user can approve
│   ├── [DYNAMIC]  Determined at runtime
│   └── [FUNCTION] ← NEW: Whoever holds this function  
│
├── IF FUNCTION selected:
│   └── Select Function * ← NEW DROPDOWN
│       ├── RESOURCE_ALLOCATOR (2 holders)
│       ├── LEAVE_APPROVER (1 holder)
│       ├── PRACTICE_HEAD (0 holders)
│       └── ... (show all active functions)
│
├── Approval Mode
└── Advanced Settings
```

### 3.7 Validation Post-Fix

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| See FUNCTION option | Open step config | 4 approver type cards visible |
| Select FUNCTION type | Click FUNCTION card | Function dropdown appears |
| Select a function | Choose RESOURCE_ALLOCATOR | Function selected, holder count shown |
| Save workflow | Save chain with FUNCTION step | Step saved with approvalFunctionId |
| Load existing | Open chain with FUNCTION step | Function name displayed correctly |
| Validation error | Try save without selecting function | Error: "Please select a function" |

---

## 4. Feature 3: User Delegation UI

### 4.1 What Is To Be Fixed

**Current State:** Users can see their profile in Settings, but cannot see or delegate their function assignments.

**Required:** Add a "My Functions" section where users can:
- View functions they currently hold
- Delegate a function to another user temporarily
- See their delegated functions (received from others)
- Revoke delegations they created

### 4.2 Where (Files & Line Numbers)

| File | Line(s) | What to Change |
|------|---------|----------------|
| **NEW FILE** | N/A | Create `apps/frontend/src/pages/MyFunctionsPage.tsx` |
| **NEW FILE** | N/A | Create `apps/frontend/src/components/functions/DelegationModal.tsx` |
| [apps/frontend/src/App.tsx](../apps/frontend/src/App.tsx#L38) | 38 | Add `const MyFunctionsPage = lazy(() => import(...))` |
| [apps/frontend/src/App.tsx](../apps/frontend/src/App.tsx#L80+) | ~80+ | Add route `<Route path="/my-functions" element={...} />` |
| [apps/frontend/src/components/layout/MainLayout.tsx](../apps/frontend/src/components/layout/MainLayout.tsx) | TBD | Add "My Functions" to sidebar navigation |
| **OR** [apps/frontend/src/pages/SettingsPage.tsx](../apps/frontend/src/pages/SettingsPage.tsx#L1262) | 1262 | Add `{ id: 'my-functions', label: 'My Functions', icon: '🎩' }` to profile section |

### 4.3 Why It Needs To Be Fixed

| Problem | Impact | Solution |
|---------|--------|----------|
| No visibility into own functions | Users don't know what they can approve | Show "My Functions" list |
| No self-service delegation | Requires admin to delegate | Add delegation modal |
| No delegation management | Can't see/revoke delegations | Show delegation history |

### 4.4 Impacted Modules

| Module | Impact Type | Details |
|--------|-------------|---------|
| `pages/` | NEW FILE | Create MyFunctionsPage.tsx |
| `components/functions/` | NEW DIRECTORY | Create DelegationModal.tsx |
| `App.tsx` | MODIFICATION | Add route |
| `MainLayout.tsx` OR `SettingsPage.tsx` | MODIFICATION | Add navigation link |
| `hooks/useFunctions.ts` | MODIFICATION | Add `useMyAssignments`, `useDelegateFunction` hooks |

### 4.5 Tables Affected (via API)

| Table | Operation | Why |
|-------|-----------|-----|
| `FunctionAssignment` | READ | Get user's assignments |
| `FunctionAssignment` | CREATE | Create delegation (isDelegated=true) |
| `FunctionAssignment` | UPDATE | Revoke delegation |
| `ApprovalFunction` | READ | Get function details |
| `User` | READ | Populate delegate user dropdown |

### 4.6 Expected Outcome

```
My Functions Page (or Settings Tab)
├── My Active Functions
│   ├── RESOURCE_ALLOCATOR
│   │   ├── Scope: Technology Practice
│   │   ├── Assigned: Jan 15, 2026
│   │   ├── Can Delegate: Yes (max 30 days)
│   │   └── [Delegate] button
│   └── LEAVE_APPROVER
│       ├── Scope: Technology Practice
│       ├── Assigned: Jan 15, 2026
│       └── [Delegate] button
│
├── Delegated to Me (From Others)
│   └── PRACTICE_HEAD (delegated by John until Jan 25)
│       └── Cannot re-delegate
│
└── My Delegations (To Others)
    └── TIMESHEET_APPROVER → Mary (until Jan 22)
        └── [Revoke] button

Delegation Modal
├── Function: RESOURCE_ALLOCATOR
├── Delegate To: [User Dropdown] *
├── Until: [Date Picker] * (max 30 days)
├── Reason: [Text Area]
└── [Cancel] [Delegate]
```

### 4.7 Validation Post-Fix

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| View my functions | Go to My Functions page | See list of assigned functions |
| See delegation option | Click Delegate on a function | Modal opens if canDelegate=true |
| Create delegation | Fill form, submit | New delegation created, shows in "My Delegations" |
| Max duration enforced | Try to delegate for 60 days | Error: "Cannot exceed 30 days" |
| Revoke delegation | Click Revoke on a delegation | Delegation removed |
| See received delegations | Have someone delegate to you | Shows in "Delegated to Me" section |
| Cannot delegate system | Try to delegate HIRING_MANAGER | Delegate button hidden (canDelegate=false) |

---

## 5. New Files to Create

### 5.1 File List

| File Path | Purpose | Est. Lines |
|-----------|---------|------------|
| `apps/frontend/src/hooks/useFunctions.ts` | API hooks for functions & assignments | ~200 |
| `apps/frontend/src/components/settings/FunctionsTab.tsx` | Main functions management tab | ~400 |
| `apps/frontend/src/components/settings/FunctionFormModal.tsx` | Create/edit function form | ~250 |
| `apps/frontend/src/components/settings/AssignmentFormModal.tsx` | Assign function to user | ~150 |
| `apps/frontend/src/pages/MyFunctionsPage.tsx` | User's function assignments & delegation | ~350 |
| `apps/frontend/src/components/functions/DelegationModal.tsx` | Delegate function form | ~180 |
| `apps/frontend/src/components/functions/FunctionCard.tsx` | Reusable function display card | ~100 |

**Total new code: ~1,630 lines**

### 5.2 Type Definitions (to add to existing types or new file)

```typescript
// Types to add to apps/frontend/src/types/functions.ts (NEW FILE)

type FunctionCategory = 'APPROVAL' | 'LEADERSHIP';
type FunctionScopeType = 'TENANT' | 'PRACTICE' | 'PROJECT' | 'DEPARTMENT' | 'TEAM';
type AssignmentApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface ApprovalFunction {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  category: FunctionCategory;
  scopeType: FunctionScopeType;
  allowMultipleHolders: boolean;
  requiresApproval: boolean;
  canDelegate: boolean;
  maxDelegationDays?: number;
  status: 'ACTIVE' | 'INACTIVE';
  isSystem: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    assignments: number;
    approvalSteps: number;
  };
}

interface FunctionAssignment {
  id: string;
  tenantId: string;
  functionId: string;
  function: ApprovalFunction;
  userId: string;
  user: { id: string; email: string; firstName: string; lastName: string };
  scopeType?: FunctionScopeType;
  scopeEntityId?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isDelegated: boolean;
  delegatedFromId?: string;
  delegatedFrom?: { id: string; email: string; firstName: string; lastName: string };
  delegationReason?: string;
  approvalStatus: AssignmentApprovalStatus;
  status: 'ACTIVE' | 'INACTIVE';
  assignedById: string;
  assignedBy: { id: string; email: string; firstName: string; lastName: string };
  createdAt: string;
}

interface CreateFunctionInput {
  code: string;
  name: string;
  description?: string;
  category?: FunctionCategory;
  scopeType?: FunctionScopeType;
  allowMultipleHolders?: boolean;
  requiresApproval?: boolean;
  canDelegate?: boolean;
  maxDelegationDays?: number;
  sortOrder?: number;
}

interface CreateAssignmentInput {
  functionId: string;
  userId: string;
  scopeType?: FunctionScopeType;
  scopeEntityId?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

interface DelegateInput {
  delegateUserId: string;
  effectiveTo: string;
  reason?: string;
}
```

---

## 6. API Integration Points

### 6.1 Existing Backend Endpoints

| Endpoint | Method | Purpose | Used By |
|----------|--------|---------|---------|
| `/api/v1/functions` | GET | List all functions | FunctionsTab, WorkflowBuilder |
| `/api/v1/functions` | POST | Create function | FunctionFormModal |
| `/api/v1/functions/:id` | GET | Get function details | FunctionFormModal (edit) |
| `/api/v1/functions/:id` | PATCH | Update function | FunctionFormModal |
| `/api/v1/functions/:id` | DELETE | Delete function | FunctionsTab |
| `/api/v1/functions/:id/holders` | GET | Get current holders | FunctionsTab |
| `/api/v1/functions/:id/assignments` | GET | List assignments | FunctionsTab |
| `/api/v1/functions/:id/assignments` | POST | Create assignment | AssignmentFormModal |
| `/api/v1/functions/my-assignments` | GET | User's assignments | MyFunctionsPage |
| `/api/v1/assignments/:id` | GET | Get assignment | DelegationModal |
| `/api/v1/assignments/:id` | DELETE | Revoke assignment | FunctionsTab, MyFunctionsPage |
| `/api/v1/assignments/:id/delegate` | POST | Delegate function | DelegationModal |

### 6.2 API Hooks Structure (useFunctions.ts)

```typescript
// Query hooks
export function useFunctions(filters?: FunctionFilters)
export function useFunction(id: string)
export function useFunctionHolders(functionId: string)
export function useFunctionAssignments(functionId: string)
export function useMyAssignments()

// Mutation hooks
export function useCreateFunction()
export function useUpdateFunction()
export function useDeleteFunction()
export function useCreateAssignment()
export function useRevokeAssignment()
export function useDelegateFunction()
```

---

## 7. Testing Strategy

### 7.1 Unit Tests

| Component | Test File | Key Tests |
|-----------|-----------|-----------|
| FunctionsTab | `FunctionsTab.test.tsx` | Render list, create button, search |
| FunctionFormModal | `FunctionFormModal.test.tsx` | Validation, submit, edit mode |
| DelegationModal | `DelegationModal.test.tsx` | Date validation, max days, submit |
| WorkflowBuilder (FUNCTION) | `WorkflowBuilderPage.test.tsx` | FUNCTION type selection, validation |

### 7.2 Integration Tests

| Scenario | Steps | Assertions |
|----------|-------|------------|
| Create and assign function | Create → Assign → Verify | Function created, assignment appears |
| Delegate and verify | Assign → Delegate → Check resolver | Delegate receives approval requests |
| Workflow with FUNCTION | Create chain → Add FUNCTION step → Submit request | Request routed to function holder |

### 7.3 Manual Testing Checklist

```
[ ] Settings → Functions tab visible to admins only
[ ] Can view all 10 system functions
[ ] Can create custom function
[ ] Cannot delete system function
[ ] Can assign function to user
[ ] Can revoke assignment
[ ] Workflow Builder shows FUNCTION option
[ ] Can save workflow with FUNCTION step
[ ] User can see their functions in My Functions
[ ] User can delegate their delegatable functions
[ ] Cannot delegate beyond maxDelegationDays
[ ] Delegations appear correctly for both parties
```

---

## 8. Timeline & Dependencies

### 8.1 Implementation Order

```
Week 1 (Days 1-5):
├── Day 1-2: Create useFunctions.ts API hooks
├── Day 2-3: Create FunctionsTab component
├── Day 3-4: Create FunctionFormModal
├── Day 4-5: Create AssignmentFormModal
└── Day 5: Integrate into SettingsPage

Week 2 (Days 6-10):
├── Day 6-7: Update WorkflowBuilderPage for FUNCTION type
├── Day 7-8: Create MyFunctionsPage
├── Day 8-9: Create DelegationModal
├── Day 9-10: Testing & bug fixes
└── Day 10: Documentation & code review
```

### 8.2 Dependencies

| Task | Depends On | Blocking |
|------|------------|----------|
| useFunctions.ts | Backend API (DONE) | All UI components |
| FunctionsTab | useFunctions.ts | - |
| WorkflowBuilder update | useFunctions.ts | - |
| MyFunctionsPage | useFunctions.ts | - |
| DelegationModal | MyFunctionsPage | - |

### 8.3 Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Scope creep | Medium | High | Stick to defined features |
| API changes needed | Low | Medium | Backend already tested |
| UI/UX feedback delays | Medium | Medium | Create mockups first |
| Permission issues | Low | Low | Use existing RBAC patterns |

---

## Appendix A: UI Mockup References

### A.1 Functions Tab Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ Functions                                        [+ Add Function]   │
├─────────────────────────────────────────────────────────────────────┤
│ 🔍 Search functions...    [Category ▼] [Scope ▼] [Status ▼]        │
├─────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ CODE              NAME                SCOPE    HOLDERS  ACTIONS │ │
│ ├─────────────────────────────────────────────────────────────────┤ │
│ │ RESOURCE_ALLOCATOR Resource Allocator PRACTICE    1     [•••]  │ │
│ │ LEAVE_APPROVER    Leave Approver      PRACTICE    1     [•••]  │ │
│ │ TIMESHEET_APPROVER Timesheet Approver PROJECT     0     [•••]  │ │
│ │ PRACTICE_HEAD     Practice Head       PRACTICE    0     [•••]  │ │
│ │ ...                                                             │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                           Page 1 of 1  [< >]       │
└─────────────────────────────────────────────────────────────────────┘
```

### A.2 Workflow Builder - FUNCTION Selection

```
┌─────────────────────────────────────────────────────────────────────┐
│ Approver Type *                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐           │
│ │   🛡️      │ │   👤      │ │   ⚡      │ │   🎭      │           │
│ │   Role    │ │   User    │ │  Dynamic  │ │ Function  │ ← SELECTED│
│ │  Anyone   │ │  Specific │ │  Runtime  │ │  Whoever  │           │
│ │ with role │ │   user    │ │ determined│ │ holds hat │           │
│ └───────────┘ └───────────┘ └───────────┘ └───────────┘           │
├─────────────────────────────────────────────────────────────────────┤
│ Select Function *                                                   │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ RESOURCE_ALLOCATOR - Resource Allocator (1 holder)        ▼    │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Appendix B: Related Documentation

- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
- [AUDIT_ORG_STRUCTURE_APPROVALS_2026-01-20_1045.md](./AUDIT_ORG_STRUCTURE_APPROVALS_2026-01-20_1045.md) - Original audit
- [IMPLEMENTATION_PLAN_APPROVAL_FUNCTIONS_2026-01-20_1145.md](./IMPLEMENTATION_PLAN_APPROVAL_FUNCTIONS_2026-01-20_1145.md) - Backend implementation plan
- Backend API reference: `/api/v1/functions/*` and `/api/v1/assignments/*`

---

## Appendix C: Implementation Outcome

**Implementation Completed:** January 20, 2026  
**Status:** ✅ COMPLETE

### Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `apps/frontend/src/types/functions.ts` | ~120 | Type definitions for functions, assignments |
| `apps/frontend/src/hooks/useFunctions.ts` | ~230 | React Query hooks for API integration |
| `apps/frontend/src/components/settings/FunctionsTab.tsx` | ~280 | Main functions management UI |
| `apps/frontend/src/components/settings/FunctionFormModal.tsx` | ~200 | Create/edit function modal |
| `apps/frontend/src/components/settings/AssignmentFormModal.tsx` | ~270 | Assign function to user modal |
| `apps/frontend/src/components/settings/DelegationModal.tsx` | ~290 | Delegate function to colleague modal |
| `apps/frontend/src/pages/MyFunctionsPage.tsx` | ~260 | User's function assignments page |

**Total new code: ~1,650 lines**

### Files Modified

| File | Changes |
|------|---------|
| `apps/frontend/src/pages/SettingsPage.tsx` | Added 'functions' to TabType, added Functions tab, imported FunctionsTab |
| `apps/frontend/src/pages/WorkflowBuilderPage.tsx` | Added FUNCTION to ApproverType, added Briefcase icon, added functions query, added FUNCTION selector, updated validation |
| `apps/frontend/src/App.tsx` | Added MyFunctionsPage lazy import and route |
| `apps/frontend/src/components/layout/MainLayout.tsx` | Added Briefcase icon, added "My Functions" nav item |

### Validation Results

| Check | Result |
|-------|--------|
| TypeScript compilation | ✅ No errors in created/modified files |
| Type definitions | ✅ All types properly defined |
| API hooks | ✅ All CRUD operations covered |
| Settings integration | ✅ Functions tab added to Settings page |
| WorkflowBuilder integration | ✅ FUNCTION type added as 4th approver option |
| User delegation | ✅ MyFunctionsPage with delegation modal |
| Navigation | ✅ "My Functions" link added to sidebar |
| Routing | ✅ /my-functions route configured |

### Features Delivered

1. **Function Management Tab (Settings)**
   - View all approval functions
   - Create new custom functions
   - Edit existing functions (name, description)
   - Delete non-system functions
   - Assign users to functions
   - Revoke assignments
   - View current holders (expandable)
   - Search and filter functions

2. **Workflow Builder - FUNCTION Approver Type**
   - FUNCTION added as 4th approver type option
   - Function dropdown when FUNCTION is selected
   - Validation for required function selection
   - Display function name in step card
   - Proper icon (Briefcase) for function type

3. **User Delegation UI (My Functions Page)**
   - View owned function assignments
   - View delegated-to-me assignments
   - View expired assignments (collapsed)
   - Delegate functions to colleagues
   - Date range selection for delegations
   - Cannot exceed assignment end date

### Architecture Alignment

✅ **Writer + Scribe Model**: All functionality works without AI assistance  
✅ **Function-based Approvals**: UI supports the new approval function system  
✅ **Dynamic Resolution**: Functions are resolved at runtime to current holders  
✅ **Delegation Support**: Users can self-service delegate their functions

---

