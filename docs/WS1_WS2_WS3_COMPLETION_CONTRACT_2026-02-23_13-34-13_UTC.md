# WS-1 / WS-2 / WS-3 Completion Contract

Date: 2026-02-23
Timestamp (UTC): 2026-02-23 13:34:13 UTC

## Scope Completed

### WS-1 Tenant Taxonomy (Item 1)
- Tenant-configurable billing taxonomy policy contract implemented.
- Policy stored in `Tenant.settings.billingTaxonomy` and versioned on update.
- Admin controls exposed:
  - `GET /api/v1/organization/billing-taxonomy`
  - `PATCH /api/v1/organization/billing-taxonomy`
- Request lifecycle enforcement implemented at create/submit paths.

### WS-2 Billability Domain Model (Item 2)
- Explicit billability domain representation implemented:
  - `eligibility`
  - `intent`
  - `outcome`
- Partial attribution enabled through `billableRatio` (0..1).
- Timesheet create/update/weekly-save flows persist domain snapshot in `TimesheetEntry.customFields.billabilityDomain`.
- Weekly/statistics aggregations refactored to ratio-based billable-hour calculations.

### WS-3 As-Was Historical Semantics (Item 3)
- Immutable decision context snapshots persisted into request history details for submit/approve/reject actions.
- Request history API now publishes explicit mode metadata with default `as-was` semantics.
- Timesheet submit audit metadata includes billability replay context.

## Implementation Artifacts
- `apps/api/src/config/billing-taxonomy.ts`
- `apps/api/src/config/billability-domain.ts`
- `apps/api/src/modules/organization/organization.service.ts`
- `apps/api/src/modules/organization/organization.controller.ts`
- `apps/api/src/modules/organization/organization.routes.ts`
- `apps/api/src/modules/requests/request.service.ts`
- `apps/api/src/modules/requests/request.controller.ts`
- `apps/api/src/modules/timesheets/timesheet.controller.ts`
- `apps/api/src/modules/timesheets/timesheet.service.ts`
- `apps/frontend/src/pages/SettingsPage.tsx`
- `apps/api/src/modules/organization/organization.service.comprehensive.test.ts`

## Validation Evidence
- API type-check: `npx tsc --noEmit` (PASS)
- Targeted tests:
  - `npx vitest run src/modules/organization/organization.service.comprehensive.test.ts src/modules/requests/workflow-integration.test.ts src/modules/timesheets/timesheet.service.comprehensive.test.ts` (PASS, 71/71)
- Frontend type-check: `npx tsc --noEmit` (PASS)

## Notes
- Changes preserve Writer + Scribe architecture: all capabilities remain fully operable without AI.
- WS-8 invoice-linkage foundation remains deferred as per prior plan status.
