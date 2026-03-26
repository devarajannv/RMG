# Checklist: PeopleStrong Frontend Routes and Components

Date: 2026-03-24
Status: Proposed
Scope: Route-by-route implementation checklist tied to current frontend files and planned target IA

## 1. Goal

Translate the frontend UX plan into a concrete checklist aligned with the routes and components that already exist in the tenant app.

## 2. Current Relevant Frontend Files

- `apps/frontend/src/App.tsx`
- `apps/frontend/src/pages/OrganizationAdminLayout.tsx`
- `apps/frontend/src/pages/admin/AdminIntegrationsPage.tsx`
- `apps/frontend/src/pages/ExportImportPage.tsx`
- `apps/frontend/src/features/onboarding/components/PeoplePhase.tsx`
- `apps/frontend/src/hooks/usePermissions.ts`

## 3. Route Inventory: Current vs Target

Current admin routes relevant to PeopleStrong:

- `/admin/integrations`
- `/admin/data-management`
- `/admin/onboarding`
- `/admin/organization`

Planned target routes from the IA work:

- `/admin/overview`
- `/admin/people`
- `/admin/integrations`
- `/admin/data-management`

Practical implication:

- some PeopleStrong UX can ship immediately on existing routes
- people-specific ownership UX is cleaner once the durable `/admin/people` route exists

## 4. Route-by-Route Checklist

## 4.1 `/admin/integrations`

Current file:

- `apps/frontend/src/pages/admin/AdminIntegrationsPage.tsx`

Current state:

- uses `sessionStorage`
- no backend API integration
- models generic integrations and outbound webhooks only

Implementation checklist:

- replace `sessionStorage` data with API-backed query and mutation hooks
- add PeopleStrong connection card
- add PeopleStrong sync-health card
- add PeopleStrong webhook endpoint display
- add last webhook, last delta sync, last reconcile timestamps
- add current error and open exception summary
- add connection test action
- add enable or disable toggle
- keep generic outbound webhook area separate from PeopleStrong inbound integration settings

Dependencies:

- backend config endpoint
- backend health endpoint
- backend exception summary

Definition of done:

- page reflects real backend state instead of mock session data

## 4.2 `/admin/data-management`

Current file:

- `apps/frontend/src/pages/ExportImportPage.tsx`

Current state:

- contains export, import, AI migration, and webhooks tabs
- already has import history and rollback-oriented UX

Implementation checklist:

- add PeopleStrong event-log section or tab
- add PeopleStrong exception queue section or tab
- add reconcile actions: delta sync and full reconcile
- add replay failed event action
- add mapping-maintenance section
- keep AI migration available as fallback import and recovery path
- avoid presenting AI migration as the primary PeopleStrong runtime sync mechanism

Dependencies:

- backend event-log endpoint
- backend exception endpoint
- backend replay endpoint
- backend reconcile endpoint
- backend mappings endpoint

Definition of done:

- admin can operate recovery and reconciliation from Data Management without manual database work

## 4.3 `/admin/organization`

Current file:

- `apps/frontend/src/pages/admin/AdminOrganizationPage.tsx`

Current state:

- organization summary and billing taxonomy

Implementation checklist:

- in the interim, add lightweight PeopleStrong summary card only if `/admin/overview` is not yet implemented
- do not overload this page into the primary integration workspace

Definition of done:

- page can show top-level sync status if Overview does not yet exist, but PeopleStrong operations still live under Integrations and Data Management

## 4.4 `/admin/onboarding`

Current file:

- `apps/frontend/src/pages/OnboardingPage.tsx`

Relevant reusable component:

- `apps/frontend/src/features/onboarding/components/PeoplePhase.tsx`

Current state:

- rich people-management UI exists inside onboarding

Implementation checklist:

- do not place PeopleStrong runtime sync controls only in onboarding
- reuse `PeoplePhase` interaction patterns later for durable `/admin/people`
- optionally show source badges or sync warnings in onboarding People views only if needed during transition

Definition of done:

- onboarding remains bootstrap-oriented and is not the permanent home of PeopleStrong operations

## 4.5 `/admin/people` target route

Current status:

- not implemented yet as a durable admin route

Primary reusable source:

- `apps/frontend/src/features/onboarding/components/PeoplePhase.tsx`

Implementation checklist:

- create durable People admin page using PeoplePhase patterns
- add source badge per person: `PeopleStrong`, `Manual`, `Imported`
- add sync status badge: `Healthy`, `Pending Review`, `Sync Error`
- add last synced timestamp
- group fields by ownership: HR-owned, RMG-owned, shared-with-review
- make HR-owned fields read-only or clearly locked
- surface exception banner when person has unresolved PeopleStrong issues
- expose integration metadata section in detail drawer or page

Dependencies:

- enriched resource payload with source metadata
- exception summary per resource
- field ownership metadata or frontend contract

Definition of done:

- admins can understand and operate PeopleStrong effects at the person level

## 4.6 `/admin/overview` target route

Current status:

- not implemented yet as a dedicated admin landing page

Implementation checklist:

- add PeopleStrong connection-health summary card
- add people-sync freshness summary card
- add unresolved exception count card
- add quick links to Integrations, People, and Data Management

Dependencies:

- backend health summary endpoint

Definition of done:

- tenant admin can see sync health without drilling into the integration workspace

## 5. Component-Level Checklist

## 5.1 Replace page-local integration state

Target file:

- `apps/frontend/src/pages/admin/AdminIntegrationsPage.tsx`

Tasks:

- remove `sessionStorage` persistence
- add TanStack Query hooks for config and health
- add loading, empty, success, and error states

## 5.2 Extend Data Management

Target file:

- `apps/frontend/src/pages/ExportImportPage.tsx`

Tasks:

- add new PeopleStrong-specific tabs or panels
- wire API-backed event and exception data
- preserve existing AI migration workflow for fallback import

## 5.3 Introduce shared PeopleStrong UI components

Recommended new component family:

- `features/integrations/peoplestrong/PeopleStrongConnectionCard`
- `features/integrations/peoplestrong/PeopleStrongHealthPanel`
- `features/integrations/peoplestrong/PeopleStrongEventTable`
- `features/integrations/peoplestrong/PeopleStrongExceptionTable`
- `features/integrations/peoplestrong/PeopleStrongMappingPanel`
- `features/people/SourceBadge`
- `features/people/FieldOwnershipBadge`
- `features/people/SyncStatusBanner`

## 6. Route Wiring Checklist

## 6.1 Existing routes that can ship immediately

- `/admin/integrations`
- `/admin/data-management`

## 6.2 Routes that likely require broader IA migration first

- `/admin/overview`
- `/admin/people`

## 6.3 Route changes likely needed in `App.tsx`

Tasks:

- add `/admin/overview` route when Overview page is created
- add `/admin/people` route when durable People page is created
- change `/admin` index redirect from `/admin/onboarding` to mode-aware target later

Current observation:

- `App.tsx` still redirects `/admin` to `/admin/onboarding`

## 7. Permissions Checklist

Current observation:

- frontend `usePermissions.ts` exposes many permissions but does not currently define import-specific constants even though backend `ai-migration` routes use `import:read` and `import:write`

Implication:

- frontend permission constants likely need to be extended before gating new Data Management and PeopleStrong actions correctly

Checklist:

- add frontend constants for `import:read` and `import:write` if not already exposed elsewhere
- decide whether PeopleStrong actions use existing `settings:*` permissions or dedicated integration permissions
- apply route and action gating consistently on Integrations and Data Management screens

## 8. Delivery Order

Recommended order:

1. Upgrade `/admin/integrations` from stub to API-backed screen
2. Upgrade `/admin/data-management` with PeopleStrong operational tabs
3. add permission coverage for import and integration actions
4. add `/admin/overview` summary card once backend health API exists
5. add durable `/admin/people` route using PeoplePhase patterns
6. move person-level ownership and sync-status UX into durable People admin

## 9. Testing Checklist

Required scenarios:

- Integrations screen shows connection and health states
- Data Management shows event log and exception queue
- replay and reconcile actions show success and failure states
- source badges render correctly on synced people
- HR-owned fields render locked
- unresolved exception banners appear on affected people
- permission gating hides actions when user lacks access

## 10. Definition of Done

This frontend workstream is complete when:

- `/admin/integrations` is API-backed and operational
- `/admin/data-management` supports PeopleStrong recovery and reconciliation
- target `/admin/people` exposes source-of-truth ownership at the person level
- target `/admin/overview` surfaces sync health clearly
- route and permission wiring aligns with the actual backend APIs and the target tenant-admin IA