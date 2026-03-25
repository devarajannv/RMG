# Implementation Plan: PeopleStrong Frontend and Admin UX

Date: 2026-03-24
Status: Proposed
Scope: Tenant-app admin UX for PeopleStrong integration, sync visibility, mapping, exceptions, and people data ownership

## 1. Objective

Expose PeopleStrong integration as an operationally usable admin experience inside the tenant app.

Current scope decision:

- the UX is for inbound PeopleStrong -> RMGaaS sync only
- do not add outbound-publish management UX for PeopleStrong in this phase

The UX must let admins do five things clearly:

1. connect and monitor PeopleStrong
2. understand which People fields are HR-owned
3. see sync failures and exceptions
4. run reconciliation and recovery actions
5. distinguish PeopleStrong base data from RMG-owned operational data

## 2. Current Reusable Frontend Assets

The current frontend already provides starting points:

1. `AdminIntegrationsPage.tsx` route exists, but is stubbed with `sessionStorage`
2. `ExportImportPage.tsx` already contains Data Management tabs, import history, and AI migration flow
3. `OrganizationAdminLayout.tsx` already provides the admin-shell navigation model
4. `PeoplePhase.tsx` already contains durable people-editing patterns that can be reused later in the IA migration

Implication:

- do not invent a separate integration app
- build this inside Organization Admin and Data Management

## 3. Recommended UX Placement

Use the tenant-admin IA already defined.

Primary homes:

- `Organization Admin > Integrations`
- `Organization Admin > People`
- `Organization Admin > Overview`
- `Organization Admin > Data Management`

## 4. Screen Responsibilities

## 4.1 Integrations Screen

Route:

- `/admin/integrations`

This becomes the control center for PeopleStrong connectivity.

Required sections:

1. Connection
2. Sync Health
3. Webhook Settings
4. Sync Mode
5. Recent Activity

### Connection Section

Should display:

- provider: PeopleStrong
- enabled or disabled status
- auth mode
- tenant external key
- API base URL
- last successful auth check

Admin actions:

- connect or update credentials
- disable integration
- run connection test

### Sync Health Section

Should display:

- current mode: webhook, batch, or hybrid
- last webhook received
- last delta sync
- last full reconciliation
- last successful sync
- current error state
- open exception count

### Webhook Settings Section

Should display:

- webhook endpoint URL
- shared secret status
- delivery instructions for PeopleStrong team
- replay-safe note or event ID expectations

### Recent Activity Section

Should display:

- recent inbound events
- recent failures
- recent recoveries
- quick link to full event log in Data Management

## 4.2 Overview Screen

Route:

- `/admin/overview`

This screen should not become the full integration workspace.

It should provide summary only:

- PeopleStrong connection health card
- people sync freshness card
- unresolved PeopleStrong exception count
- last reconcile result summary
- CTA links to Integrations, People, and Data Management

## 4.3 People Screen

Route:

- `/admin/people`

This is where admins understand the effect of PeopleStrong on individual resources.

Required UX capabilities:

1. source visibility
2. field ownership visibility
3. sync exception visibility
4. manual enrichment support

### Resource List UX

Each row should support:

- source badge such as `PeopleStrong`, `Manual`, or `Imported`
- sync state badge such as `Healthy`, `Pending Review`, `Sync Error`
- last synced timestamp

### Resource Detail or Drawer UX

For each person, show:

- HR-owned fields section
- RMG-owned fields section
- integration metadata section
- sync history section

Field behavior:

- HR-owned fields should appear read-only or clearly locked when PeopleStrong is active
- RMG-owned fields should remain editable
- shared-with-review fields should show warning/help text

### Manual Override UX

Avoid broad edit permissions over HR-owned fields.

Recommended behavior:

- admins can request or force local override only where policy allows
- overridden values should be explicitly marked and auditable

## 4.4 Data Management Screen

Route:

- `/admin/data-management`

This becomes the operational recovery and reconciliation workspace.

Required sections:

1. Sync Event Log
2. Exception Queue
3. Reconciliation Actions
4. Mapping Tools
5. Fallback Import

### Sync Event Log

Should show:

- event ID
- event type
- received at
- processed at
- outcome
- linked resource
- failure reason

Admin actions:

- filter by outcome or date
- inspect payload summary
- replay failed event where safe

### Exception Queue

Should show:

- exception type
- severity
- affected employee
- summary
- owner
- status

Admin actions:

- assign
- resolve
- dismiss where appropriate
- navigate to person record

### Reconciliation Actions

Should support:

- run delta sync
- run full reconcile
- view last reconcile report
- export reconcile report

### Mapping Tools

Should support:

- department code mapping
- location code mapping
- grade/band mapping
- manager resolution issues

### Fallback Import

Reuse the existing AI migration or import tooling for:

- manual PeopleStrong file loads
- one-off recovery imports
- rollback-enabled admin-led syncs

## 5. Current-to-Target Frontend Mapping

## 5.1 Existing `AdminIntegrationsPage.tsx`

Current state:

- UI-only stub
- stores state in `sessionStorage`

Target change:

- replace with API-backed integration management page
- keep the route, replace the data model and actions

## 5.2 Existing `ExportImportPage.tsx`

Current state:

- already supports export, import, AI migration, and outbound webhooks tab

Target change:

- add PeopleStrong-specific admin operations here rather than creating a disconnected recovery UI
- keep AI migration for fallback sync and recovery, not primary runtime sync

## 5.3 Existing `OrganizationAdminLayout.tsx`

Current state:

- includes Integrations and Data Management already

Target change:

- preserve route placement
- later extend navigation when the broader IA migration is implemented

## 6. UX Delivery Phases

## Phase A: Integrations foundation

1. Replace `sessionStorage` integration state with backend-backed queries
2. Add PeopleStrong config form
3. Add connection test and health summary
4. Add last sync timestamps and error banner

## Phase B: Visibility in People

1. Add source badges in people/resource listings
2. Add field ownership presentation in person detail/edit UI
3. Add sync-status indicators and last-sync metadata
4. Add exception banners on affected people

## Phase C: Data Management operations

1. Add PeopleStrong event log tab or section
2. Add exception queue section
3. Add reconcile actions
4. Add mapping maintenance UI
5. Link to AI migration fallback workflows

## Phase D: Overview summaries

1. Add PeopleStrong status card
2. Add unresolved exception summary
3. Add stale sync warning
4. Add quick actions for admins

## 7. Key UX Rules

## 7.1 Do not blur ownership

Users must be able to tell:

- what comes from PeopleStrong
- what is managed in RMG
- what needs review before taking effect

## 7.2 Do not hide failures

If sync fails, show it in:

- Integrations
- Overview
- the affected person record

## 7.3 Do not put runtime sync operations only inside onboarding

PeopleStrong is an ongoing operating integration, not a one-time setup wizard.

## 7.4 Keep fallback import clearly secondary

The primary runtime story should be webhook plus reconciliation.

AI Migration and manual import should appear as:

- fallback recovery
- one-time bootstrap
- exceptional admin intervention

## 8. Component Strategy

Recommended component grouping:

- `features/integrations/peoplestrong/PeopleStrongConnectionCard`
- `features/integrations/peoplestrong/PeopleStrongHealthPanel`
- `features/integrations/peoplestrong/PeopleStrongEventTable`
- `features/integrations/peoplestrong/PeopleStrongExceptionTable`
- `features/integrations/peoplestrong/PeopleStrongMappingPanel`
- `features/people/SourceBadge`
- `features/people/FieldOwnershipBadge`
- `features/people/SyncStatusBanner`

This keeps the frontend aligned with the broader IA migration instead of burying everything inside page-local code.

## 9. API Dependencies

The frontend plan depends on backend delivery of:

- config read and write endpoints
- health endpoint
- event log endpoint
- exception queue endpoint
- reconcile action endpoint
- mapping endpoints
- enriched people payload with source metadata

## 10. Testing Plan

Required test coverage:

1. Integrations screen loads backend state
2. connection test and error states render correctly
3. People list displays source and sync badges
4. People detail locks HR-owned fields correctly
5. Data Management event log filtering works
6. exception queue interactions work
7. reconcile actions surface success and failure correctly

High-priority UX scenarios:

- PeopleStrong disconnected
- stale sync warning
- employee record with unresolved exception
- replaying failed event
- unmapped department code needing admin action

## 11. Success Criteria

This UX work is complete when:

- admins can configure and monitor PeopleStrong without leaving the tenant app
- admins can see which fields are HR-owned versus RMG-owned
- sync failures and exceptions are visible and actionable
- reconciliation and replay actions are available from Data Management
- the People screen reflects source-of-truth boundaries clearly enough that admins do not need tribal knowledge to operate the integration