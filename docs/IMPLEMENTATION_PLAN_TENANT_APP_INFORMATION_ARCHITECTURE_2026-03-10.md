# Tenant App Information Architecture Implementation Plan

Date: 2026-03-10  
Status: Implemented frontend plan record  
Scope: Frontend navigation, route structure, settings/admin surface split inside tenant app

---

## 1. Objective

Implement the approved tenant-app information architecture by separating:

- personal, user-scoped settings
- tenant-wide administrative capabilities
- workflow governance capabilities

This plan operationalizes the decision recorded in:
- [docs/INFORMATION_ARCHITECTURE_DECISION_2026-03-10.md](docs/INFORMATION_ARCHITECTURE_DECISION_2026-03-10.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)

---

## 2. Current Frontend State

### 2.1 Current Sidebar
Current sidebar is defined in [apps/frontend/src/components/layout/MainLayout.tsx](apps/frontend/src/components/layout/MainLayout.tsx).

Current admin grouping:
- `Administration`
  - Onboarding
  - Data Management
  - Workflows
  - Settings

### 2.2 Current Settings Surface
Current settings tabs are defined in [apps/frontend/src/pages/SettingsPage.tsx](apps/frontend/src/pages/SettingsPage.tsx).

Current tabs combine three scopes:

**Personal**
- Profile
- Notifications
- Display
- Security

**Tenant Admin**
- Users
- Roles
- Functions
- Request Types
- Currency
- Integrations
- Organization
- Audit Logs

**Workflow Governance**
- Workflow Settings

### 2.3 Current Workflow Split
- `/workflows` route renders [apps/frontend/src/pages/WorkflowBuilderPage.tsx](apps/frontend/src/pages/WorkflowBuilderPage.tsx)
- `Workflow Settings` is embedded in [apps/frontend/src/pages/SettingsPage.tsx](apps/frontend/src/pages/SettingsPage.tsx) via [apps/frontend/src/components/settings/WorkflowSettings.tsx](apps/frontend/src/components/settings/WorkflowSettings.tsx)

This is the main duplication/confusion point.

---

## 3. Target State

### 3.1 Sidebar Target

- Dashboard
- Daily Work
- Resource Management
- Business
- Intelligence
- My Settings
- Organization Admin

### 3.2 `My Settings` Target Scope
User-scoped only:

- Profile
- Notifications
- Display
- Security

### 3.3 `Organization Admin` Target Scope
Tenant-wide only:

- Onboarding
- Users
- Roles
- Functions
- Request Types
- Workflows
- Currency
- Integrations
- Organization
- Audit Logs
- Data Management

### 3.4 Workflow Target Scope
Workflow governance is consolidated under `Organization Admin > Workflows`.

That surface should ultimately include:
- workflow builder
- templates
- SLA rules
- escalation rules
- default workflow policies

`Request Types` remains separate but adjacent.

---

## 4. Implementation Principles

1. Separate by scope, not by generic label.
2. Preserve existing capabilities during transition.
3. Avoid unnecessary backend changes in the first IA pass.
4. Reuse existing components before splitting or rewriting them.
5. Keep workflow governance together even if initial implementation uses nested tabs/sections.

---

## 5. Recommended Delivery Phases

## Phase 1 — Navigation Relabeling and Scope Cleanup

### Goal
Make the information architecture understandable immediately with minimal behavior change.

### Changes
- Rename sidebar `Settings` to `My Settings`
- Rename sidebar `Administration` to `Organization Admin`
- Keep `/settings` route temporarily, but make it personal-only

### Files impacted
- [apps/frontend/src/components/layout/MainLayout.tsx](apps/frontend/src/components/layout/MainLayout.tsx)
- [apps/frontend/src/App.tsx](apps/frontend/src/App.tsx)
- [apps/frontend/src/pages/SettingsPage.tsx](apps/frontend/src/pages/SettingsPage.tsx)

### Output
- Users see clear distinction between personal and tenant-wide areas
- No tenant-admin tabs remain on the personal settings page

---

## Phase 2 — Move Tenant-Admin Tabs Out of Personal Settings

### Goal
Remove tenant-admin concerns from `SettingsPage`.

### Move out of `SettingsPage`
Current tenant-wide tabs from [apps/frontend/src/pages/SettingsPage.tsx](apps/frontend/src/pages/SettingsPage.tsx):

- Users
- Roles
- Functions
- Request Types
- Currency
- Integrations
- Organization
- Audit Logs
- Workflow Settings

### Temporary landing approach
Introduce an `Organization Admin` page shell that can host subsections while dedicated routes are being added.

### Candidate temporary route
- `/admin`

### Candidate subsections
- Users
- Roles
- Functions
- Request Types
- Workflows
- Currency
- Integrations
- Organization
- Audit Logs
- Data Management
- Onboarding

---

## Phase 3 — Consolidate Workflow Governance

### Goal
Eliminate split ownership of workflow-related configuration.

### Current split
- Workflow builder: [apps/frontend/src/pages/WorkflowBuilderPage.tsx](apps/frontend/src/pages/WorkflowBuilderPage.tsx)
- Workflow templates / SLA / escalation: [apps/frontend/src/components/settings/WorkflowSettings.tsx](apps/frontend/src/components/settings/WorkflowSettings.tsx)

### Target
Everything tenant-admin and workflow-related belongs under `/admin/workflows`.

### Recommended structure inside Workflows
- Builder
- Templates
- SLA
- Escalation
- Defaults

### Reuse recommendation
Reuse [apps/frontend/src/components/settings/WorkflowSettings.tsx](apps/frontend/src/components/settings/WorkflowSettings.tsx) initially as a subsection of the workflow area rather than maintaining it under personal settings.

---

## Phase 4 — Dedicated Admin Routes

### Goal
Replace oversized tabbed admin surfaces with clear tenant-admin routes.

### Target route model
- `/admin/onboarding`
- `/admin/users`
- `/admin/roles`
- `/admin/functions`
- `/admin/request-types`
- `/admin/workflows`
- `/admin/currency`
- `/admin/integrations`
- `/admin/organization`
- `/admin/audit`
- `/admin/data-management`

### Why
- better deep-linking
- better permission gating
- simpler page ownership
- lower `SettingsPage` complexity

---

## 6. Component Reuse Map

### Keep as personal settings content
From [apps/frontend/src/pages/SettingsPage.tsx](apps/frontend/src/pages/SettingsPage.tsx):
- Profile section
- Notifications section
- Display section
- Security section

### Reuse in admin routes or admin shell
- `FunctionsTab` from [apps/frontend/src/components/settings/index.ts](apps/frontend/src/components/settings/index.ts)
- `RequestTypesTab` from [apps/frontend/src/components/settings/index.ts](apps/frontend/src/components/settings/index.ts)
- `NotificationSettings` may remain personal depending on exact behavior split
- `IntegrationSettings` should move to admin
- `WorkflowSettings` should move to the workflow area

### Keep as standalone pages
- [apps/frontend/src/pages/WorkflowBuilderPage.tsx](apps/frontend/src/pages/WorkflowBuilderPage.tsx)
- [apps/frontend/src/pages/OnboardingPage.tsx](apps/frontend/src/pages/OnboardingPage.tsx)
- [apps/frontend/src/pages/ExportImportPage.tsx](apps/frontend/src/pages/ExportImportPage.tsx)

---

## 7. Page Ownership Recommendation

## 7.1 Personal Surface
Keep [apps/frontend/src/pages/SettingsPage.tsx](apps/frontend/src/pages/SettingsPage.tsx) but narrow it to personal settings only.

Recommended eventual rename:
- `MySettingsPage.tsx`

## 7.2 Admin Surface
Implemented under the dedicated admin page folder:

- `apps/frontend/src/pages/admin/AdminUsersPage.tsx`
- `apps/frontend/src/pages/admin/AdminRolesPage.tsx`
- `apps/frontend/src/pages/admin/AdminFunctionsPage.tsx`
- `apps/frontend/src/pages/admin/AdminRequestTypesPage.tsx`
- `apps/frontend/src/pages/admin/AdminCurrencyPage.tsx`
- `apps/frontend/src/pages/admin/AdminIntegrationsPage.tsx`
- `apps/frontend/src/pages/admin/AdminOrganizationPage.tsx`
- `apps/frontend/src/pages/admin/AdminAuditLogsPage.tsx`

Shared admin modal/types infrastructure now lives in:

- `apps/frontend/src/pages/admin/shared.tsx`

Route-specific standalone pages are now the active implementation, and the transitional wrapper-based admin page was removed.

---

## 8. Permissions Model Impact

No new permission model is required to implement the IA split.

The initial pass should continue using existing capability checks in:
- [apps/frontend/src/components/layout/MainLayout.tsx](apps/frontend/src/components/layout/MainLayout.tsx)
- `PERMISSIONS.SETTINGS_READ`
- `PERMISSIONS.SETTINGS_UPDATE`
- `PERMISSIONS.ROLES_READ`
- related admin permissions already used by the child components

However, route-level permission review is required when dedicated `/admin/*` routes are added.

---

## 9. Documentation / Naming Decisions

### Use these names
- `My Settings`
- `Organization Admin`

### Avoid these ambiguous names
- `Settings` for tenant-wide admin controls
- `Global` when meaning tenant-wide
- separate `Workflow Settings` destination outside the workflow area

---

## 10. Testing Strategy

### Navigation tests
- sidebar labels render correctly
- `My Settings` and `Organization Admin` visibility matches permissions
- old links redirect correctly if transitional redirects are used

### Scope tests
- `My Settings` contains only personal tabs
- no tenant-admin content appears in personal settings
- workflow-related content is no longer split between personal settings and workflow pages

### Route tests
- `/settings` renders personal-only content
- `/admin/*` routes enforce correct permissions
- `/workflows` or `/admin/workflows` still exposes full workflow capability

### Regression focus
- Request Types remains reachable
- Workflow templates/SLA/escalation remain reachable after relocation
- Onboarding, Data Management, and Audit continue to be accessible from tenant-admin navigation

---

## 11. Risks and Mitigations

### Risk 1: Too much route churn at once
Mitigation:
- do Phase 1 and Phase 2 first with component reuse

### Risk 2: Workflow capabilities become temporarily harder to find
Mitigation:
- keep `Request Types` and `Workflows` adjacent in admin nav from day one

### Risk 3: Personal notification settings may be mixed with tenant notification policy
Mitigation:
- explicitly separate user notification preferences from org-level integration/escalation settings

### Risk 4: Current monolithic settings page remains a maintenance hotspot
Mitigation:
- move to dedicated admin routes in Phase 4

---

## 12. Acceptance Criteria

The IA implementation is successful when:

1. Sidebar shows `My Settings` and `Organization Admin`
2. `My Settings` contains only user-scoped controls
3. Tenant-wide controls no longer live under personal settings
4. `Request Types` and `Workflows` are adjacent in tenant-admin navigation
5. Workflow templates / SLA / escalation no longer appear as a separate tenant-wide settings destination
6. The UI no longer requires explanation for whether a control is personal or tenant-wide

---

## 13. Implemented Outcome

The implemented frontend state now includes:

1. Sidebar labels updated to `My Settings` and `Organization Admin`
2. [apps/frontend/src/pages/SettingsPage.tsx](apps/frontend/src/pages/SettingsPage.tsx) reduced to personal-only content
3. Nested `/admin/*` routing via [apps/frontend/src/App.tsx](apps/frontend/src/App.tsx)
4. Dedicated Organization Admin shell via [apps/frontend/src/pages/OrganizationAdminLayout.tsx](apps/frontend/src/pages/OrganizationAdminLayout.tsx)
5. Direct admin destination pages for the remaining tenant-admin domains under [apps/frontend/src/pages/admin](apps/frontend/src/pages/admin)
6. Legacy top-level `/onboarding`, `/workflows`, and `/data-management` paths redirected to their `/admin/*` destinations

This completes the planned IA split without leaving Organization Admin dependent on `SettingsPage.tsx`.
