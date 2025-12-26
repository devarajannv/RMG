# Implementation Alignment Tracker

> **Purpose:** Track how current implementation aligns with the Writer + Scribe architecture.  
> **Last Updated:** December 26, 2025  
> **Reference:** See `ARCHITECTURE.md` for full architecture details.

---

## Alignment Summary

```
WRITER (Core Product)     ███████████████████████░  98% Complete
SCRIBE (AI Layer)         ██░░░░░░░░░░░░░░░░░░░░░░   8% Complete
OVERALL                   █████████████████░░░░░░░  68% Complete
```

---

## Part 1: WRITER (Core Product) Status

The Writer must be 100% functional without any AI.

### 1.1 Backend Services (95% Complete ✅)

| Service | Status | Traditional UI Support | Notes |
|---------|--------|----------------------|-------|
| Authentication | ✅ 100% | ✅ Login form, SSO button | Complete |
| Resources | ✅ 100% | ✅ Full CRUD forms | Complete |
| Projects | ✅ 100% | ✅ Full CRUD forms | Complete |
| Allocations | ✅ 100% | ✅ Full CRUD forms | Complete |
| Clients | ✅ 100% | ✅ Full CRUD forms | Complete |
| Contracts | ✅ 100% | ✅ Full CRUD forms | Complete |
| Timesheets | ✅ 100% | ✅ Entry & approval forms | Complete |
| Documents | ✅ 100% | ✅ Upload & versioning UI | Complete |
| Currency | ✅ 100% | ✅ Settings UI | Complete |
| Roles & Permissions | ✅ 100% | ✅ Full Settings UI | Complete |
| User Management | ✅ 100% | ✅ Full CRUD + Role Assignment | **NEW: Complete** |
| Analytics | ✅ 100% | ✅ Charts & reports | Complete |
| Requests & Approvals | ✅ 100% | ✅ Full UI | Complete |
| Workflows | ✅ 100% | ✅ Visual Builder | **NEW: Complete** |
| Notifications | ✅ 100% | ✅ Real-time panel | WebSocket |

### 1.2 Frontend Pages (95% Complete)

| Page | Status | Can Work Without AI? | Gap |
|------|--------|---------------------|-----|
| Login | ✅ Complete | ✅ Yes | - |
| Dashboard | ✅ Complete | ✅ Yes | - |
| Resources | ✅ Complete | ✅ Yes | - |
| Projects | ✅ Complete | ✅ Yes | - |
| Allocations | ✅ Complete | ✅ Yes | - |
| Clients | ✅ Complete | ✅ Yes | - |
| Contracts | ✅ Complete | ✅ Yes | - |
| Timesheets | ✅ Complete | ✅ Yes | - |
| Bench | ✅ Complete | ✅ Yes | - |
| Reports | ✅ Complete | ✅ Yes | - |
| Analytics | ✅ Complete | ✅ Yes | - |
| Smart Search | ⚠️ Complete | ⚠️ Degraded | Uses simulated AI |
| Data Management | ⚠️ Complete | ⚠️ Degraded | Uses simulated AI |
| Settings | ✅ Complete | ✅ Yes | **Expanded with Users, Audit, Org** |
| Requests | ✅ Complete | ✅ Yes | - |
| Request Detail | ✅ Complete | ✅ Yes | - |
| **Workflow Builder** | ✅ Complete | ✅ Yes | **NEW: Visual Canvas** |
| My Approvals | ✅ Complete | ✅ Yes | Part of Requests |

### 1.3 Frontend Infrastructure (90% Complete)

| Component | Status | Notes |
|-----------|--------|-------|
| State Management | ⚠️ Partial | Auth only, need more stores |
| API Client | ✅ Complete | Needs streaming support |
| Custom Hooks | ✅ Complete | usePermissions implemented |
| Permission UI | ✅ Complete | Can/Cannot gate components |
| Real-time | ✅ Complete | WebSocket infrastructure |
| Error Handling | ✅ Complete | API error class |
| Loading States | ✅ Complete | Skeletons available |
| Form Handling | ✅ Complete | React Hook Form + Zod |
| Sidebar | ✅ Complete | Reorganized + Permission-filtered |

### 1.4 Sidebar Reorganization ✅ COMPLETE

**New Structure:**
```
Dashboard
─────────────────
Daily Work
  ├── Requests (with badge)
  ├── Timesheets
  └── My Approvals (with badge)
─────────────────
Resource Management
  ├── Resources
  ├── Bench
  └── Allocations
─────────────────
Business
  ├── Clients
  ├── Projects
  └── Contracts
─────────────────
Intelligence
  ├── Smart Search
  ├── Analytics
  └── Reports
─────────────────
Administration
  ├── Data Management
  ├── Workflows
  └── Settings
```

### 1.5 Critical Gaps for Writer Completion

| Gap | Impact | Effort | Priority |
|-----|--------|--------|----------|
| ~~Request Flow UI~~ | ~~Users cannot create/manage requests~~ | ~~3-5 days~~ | ✅ **DONE** |
| ~~Approval Queue UI~~ | ~~Users cannot see pending approvals~~ | ~~2-3 days~~ | ✅ **DONE** |
| ~~**Permission System (FE)**~~ | ~~All users see everything~~ | ~~2-3 days~~ | ✅ **DONE** |
| ~~**Real-time Notifications**~~ | ~~Users see mock data~~ | ~~2-3 days~~ | ✅ **DONE** |
| ~~**Workflow Builder**~~ | ~~Admins cannot configure workflows~~ | ~~5-7 days~~ | ✅ **DONE** |

### 1.6 Workflow Builder ✅ COMPLETE (NEW)

**Implemented Features:**
- Visual workflow list with status badges and step counts
- Search and filter workflows by status
- Create/Edit workflow form with validation
- Drag-and-drop step reordering (using motion/react Reorder)
- Step configuration panel with 3 tabs:
  - Basic: Name, instructions, approver type, approver selection
  - Advanced: Optional step, delegation, skip conditions, conflict resolution
  - Timing & SLA: SLA hours, auto-approve, reminders, escalation

**Approver Types Supported:**
- Role-based: Any user with selected role can approve
- User-specific: Only the selected user can approve  
- Dynamic: Determined at runtime based on request context

**Approval Modes:**
- ANY: First approval or rejection decides
- ALL: All assigned approvers must approve
- MAJORITY: More than half must approve
- FIRST_RESPONSE: First response wins

**Files Created:**
- `apps/frontend/src/pages/WorkflowBuilderPage.tsx` (~1,437 lines)
- `apps/frontend/src/pages/WorkflowBuilderPage.test.tsx` (12 tests)

**API Integration:**
- Uses existing `/api/v1/approval-chains` endpoints
- Full CRUD: Create, Read, Update, Delete workflows
- Step management: Add, reorder, delete steps

### 1.7 Permission System (Frontend) ✅ COMPLETE

**Implemented Components:**
- `usePermissions` hook - React Query based permission fetching with caching
- `<Can>` component - Permission gate for conditional rendering
- `<Cannot>` component - Inverse permission gate
- `<AdminOnly>` / `<ManagerOnly>` - Role-based gates
- Navigation filtering - Sidebar shows/hides based on permissions
- Page action gating - Create/Edit/Delete buttons permission-controlled

**Usage Examples:**
```tsx
// Single permission check
<Can permission="resources:create">
  <Button>Add Resource</Button>
</Can>

// Multiple permissions (any)
<Can anyPermission={['resources:update', 'resources:delete']}>
  <ActionMenu />
</Can>

// Using the hook directly
const { can, hasPermission } = usePermissions();
if (can.createResource) { /* ... */ }
```

**Files Created:**
- `apps/frontend/src/hooks/usePermissions.ts` - Permission hook with 30+ permission constants
- `apps/frontend/src/components/permissions/Can.tsx` - Gate components
- `apps/frontend/src/hooks/index.ts` - Barrel export

**Updated Files:**
- `apps/frontend/src/components/layout/MainLayout.tsx` - Permission-filtered navigation
- `apps/frontend/src/pages/ResourcesPage.tsx` - Permission-gated actions
- `apps/frontend/src/pages/RequestsPage.tsx` - Permission-gated create button
- `apps/frontend/src/test/utils.tsx` - Pre-populated permissions for tests
- `apps/frontend/src/test/setup.ts` - Auth store initialization
- `apps/frontend/src/test/mocks/handlers.ts` - Mock user with permissions

### 1.7 Real-time Notifications (WebSocket) ✅ COMPLETE

**Implemented Infrastructure:**
- WebSocket server attached to HTTP server (path: `/ws`)
- JWT authentication on connection via URL query parameter
- Room-based message routing (user rooms, tenant rooms)
- Heartbeat mechanism for connection health
- Auto-reconnection on client side (5 attempts, 3s interval)

**Backend Components:**
- `apps/api/src/lib/websocket.ts` - WebSocket manager singleton
  - `sendToUser(userId, type, payload)` - Send to specific user
  - `sendToUsers(userIds, type, payload)` - Send to multiple users
  - `broadcastToTenant(tenantId, type, payload)` - Broadcast to tenant
  - `isUserOnline(userId)` - Check online status
  
**Frontend Components:**
- `apps/frontend/src/hooks/useWebSocket.ts` - WebSocket connection hook
  - `useWebSocket()` - Low-level connection management
  - `useNotifications()` - High-level notification subscription
- `apps/frontend/src/components/notifications/NotificationPanel.tsx`
  - Live notification feed with real-time updates
  - Mark as read / Mark all read functionality
  - Visual connection status indicator

**Event Types (WS_EVENTS):**
```typescript
// Notification events
NOTIFICATION: 'notification',
NOTIFICATION_READ: 'notification:read',
NOTIFICATION_COUNT: 'notification:count',

// Request events
REQUEST_CREATED: 'request:created',
REQUEST_UPDATED: 'request:updated',
REQUEST_STATUS_CHANGED: 'request:status_changed',
REQUEST_ASSIGNED: 'request:assigned',

// Approval events
APPROVAL_REQUIRED: 'approval:required',
APPROVAL_COMPLETED: 'approval:completed',
```

**Integration with Notification Service:**
- `notification.service.ts` now emits WebSocket events when:
  - Single notification created → User receives `NOTIFICATION` + `NOTIFICATION_COUNT`
  - Bulk notifications created → Each user receives their notification

**Usage Example:**
```tsx
// Auto-connect when authenticated, subscribe to events
const { unreadCount, isConnected } = useNotifications({
  onNotification: (payload) => {
    toast.info(payload.title);
  },
  onCountUpdate: (count) => {
    updateBadge(count);
  },
});
```

---

## Part 2: SCRIBE (AI Layer) Status

The Scribe accelerates everything but is never required.

### 2.1 AI Infrastructure (0% Complete ❌)

| Component | Status | Notes |
|-----------|--------|-------|
| LLM Integration | ❌ None | No API calls to any LLM |
| Streaming (SSE) | ❌ None | No streaming infrastructure |
| Vector Database | ❌ None | No embeddings or RAG |
| Prompt Templates | ❌ None | No prompt engineering |
| Cost Management | ❌ None | No token tracking |
| Fallback Handling | ❌ None | No graceful degradation |

### 2.2 AI Features (Simulated Only)

| Feature | Current State | Target State |
|---------|--------------|--------------|
| Chat Agent | Pattern matching | Real LLM with context |
| Smart Matching | Rule-based scoring | LLM-enhanced recommendations |
| Column Detection | Regex patterns | Semantic understanding |
| Natural Language Search | Keyword extraction | Intent understanding |
| Workflow Generation | ❌ None | Describe → Generate |
| Onboarding Interview | ❌ None | Conversational setup |

### 2.3 What Exists (Simulated AI)

```typescript
// Current "AI" implementation
// apps/api/src/modules/agent/agent.service.ts

// This is NOT AI - it's pattern matching:
const ROUTING_CONFIG = {
  tier1: [
    { patterns: ['who is', 'bench'], action: 'search_resources' },
    { patterns: ['project', 'status'], action: 'search_projects' },
  ],
  // ...
};

// Query processing:
function routeQuery(query: string) {
  for (const rule of ROUTING_CONFIG.tier1) {
    if (rule.patterns.some(p => query.toLowerCase().includes(p))) {
      return rule.action;  // Pattern match, not AI
    }
  }
}
```

### 2.4 AI Gaps for Scribe Implementation

| Gap | Impact | Effort | Priority |
|-----|--------|--------|----------|
| **LLM Service** | No real AI capability | 3-5 days | 🟠 P1 (after Writer) |
| **SSE Infrastructure** | No streaming responses | 2-3 days | 🟠 P1 |
| **pgvector Setup** | No semantic search | 2-3 days | 🟡 P2 |
| **Onboarding Agent** | No AI-guided setup | 5-7 days | 🟡 P2 |
| **Workflow Agent** | No workflow generation | 5-7 days | 🟡 P2 |

---

## Part 3: Alignment Checklist

### Writer + Scribe Model Requirements

| Requirement | Implemented? | Evidence |
|-------------|--------------|----------|
| Traditional UI is complete | ⚠️ Partial | Missing Workflow Builder only |
| Every action possible without AI | ✅ Yes | Request flow complete, permissions in place |
| AI outputs feed into traditional UI | ⚠️ Partial | Agent widget shows results, no form pre-fill |
| AI is optional toggle | ⚠️ Partial | Agent can be ignored, but no explicit toggle |
| Same data, same rules | ✅ Yes | All flows through same API |
| AI cannot bypass validation | ✅ Yes | API validates all requests |
| AI cannot bypass permissions | ✅ Yes | Auth middleware + frontend permission gates |

### Onboarding Flow

| Requirement | Implemented? | Notes |
|-------------|--------------|-------|
| AI-guided setup available | ❌ No | No onboarding agent |
| Manual setup available | ❌ No | No setup wizard at all |
| Both paths complete | ❌ No | Neither exists |

### Daily Operations

| Requirement | Implemented? | Notes |
|-------------|--------------|-------|
| All functions via traditional UI | ❌ No | Request flow missing |
| AI can pre-fill forms | ❌ No | No form integration |
| User always reviews before submit | ⚠️ Partial | Where forms exist, yes |

---

## Part 4: Implementation Plan

### Sprint 1: Complete the Writer (2-3 weeks) ✅ COMPLETE

**Goal:** Full product works without any AI

```
Week 1: ✅ COMPLETE
├── Day 1-2: Request List Page ✅
├── Day 3-4: Request Detail Page ✅
├── Day 5: Request Create Form ✅
└── Sidebar Reorganization ✅

Week 2: ✅ COMPLETE
├── Day 1-2: Permission System (Frontend) ✅
├── Day 3-4: Real-time Notifications ✅
└── Day 5: Settings Expansion ⏳

Week 3: ✅ COMPLETE
├── Day 1-3: Workflow Builder (Visual Canvas) ✅
├── Day 4-5: Workflow Templates ⏳
└── End: Writer is 95% complete ✅
```

**Writer Status:** 95% Complete
- All critical P0 items done
- Minor enhancements remaining (Settings expansion, Workflow templates)

### Sprint 2: Add the Scribe (2-3 weeks)

**Goal:** AI accelerates all functions

```
Week 4:
├── Day 1-2: LLM Integration Service
├── Day 3-4: SSE Streaming Infrastructure
└── Day 5: Update Agent Module

Week 5:
├── Day 1-2: pgvector Setup
├── Day 3-5: Natural Language Search (Real)
└── Day 5: Form Pre-fill from AI

Week 6:
├── Day 1-3: Onboarding Agent
├── Day 4-5: Workflow Agent
└── End: Scribe is functional
```

### Sprint 3: Polish (1 week)

```
Week 7:
├── Day 1-2: AI Fallback Handling
├── Day 3: Cost Optimization
├── Day 4: Monitoring & Analytics
└── Day 5: Documentation
```

---

## Part 5: Metrics

### Current Metrics

| Metric | Value |
|--------|-------|
| Backend modules | 22 |
| API endpoints | 99 |
| Database models | 55 |
| Frontend pages | 20 (19 complete + 1 basic) |
| Lines of backend code | ~15,000 |
| Lines of frontend code | ~25,000+ |
| Real AI integrations | 0 |

### Target Metrics (Post-Implementation)

| Metric | Target |
|--------|--------|
| Frontend pages | 22+ |
| Permission-gated components | 100% |
| Real-time notifications | Live |
| AI response time | <3s streaming start |
| Onboarding time (AI) | <30 minutes |
| Onboarding time (Manual) | <3 hours |

---

## Change Log

| Date | Change |
|------|--------|
| 2025-12-18 | **Permission System (Frontend) complete** - usePermissions hook, Can/Cannot components, navigation filtering |
| 2025-12-18 | Request Flow UI complete (RequestsPage, RequestDetailPage) |
| 2025-12-18 | Sidebar reorganized with logical groupings |
| 2025-12-18 | Pending approvals badge added to navigation |
| 2025-12-18 | Initial alignment tracker created |

---

*This document tracks implementation progress against the Writer + Scribe architecture.*
*Update weekly or after major milestones.*
