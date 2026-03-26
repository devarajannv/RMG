# Task Breakdown: PeopleStrong Backend Schema and Endpoints

Date: 2026-03-24
Status: Proposed
Scope: Concrete backend execution checklist for schema, API, services, persistence, and testing

## 1. Goal

Turn the backend implementation plan into an execution-ready breakdown aligned with the current API bootstrap, Prisma schema, auth model, and reusable modules.

## 2. Existing Backend Starting Points

These existing modules should shape the implementation:

- `apps/api/src/index.ts`
- `apps/api/src/modules/ai-migration/ai-migration.controller.ts`
- `apps/api/src/modules/webhooks/webhook.controller.ts`
- `apps/api/src/modules/webhooks/webhook.service.ts`
- `apps/api/src/modules/requests/inbound-webhook.routes.ts`
- `apps/api/src/modules/audit/audit.service.ts`
- `apps/api/src/modules/resources/resource-exit-cascade.service.ts`
- `apps/api/src/modules/onboarding/people.service.ts`
- `apps/api/prisma/schema.prisma`

## 3. Workstream A: Prisma Schema Foundation

## A1. Add PeopleStrong integration configuration model

Purpose:

- store tenant-level PeopleStrong connection and sync status

Suggested model:

- `PeopleStrongIntegrationConfig`

Minimum fields:

- `id`
- `tenantId`
- `isEnabled`
- `syncMode`
- `tenantExternalKey`
- `apiBaseUrl`
- `clientId`
- `clientSecretEncrypted`
- `webhookSecretEncrypted`
- `lastWebhookAt`
- `lastDeltaSyncAt`
- `lastFullReconcileAt`
- `lastSuccessAt`
- `lastErrorAt`
- `lastErrorMessage`
- `createdAt`
- `updatedAt`

Acceptance criteria:

- one config per tenant
- secrets stored encrypted, not plaintext
- can represent disabled, partially configured, and healthy states

## A2. Add inbound event log model

Purpose:

- persist raw PeopleStrong events and processing outcomes

Suggested model:

- `PeopleStrongEventLog`

Minimum fields:

- `id`
- `tenantId`
- `configId`
- `externalEventId`
- `eventType`
- `status`
- `receivedAt`
- `processedAt`
- `payloadRaw`
- `payloadNormalized`
- `errorMessage`
- `attemptCount`
- `resourceId`

Acceptance criteria:

- duplicate event detection is possible via `externalEventId`
- each event has a durable status trail
- failed payloads remain inspectable

## A3. Add sync exception model

Purpose:

- represent operational or data-quality conflicts that require admin review

Suggested model:

- `PeopleStrongSyncException`

Minimum fields:

- `id`
- `tenantId`
- `eventLogId`
- `resourceId`
- `exceptionType`
- `severity`
- `status`
- `summary`
- `details`
- `assignedToUserId`
- `resolutionNotes`
- `resolvedAt`
- `createdAt`
- `updatedAt`

Acceptance criteria:

- exception queue can track open and resolved items
- exceptions can be linked back to event logs and resources

## A4. Add mapping persistence

Purpose:

- map PeopleStrong codes and identifiers to internal relational IDs

Recommended approach:

- use one generic `PeopleStrongMapping` model with category field, or separate mapping models if preferred by team style

Required categories:

- `DEPARTMENT`
- `LOCATION`
- `GRADE_BAND`

Optional categories:

- `PRACTICE`
- `BUSINESS_ROLE`

Minimum fields:

- `id`
- `tenantId`
- `mappingType`
- `externalCode`
- `externalName`
- `internalEntityId`
- `isActive`
- `createdAt`
- `updatedAt`

Acceptance criteria:

- missing mappings are detectable
- admins can update mappings without data surgery

## A5. Decide source metadata approach on `Resource`

Decision:

- do not add first-class columns yet
- use `Resource.customFields.integration.peoplestrong` initially

Acceptance criteria:

- resource can carry sync metadata without schema churn for every PeopleStrong-specific field

## 4. Workstream B: Route Registration and Module Wiring

## B1. Add new route family to API bootstrap

Target entry in `apps/api/src/index.ts`:

- `app.use('/api/v1/integrations/peoplestrong', peoplestrongRoutes);`

Acceptance criteria:

- route family is separate from existing outbound `/api/v1/webhooks`
- route family is separate from request-trigger inbound `/api/v1/webhooks/inbound`

## B2. Add module export surface

Target files:

- `apps/api/src/modules/integrations/peoplestrong/index.ts`
- any parent `index.ts` as needed

Acceptance criteria:

- route and service imports remain consistent with current module style

## 5. Workstream C: Public Inbound Endpoint

## C1. Add canonical public webhook endpoint

Initial endpoint:

- `POST /api/v1/integrations/peoplestrong/webhooks`

Request requirements:

- no user auth
- signature validation
- tenant resolution
- rate limiting
- idempotency check

Reused patterns:

- public-endpoint shape from `requests/inbound-webhook.routes.ts`
- rate-limiter approach already used for inbound webhooks

Acceptance criteria:

- valid PeopleStrong event is accepted and persisted
- invalid signature is rejected
- duplicate event ID is ignored or safely short-circuited

## C2. Define payload validation schema

Target file:

- `peoplestrong.schemas.ts`

Should define:

- raw inbound payload schema
- normalized canonical event schema
- event-type mapping helpers

Acceptance criteria:

- unsupported payload shapes fail early
- downstream services consume one normalized shape only

## 6. Workstream D: Admin Endpoints

## D1. Config endpoints

Endpoints:

- `GET /config`
- `PUT /config`

Suggested permissions:

- `settings:read`
- `settings:update`

Acceptance criteria:

- tenant admin can read and update config
- secrets are write-only in responses where appropriate

## D2. Health endpoint

Endpoint:

- `GET /health`

Should return:

- enabled status
- sync mode
- last webhook
- last delta sync
- last reconcile
- last success
- current error
- open exception count

## D3. Event log endpoints

Endpoints:

- `GET /events`
- `GET /events/:eventId`
- `POST /replay/:eventId`

Acceptance criteria:

- admins can inspect and replay failed events

## D4. Exception endpoints

Endpoints:

- `GET /exceptions`
- `PATCH /exceptions/:id`

Possible actions:

- assign
- mark resolved
- add resolution note

## D5. Mapping endpoints

Endpoints:

- `GET /mappings`
- `PUT /mappings`

Acceptance criteria:

- mappings can be listed and updated without direct database edits

## D6. Reconciliation endpoints

Endpoints:

- `POST /reconcile`
- optionally `GET /reconcile/:runId`

Acceptance criteria:

- admin-triggered reconcile can be run on demand
- result summary is queryable

## 7. Workstream E: Service Layer

## E1. Config service

Responsibilities:

- save config
- load config
- redact secrets in read responses
- compute health summary

## E2. Event ingestion service

Responsibilities:

- validate signature
- resolve tenant
- persist raw payload
- normalize event
- enforce idempotency

## E3. Mapping service

Responsibilities:

- resolve department, location, grade, and manager mappings
- return structured unresolved-mapping errors

## E4. Sync service

Responsibilities:

- create or update resource baseline fields
- apply source-of-truth matrix
- write audit logs
- update resource source metadata

## E5. Exception service

Responsibilities:

- create sync exceptions
- classify severity
- support assignment and resolution

## E6. Reconciliation service

Responsibilities:

- delta pull processing
- full reconcile processing
- drift detection
- reuse sync service rather than duplicating rules

## 8. Workstream F: Lifecycle Behavior

## F1. New hire flow

Task:

- create resource with PeopleStrong-owned baseline fields only

Acceptance criteria:

- no operational assignments are auto-created

## F2. Update flow

Task:

- update HR-owned fields only

Acceptance criteria:

- RMG-owned operational fields remain untouched

## F3. Manager, location, department changes

Task:

- update resolved baseline fields
- create exceptions when mappings are missing or operational review is needed

## F4. Exit flow

Task:

- inspect active allocations, leadership responsibilities, and approvals
- create exception or invoke exit cascade per policy

Acceptance criteria:

- no destructive deletion
- future work impact is visible and auditable

## 9. Workstream G: Scheduling and Jobs

## G1. Delta sync runner

Task:

- add scheduled or callable delta sync job

Recommended implementation style:

- follow current codebase precedent for scheduled jobs and avoid introducing a heavy queueing framework unless needed immediately

## G2. Full reconcile runner

Task:

- add nightly full reconciliation process

## G3. Replay and retry support

Task:

- support manual replay of failed PeopleStrong events

## 10. Workstream H: Auth and Permissions

Current observation:

- backend already uses fine-grained permission checks via `authorize(...)`

Recommended permission usage:

- config and health read: `settings:read`
- config update and reconcile actions: `settings:update`
- event log read: `settings:read`
- exception management: `settings:update`

Optional future enhancement:

- dedicated integration permissions if the team wants tighter control later

## 11. Workstream I: Tests

## I1. Prisma/service tests

Required scenarios:

- config CRUD
- duplicate `externalEventId`
- unmapped department code
- resource create from new hire
- email change conflict
- termination with active future allocation

## I2. Controller tests

Required scenarios:

- invalid signature rejected
- valid event accepted
- replay endpoint behavior
- config endpoints authorization

## I3. Reconcile tests

Required scenarios:

- safe drift correction
- exception creation on ambiguous mapping

## 12. Delivery Sequence

Recommended order:

1. Prisma models and migrations
2. config plus event-log endpoints
3. public ingress and normalization
4. sync service and resource upsert
5. exception handling
6. reconciliation endpoints and jobs
7. test coverage hardening

## 13. Definition of Done

This backend workstream is complete when:

- tenant admins can configure PeopleStrong
- inbound PeopleStrong events are processed idempotently
- resources sync using the field ownership matrix
- exceptions capture operational conflicts instead of silent destructive behavior
- reconcile and replay flows are available via API
- test coverage exists for the critical lifecycle scenarios