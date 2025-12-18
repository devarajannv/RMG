# Planning: Intelligent Role-Aware UI System

> **Status:** In Planning  
> **Last Updated:** December 18, 2025  
> **Discussion Paused:** Resumed - Architecture decided

---

## 1. Current State Assessment

### 1.1 What's Implemented

#### Backend (Complete ✅)
| Component | Status | Description |
|-----------|--------|-------------|
| Role System | ✅ | 30+ granular permissions, 5-level hierarchy |
| Permission Model | ✅ | module:action:scope format (e.g., `resources:read:team`) |
| Role Assignment | ✅ | Audit trail, user-role mapping |
| Auth Middleware | ✅ | `authenticate()`, `authorize()`, `requireRoles()` |
| Permission Check API | ✅ | `/api/roles/permissions/user/:userId`, `/api/roles/permissions/check` |

#### Frontend (Incomplete ❌)
| Component | Status | Issue |
|-----------|--------|-------|
| Role-based Menu | ❌ | All 13 menu items shown to all users |
| Permission-based UI | ❌ | No conditional rendering based on permissions |
| Data Scoping | ❌ | All users see all data (no hierarchy filtering) |
| Dashboard Personalization | ❌ | Same dashboard for Admin, Manager, and User |
| Notification Integration | ❌ | Hardcoded mock notifications |

### 1.2 Current Sidebar Structure (Needs Reorganization)

```
Current Order (Illogical):
1. Dashboard
2. Resources
3. Projects
4. Allocations
5. Clients
6. Contracts
7. Bench Analysis
8. Smart Search
9. Reports
10. Timesheets      ← Daily task buried at #10
11. Analytics
12. Data Management
13. Settings
```

**Problems Identified:**
- Timesheets (daily activity) is at position 10
- Bench Analysis separated from Resources
- No logical grouping of related features
- No consideration for user role in ordering

### 1.3 Permission System Details (Backend)

**Permission Format:** `module:action:scope`

```typescript
// Examples from role.service.ts
'resources:read'           // Read all resources
'resources:read:own'       // Read own profile only
'resources:read:team'      // Read team resources
'resources:read:practice'  // Read practice resources
'allocations:approve'      // Approve allocations
'timesheets:approve'       // Approve timesheets
'settings:update'          // Modify settings
```

**Available Modules:** resources, projects, allocations, timesheets, contracts, clients, reports, analytics, settings, bench, documents

**Hierarchy Levels:** Organization → Delivery → Practice → Team → Individual

---

## 2. Architectural Decision: React Query + Permission Hook

### 2.1 Why This Approach (Best Practice)

| Aspect | Zustand Store Only | React Query (Chosen) |
|--------|-------------------|----------------------|
| **Initial Load** | Fetch once, store forever | Fetch with auth, cache with TTL |
| **Staleness** | Can become stale | Auto-refresh with React Query |
| **Role Change** | Manual refresh needed | Invalidate query, auto-refetch |
| **Server Sync** | Client can drift | Server is always source of truth |
| **Offline** | Works | Works + revalidates on reconnect |
| **Multiple Tabs** | Each tab independent | Synced across tabs |

### 2.2 Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      AUTH STORE                         │
│  (Zustand + persist)                                    │
│  - user: { id, email, name, tenantId }                 │
│  - accessToken                                          │
│  - isAuthenticated                                      │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  PERMISSION QUERY                       │
│  (React Query / TanStack Query)                        │
│  - Fetches /api/auth/me (enhanced)                     │
│  - Caches with staleTime: 5 min                        │
│  - Refetches on window focus                           │
│  - Invalidates on role change event                    │
│  - Returns: { permissions, roles, hierarchy, modules } │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  PERMISSION HOOK                        │
│  usePermissions()                                       │
│  - hasPermission('resources:create')                   │
│  - hasAnyPermission(['a', 'b'])                        │
│  - hasRole('Admin')                                     │
│  - canAccessModule('analytics')                        │
│  - isLoading, isError states                           │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  PERMISSION GATE                        │
│  <Can permission="resources:create">                   │
│    <Button>Create</Button>                             │
│  </Can>                                                 │
│                                                         │
│  <Can permission="resources:create" fallback={null}>  │
│  <Can permission="resources:create" fallback={<Upgrade/>}> │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Implementation Code

```typescript
// hooks/usePermissions.ts
export function usePermissions() {
  const { isAuthenticated, accessToken } = useAuthStore();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => authApi.getPermissions(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  return {
    permissions: data?.permissions ?? [],
    roles: data?.roles ?? [],
    hierarchy: data?.hierarchy,
    isLoading,
    error,
    hasPermission: (p: string) => data?.permissions?.includes(p) ?? false,
    hasRole: (r: string) => data?.roles?.includes(r) ?? false,
    canAccessModule: (m: string) => data?.accessibleModules?.includes(m) ?? false,
  };
}
```

---

## 3. Proposed Sidebar Reorganization (Grouped)

### Decided: Grouped Sections

```
DAILY WORK
├── Dashboard
├── Timesheets
└── Requests (NEW)

RESOURCE MANAGEMENT
├── Resources
├── Bench Analysis
└── Allocations

BUSINESS
├── Projects
├── Clients
└── Contracts

INTELLIGENCE
├── Smart Search
├── Reports
└── Analytics

SYSTEM
├── Data Management
└── Settings
```

### Navigation Items with Permissions

```typescript
const navGroups = [
  {
    label: 'Daily Work',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/', permission: null },
      { icon: Clock, label: 'Timesheets', href: '/timesheets', permission: 'timesheets:read:own' },
      { icon: ClipboardList, label: 'Requests', href: '/requests', permission: 'requests:read:own' },
    ]
  },
  {
    label: 'Resource Management',
    items: [
      { icon: Users, label: 'Resources', href: '/resources', permission: 'resources:read' },
      { icon: Armchair, label: 'Bench', href: '/bench', permission: 'bench:read' },
      { icon: Calendar, label: 'Allocations', href: '/allocations', permission: 'allocations:read' },
    ]
  },
  {
    label: 'Business',
    items: [
      { icon: FolderKanban, label: 'Projects', href: '/projects', permission: 'projects:read' },
      { icon: Building2, label: 'Clients', href: '/clients', permission: 'clients:read' },
      { icon: FileText, label: 'Contracts', href: '/contracts', permission: 'contracts:read' },
    ]
  },
  {
    label: 'Intelligence',
    items: [
      { icon: Brain, label: 'Smart Search', href: '/smart-search', permission: 'resources:read' },
      { icon: BarChart3, label: 'Reports', href: '/reports', permission: 'reports:read' },
      { icon: PieChart, label: 'Analytics', href: '/analytics', permission: 'analytics:read' },
    ]
  },
  {
    label: 'System',
    items: [
      { icon: Database, label: 'Data Management', href: '/data-management', permission: 'settings:update' },
      { icon: Settings, label: 'Settings', href: '/settings', permission: 'settings:read' },
    ]
  },
];
```

---

## 4. Role-Based Dashboard Widgets

| Widget | Admin | Manager | User |
|--------|-------|---------|------|
| Organization KPIs | ✅ | ❌ | ❌ |
| Team Utilization | ✅ | ✅ (own team) | ❌ |
| My Utilization | ✅ | ✅ | ✅ |
| Pending Approvals | ✅ | ✅ | ❌ |
| My Requests | ✅ | ✅ | ✅ |
| Revenue Metrics | ✅ (finance perm) | ❌ | ❌ |
| Rolloff Alerts | ✅ | ✅ (own team) | ✅ (self) |
| Bench Overview | ✅ | ✅ (own practice) | ❌ |

---

## 5. Enhanced /auth/me Endpoint

```typescript
// Enhanced response structure
{
  user: {
    id: "uuid",
    email: "user@company.com",
    firstName: "John",
    lastName: "Doe",
    roles: ["Manager"],
    permissions: ["resources:read:team", "timesheets:approve", ...],
    hierarchyLevel: "TEAM",
    hierarchyId: "team-uuid",
    resource: { id: "resource-uuid", employeeId: "EMP001" }
  },
  accessibleModules: ["dashboard", "timesheets", "resources", "bench", "reports"],
  dashboardConfig: {
    widgets: ["myUtilization", "teamUtilization", "pendingApprovals", "myRequests"],
    defaultView: "team"
  }
}
```

---

## 6. CTC Access Control (Separate Initiative)

**Decision:** Design for it now, implement after Request Flow UI.

### Why Separate
- Needs Request Flow UI for access request workflow
- Adds 2+ days to current scope
- Can be cleanly added later

### Prepare Now
- Add `ctc:read:own` and `ctc:read:all` permissions
- Hide CTC fields in UI based on permission
- Build approval workflow later using Request Flow

---

## 7. Implementation Phases

### Phase 1: Permission Foundation (1-2 days)
1. Create `usePermissions()` hook with React Query
2. Enhance `/auth/me` to return full permission data
3. Create `<Can>` permission gate component
4. Test with existing pages

### Phase 2: Smart Sidebar (1 day)
1. Add permission requirements to nav items
2. Implement grouped navigation structure
3. Implement permission-based filtering
4. Add "Requests" menu item

### Phase 3: Request Flow UI (3-4 days)
1. RequestsPage with tabs
2. NewRequestPage with form
3. RequestDetailPage with actions
4. NotificationBell integration
5. Dashboard widgets for requests

### Phase 4: Data Scoping (2-3 days)
1. Backend middleware for hierarchy filtering
2. Frontend indication of filtered data
3. Implement CTC access control
4. Settings access levels

### Phase 5: Dashboard Personalization (1-2 days)
1. Role-based widget visibility
2. Configurable dashboard layouts
3. Personal dashboard preferences

---

## 8. Technical Notes

### Current Auth Store
**File:** `apps/frontend/src/stores/authStore.ts`

```typescript
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  roles?: string[];  // Currently optional, not always populated
}
```

### React Query Already in Use
The codebase already uses `@tanstack/react-query` in:
- AllocationsPage
- SettingsPage
- ProjectsPage
- And others

This makes the Permission Query approach consistent with existing patterns.

---

## 9. Related Documentation

- [REQUEST_FLOW_SYSTEM.md](./REQUEST_FLOW_SYSTEM.md) - Request Flow backend implementation
- [WORKFLOW_ENGINE_DESIGN.md](./WORKFLOW_ENGINE_DESIGN.md) - Workflow engine design
- [NEXT_ACTIONS.md](./NEXT_ACTIONS.md) - Full roadmap with priorities
- [FEATURE_SCOPE.md](./FEATURE_SCOPE.md) - Complete feature inventory

---

## 10. Dependency: Workflow Engine

This plan integrates with the **Workflow Engine** design. See [WORKFLOW_ENGINE_DESIGN.md](./WORKFLOW_ENGINE_DESIGN.md).

The Permission System we build here will integrate with workflows:
- `workflows:manage` permission for workflow builders
- `workflows:view` for participants
- Role-based step assignment uses the same permission hooks

---

*Planning document - Architecture decided*
*Last updated: December 18, 2025*
