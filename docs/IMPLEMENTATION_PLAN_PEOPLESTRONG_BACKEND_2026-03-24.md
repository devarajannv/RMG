# Implementation Plan: PeopleStrong Backend Integration

Date: 2026-03-24
Status: Proposed
Scope: Backend-only execution plan for PeopleStrong inbound integration, sync processing, reconciliation, and exception handling

## 1. Objective

Implement PeopleStrong as the upstream employee-master source without disturbing RMG-owned delivery and commercial data.

Current scope decision:

- implement inbound PeopleStrong -> RMGaaS integration only
- do not implement outbound RMGaaS -> PeopleStrong triggers in this phase

This plan is intentionally grounded in what already exists in the codebase.

## 2. Current Reusable Backend Assets

The following backend assets already exist and should be reused rather than rebuilt:

1. Outbound webhook engine with persistence and retry in `webhooks`
2. Public inbound webhook pattern in `requests/inbound-webhook.routes.ts`
3. Persistent import-job framework in `ai-migration`
4. Audit logging in `audit`
5. Resource CRUD and onboarding people services in `onboarding/people.service.ts`
6. Resource exit cascade logic in `resource-exit-cascade.service.ts`

Practical implication:

- the PeopleStrong integration should be a new domain module, but it should borrow patterns from those existing modules

## 3. Recommended Module Structure

Recommended backend module family:

- `apps/api/src/modules/integrations/peoplestrong/peoplestrong.controller.ts`
- `apps/api/src/modules/integrations/peoplestrong/peoplestrong.service.ts`
- `apps/api/src/modules/integrations/peoplestrong/peoplestrong.sync.service.ts`
- `apps/api/src/modules/integrations/peoplestrong/peoplestrong.mapping.service.ts`
- `apps/api/src/modules/integrations/peoplestrong/peoplestrong.reconcile.service.ts`
- `apps/api/src/modules/integrations/peoplestrong/peoplestrong.schemas.ts`
- `apps/api/src/modules/integrations/peoplestrong/index.ts`

Optional later split:

- `peoplestrong.leave.service.ts`
- `peoplestrong.health.service.ts`

## 4. API Surface

This API plan covers PeopleStrong -> RMGaaS only.

## 4.1 Public Inbound Endpoints

Recommended public ingress:

- `POST /api/v1/integrations/peoplestrong/webhooks`

Optional expanded split if PeopleStrong sends distinct payload families:

- `POST /api/v1/integrations/peoplestrong/webhooks/employees`
- `POST /api/v1/integrations/peoplestrong/webhooks/lifecycle`
- `POST /api/v1/integrations/peoplestrong/webhooks/leave`

Recommendation:

- start with one canonical public endpoint unless PeopleStrong contract strongly requires multiple endpoints

Reason:

- one endpoint simplifies signature validation, idempotency, and operational monitoring

## 4.2 Authenticated Admin Endpoints

Required admin endpoints:

- `GET /api/v1/integrations/peoplestrong/config`
- `PUT /api/v1/integrations/peoplestrong/config`
- `GET /api/v1/integrations/peoplestrong/health`
- `GET /api/v1/integrations/peoplestrong/events`
- `GET /api/v1/integrations/peoplestrong/exceptions`
- `POST /api/v1/integrations/peoplestrong/reconcile`
- `POST /api/v1/integrations/peoplestrong/replay/:eventId`
- `GET /api/v1/integrations/peoplestrong/mappings`
- `PUT /api/v1/integrations/peoplestrong/mappings`

No outbound PeopleStrong publishing endpoints are included in this scope.

## 5. Data Model Additions

## 5.1 Integration Configuration

Add a persistent tenant-level PeopleStrong config model.

Suggested fields:

- `tenantId`
- `isEnabled`
- `mode` (`WEBHOOK`, `BATCH`, `HYBRID`)
- `apiBaseUrl`
- `clientId` or integration key if required
- `clientSecretEncrypted`
- `webhookSecretEncrypted`
- `tenantExternalKey`
- `lastWebhookAt`
- `lastDeltaSyncAt`
- `lastFullReconcileAt`
- `lastSuccessAt`
- `lastErrorAt`
- `lastErrorMessage`

## 5.2 Raw Event Log

Add a persistent inbound event log model.

Suggested fields:

- `tenantId`
- `source` = `PEOPLESTRONG`
- `externalEventId`
- `eventType`
- `receivedAt`
- `processedAt`
- `status`
- `payloadRaw`
- `payloadNormalized`
- `errorMessage`
- `attemptCount`
- `resourceId`

This is the missing equivalent of `WebhookLog` for inbound HR events.

## 5.3 Exception Queue

Add a People sync exception model.

Suggested fields:

- `tenantId`
- `eventLogId`
- `resourceId`
- `exceptionType`
- `severity`
- `status`
- `summary`
- `details`
- `resolutionNotes`
- `assignedToUserId`
- `resolvedAt`

## 5.4 Mapping Models

Add persistent integration mapping tables or a generic mapping model.

Required mapping categories:

- department code -> `Department.id`
- location code -> `Location.id`
- grade/band code -> `GradeBand.id`
- manager employee ID -> `Resource.id` resolution support

Optional categories:

- org unit -> `Practice.id`
- title family -> `BusinessRole.id`

## 5.5 Resource Source Metadata

Do not add a new PeopleStrong-specific field first unless necessary.

Recommendation:

- store initial source metadata in `Resource.customFields.integration.peoplestrong`

Example shape:

```json
{
  "integration": {
    "peoplestrong": {
      "source": true,
      "externalEmployeeId": "NVS01234",
      "lastSyncedAt": "2026-03-24T10:00:00Z",
      "lastEventId": "ps-evt-12345"
    }
  }
}
```

## 6. Processing Pipeline

## Phase 1: Ingress

1. Receive request on public PeopleStrong webhook endpoint
2. Resolve tenant using configured tenant external key or endpoint binding
3. Validate signature or shared secret
4. Reject duplicate `externalEventId`
5. Persist raw event log with `RECEIVED` state
6. Normalize payload into canonical internal schema

## Phase 2: Sync

1. Match resource by `tenantId + employeeId`
2. Fallback match by `tenantId + email` only when safe
3. Apply field ownership matrix
4. Resolve mappings for department, location, grade, manager
5. Update or create resource baseline fields
6. Write audit log

## Phase 3: Operational Safeguards

1. If event is termination or exit, inspect allocations, approvals, and leadership roles
2. If operational risk exists, create exception
3. If exit action is allowed, invoke or prepare `resource-exit-cascade.service.ts`
4. Never delete resource history or delivery data

## Phase 4: Completion

1. Mark event `PROCESSED` or `FAILED`
2. Store processing outcome and affected resource ID
3. Update PeopleStrong health stats on config record

## 7. Reconciliation Strategy

## 7.1 Delta Sync

Implement scheduled delta pull from PeopleStrong.

Target cadence:

- hourly or every few hours

Reuse strategy:

- reuse the PeopleStrong sync service for both webhook and pull processing
- do not fork business logic between webhook and batch flows

## 7.2 Full Reconciliation

Implement full reconcile job.

Target cadence:

- nightly

Behavior:

- fetch full PeopleStrong employee base
- compare HR-owned fields against RMG resources
- auto-correct safe drift
- raise exceptions for conflict or missing mapping
- publish summary report

## 7.3 Reuse of Existing AI Migration Infrastructure

The `ai-migration` module should not become the primary runtime PeopleStrong sync engine.

It should be reused for:

- fallback file-based PeopleStrong loads
- manual recovery when API/webhook delivery fails
- reconciliation import history and rollback behavior

It should not be reused for:

- normal event ingestion path
- direct webhook processing state machine

## 8. Security and Reliability Requirements

## 8.1 Required controls

- signature validation
- idempotency by `externalEventId`
- raw payload retention
- rate limiting on public endpoint
- replay-safe processing
- audit logging for applied changes

## 8.2 Public endpoint policy

Do not reuse the existing request-trigger inbound route for PeopleStrong runtime processing.

Reason:

- that route belongs to request automation and generic trigger matching
- PeopleStrong needs explicit employee-master semantics, persistence, and operational safeguards

You can reuse its public-endpoint pattern and middleware style, but not its domain behavior.

## 9. Operational-Impact Logic

## 9.1 Manager change

- update `managerId` when mapping is unambiguous
- create exception if manager cannot be resolved
- do not reassign project ownership automatically

## 9.2 Department or location change

- update home org fields
- do not rewrite operational team memberships automatically

## 9.3 Exit event

- write `dateOfExit`
- inspect active and future allocations
- inspect roles such as team lead, department head, project manager
- create exception if cleanup is needed
- optionally chain into exit cascade only when policy allows

## 10. Recommended Backend Delivery Phases

## Phase A: Persistence foundation

1. Add PeopleStrong config model
2. Add inbound event log model
3. Add sync exception model
4. Add mapping model(s)
5. Add migrations and seed-safe defaults

## Phase B: Inbound processing

1. Add PeopleStrong controller and route registration in `src/index.ts`
2. Add signature validation
3. Add canonical schema validation and normalization
4. Add idempotent event ingestion
5. Add resource upsert baseline flow

## Phase C: Operational safeguards

1. Add manager/location/department mapping resolution
2. Add exit-impact checks
3. Add exception generation
4. Integrate with audit logs
5. Integrate with exit cascade where approved

## Phase D: Reconciliation

1. Add delta sync runner
2. Add full reconcile runner
3. Add replay and retry support
4. Add summary health calculation

## Phase E: Admin support APIs

1. Config read/write endpoints
2. Event log listing endpoint
3. Exception queue endpoint
4. Reconcile trigger endpoint
5. Mapping maintenance endpoints

## 11. Testing Plan

Required test layers:

1. Schema validation tests for PeopleStrong payloads
2. Signature and idempotency tests
3. Resource upsert tests for new hire and update flows
4. Mapping-resolution tests
5. Exit-event operational-impact tests
6. Reconciliation drift tests
7. Controller integration tests for public ingress and admin endpoints

High-priority scenarios:

- duplicate event replay
- unmapped department code
- email change for active login user
- termination with active future allocations
- manager not yet synced in system

## 12. Success Criteria

This backend work is complete when:

- PeopleStrong events can be received and processed idempotently
- resources are created or updated using the field ownership contract
- exceptions are logged instead of causing destructive changes
- admins can inspect config, events, mappings, and failures via API
- webhook loss is recoverable through delta sync and reconciliation