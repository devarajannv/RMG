# PeopleStrong Integration Design

Date: 2026-03-24
Status: Proposal
Scope: Inbound PeopleStrong integration for employee master data, lifecycle events, reconciliation, and exception handling

## 1. Intent

PeopleStrong will be the source of truth for employee master data.

Current implementation decision:

- Phase 1 is unidirectional only: PeopleStrong -> RMGaaS
- no outbound RMGaaS -> PeopleStrong trigger flow is included in this scope

RMGaaS will remain the source of truth for:

- staffing and allocations
- projects and customers
- contracts and commercial structures
- skills inventory
- timesheets
- invoicing and downstream financial operations

This integration must preserve that boundary.

## 2. Integration Principle

Do not sync whole records blindly.

Instead:

- ingest PeopleStrong employee events
- map them to RMG resources
- update only PeopleStrong-owned fields
- generate governed follow-up work when an HR event has delivery impact

## 3. Architecture Pattern

Recommended production pattern:

1. Inbound webhook receiver for near-real-time lifecycle events
2. Scheduled delta sync for reliability and missed events
3. Periodic full reconciliation for drift detection
4. Exception queue for conflicts and operational-impact changes

This is a hybrid model, not webhook-only.

It is also intentionally unidirectional for the current phase.

## 4. Where Webhooks Fit

In the current codebase, the existing webhook module is outbound-only and pushes RMG events to external systems.

For PeopleStrong, a separate inbound integration path should be added.

Recommended split:

- existing `/api/v1/webhooks/*` stays outbound for RMG -> external systems
- new PeopleStrong receiver endpoints handle inbound HR events

For PeopleStrong, only the inbound direction is part of the current implementation scope.

Do not overload the current outbound webhook module to mean inbound HR processing.

## 5. Target Integration Components

## 5.1 Inbound Receiver

Purpose:

- receive PeopleStrong webhook payloads
- authenticate source
- normalize payloads
- store raw event log
- enqueue sync processing

Recommended logical endpoint family:

- `POST /api/v1/integrations/peoplestrong/webhooks/employees`
- `POST /api/v1/integrations/peoplestrong/webhooks/lifecycle`
- `POST /api/v1/integrations/peoplestrong/webhooks/leave`

One combined endpoint is also acceptable if PeopleStrong sends mixed event types.

## 5.2 Sync Service

Purpose:

- apply normalized PeopleStrong payloads to RMG models
- enforce field ownership matrix
- upsert resources and reference mappings
- generate exceptions where needed

## 5.3 Reconciliation Job

Purpose:

- fetch delta or full employee master from PeopleStrong API or file feed
- catch missed webhook events
- detect drift between PeopleStrong and RMG base fields

Recommended cadence:

- delta sync hourly or every few hours
- full reconcile nightly

## 5.4 Exception Queue

Purpose:

- capture changes that should not be applied silently
- route operational-impact cases to RM, PMO, or tenant admin

Examples:

- exit with future allocations
- email change for an active login user
- department transfer conflicting with operational team ownership
- unmapped HR location or department

## 5.5 Admin Surfaces

Required UI surfaces under Organization Admin:

- Integrations: connection config, webhook secret, last sync, health
- People: synced resources, source badges, per-field ownership visibility
- Data Management: full reconcile, re-run, import fallback, mapping tools
- Overview: sync summary and unresolved exception count

## 6. End-to-End Data Flow

## 6.1 Real-Time Event Flow

1. PeopleStrong emits event
2. RMG inbound receiver validates signature, tenant mapping, and schema
3. Raw payload is persisted in an integration event log
4. Event is normalized into canonical internal shape
5. Sync service resolves resource by `employeeId`
6. Allowed fields are upserted
7. If operational risk exists, an exception record is created
8. Processing result is logged and visible in admin

## 6.2 Batch Reconciliation Flow

1. Scheduler requests PeopleStrong delta or file extract
2. Records are normalized
3. Upsert logic reuses the same sync service as webhooks
4. Drift report is generated
5. Exceptions are created for unresolved mappings or conflicts

## 6.3 Public Documentation Constraint

Based on the public PeopleStrong API documentation available at `api-docs.peoplestrong.com`:

- PeopleStrong publicly documents webhook support only at the level of row-wise and column-wise incremental outbound APIs
- the public docs do not publish a named webhook event catalog such as `employee.created` or `employee.updated`
- the public docs do expose integration domains including `HRIS`, `Leave`, `Transfer`, `Promotion`, `Confirmation`, and `Exit`
- the public docs describe webhook delivery generically as data-change notification on an hourly cadence

Implementation consequence:

- RMGaaS should not depend on vendor event names being present in the payload contract
- RMGaaS should accept PeopleStrong payloads as source-domain change notifications and map them into internal canonical event types
- any tenant-specific PeopleStrong configuration that exposes additional event labels can be captured later as source metadata, not as the primary contract boundary

## 7. Canonical Event Types

Recommended internal event vocabulary.

These are RMGaaS internal canonical events, not a claim that PeopleStrong publishes these exact event names.

- `employee.created`
- `employee.updated`
- `employee.manager_changed`
- `employee.department_changed`
- `employee.location_changed`
- `employee.designation_changed`
- `employee.status_changed`
- `employee.terminated`
- `employee.rehired`
- `employee.leave.started`
- `employee.leave.updated`
- `employee.leave.ended`

PeopleStrong-specific payload fields, integration master names, modules, or tenant-side labels can be mapped into these internal events.

For the current public-doc evidence, the safer primary mappings are:

- `HRIS` -> `employee.created` or `employee.updated` after upsert evaluation
- `Transfer` -> `employee.department_changed`, `employee.location_changed`, or `employee.manager_changed`
- `Promotion` -> `employee.designation_changed` or `employee.status_changed`
- `Confirmation` -> `employee.status_changed`
- `Exit` -> `employee.terminated`
- `Leave` -> `employee.leave.started`, `employee.leave.updated`, or `employee.leave.ended`

## 8. Canonical Employee Payload

Recommended normalized shape:

```json
{
  "tenantExternalKey": "newvision",
  "source": "PeopleStrong",
  "eventType": "employee.updated",
  "eventId": "ps-evt-12345",
  "occurredAt": "2026-03-24T08:30:00Z",
  "employee": {
    "employeeId": "NVS01234",
    "firstName": "Asha",
    "lastName": "Patil",
    "preferredName": "Asha",
    "email": "asha.patil@newvision-software.com",
    "phone": "+91-98xxxx",
    "employmentType": "FTE",
    "designation": "Senior Engineer",
    "band": "E3",
    "dateOfJoining": "2024-06-12",
    "dateOfExit": null,
    "status": "ACTIVE",
    "managerEmployeeId": "NVS00091",
    "departmentCode": "DA",
    "departmentName": "Digital Assurance",
    "locationCode": "PUNE",
    "locationName": "Pune"
  },
  "metadata": {
    "correlationId": "...",
    "deliveryAttempt": 1
  }
}
```

## 9. Mapping Layer

The integration must include explicit mapping tables or mapping configuration.

Required mappings:

- tenant external key -> `Tenant.id`
- department code -> `Department.id`
- location code -> `Location.id`
- manager employee ID -> `Resource.id`
- grade/band code -> `GradeBand.id`

Optional mappings:

- HR org unit -> `Practice.id`
- HR title family -> `BusinessRole.id`

If a mapping is missing:

- do not guess silently
- log exception
- optionally route to admin for mapping approval

## 10. Processing Rules by Scenario

## 10.1 New Hire

System action:

- create `Resource`
- set HR-owned baseline fields
- link manager if available
- map department and location
- mark source metadata in `customFields`

Optional follow-up:

- create access-provisioning task
- suggest onboarding actions for RM or tenant admin

## 10.2 Update Existing Employee

System action:

- update only fields owned by PeopleStrong
- write integration audit entry
- preserve delivery-owned fields unchanged

## 10.3 Transfer

System action:

- update home department, manager, and location if present
- create exception if operational team assignments may need review

## 10.4 Termination or Exit

System action:

- set exit date
- move resource toward inactive policy state
- never delete historical records

Required checks:

- future allocations exist
- person manages projects, departments, or teams
- user has pending approvals or governance ownership

If any are true:

- create exception task for RM/PMO/admin
- preserve a controlled transition state until operational cleanup is complete

## 10.5 Leave Event

System action:

- create availability-impact signal
- optionally reduce scheduling availability
- never rewrite allocations directly without policy

## 11. Exception Model

Recommended exception classes:

1. `MAPPING_MISSING`
2. `IDENTITY_CONFLICT`
3. `OPERATIONAL_IMPACT`
4. `SECURITY_IMPACT`
5. `DATA_VALIDATION_ERROR`

Examples:

- department code not mapped -> `MAPPING_MISSING`
- email belongs to different active user -> `IDENTITY_CONFLICT`
- termination with live allocations -> `OPERATIONAL_IMPACT`
- manager change affects approval ownership -> `SECURITY_IMPACT`

## 12. Security Requirements

Inbound PeopleStrong integration should require:

- tenant-level integration configuration
- shared secret or signature verification
- idempotency key handling using source event ID
- raw payload retention for audit
- replay-safe processing
- rate limiting and abuse protection

Minimum controls:

- reject unknown tenant key
- reject duplicate event IDs already processed
- reject invalid signature
- store processing outcome and error detail

## 13. Operational Safeguards

The integration must never do the following automatically:

- delete resources because an upstream employee is terminated
- delete or rewrite allocations
- delete timesheets
- delete contracts or project history
- alter bill rates
- alter system roles or tenant permissions
- infer project staffing from HR changes

## 14. Recommended Ownership of Skills

Recommended policy remains:

- PeopleStrong provides employee master
- RMGaaS is the skills master

Implication:

- do not overwrite `ResourceSkill` from PeopleStrong by default
- if PeopleStrong exposes skill hints, ingest them separately as suggested data, not authoritative skills inventory

## 15. Admin Experience

## 15.1 Integrations Screen

Should show:

- PeopleStrong connection status
- sync mode: webhook, batch, or hybrid
- last successful webhook receipt
- last successful delta sync
- last full reconciliation
- open exceptions count

## 15.2 People Screen

Should show:

- source badge: `PeopleStrong` or `Manual`
- locked HR-owned fields
- locally managed operational fields
- warning banner when an employee record has unresolved sync exceptions

## 15.3 Data Management Screen

Should show:

- run full reconciliation
- view failed events
- replay failed events
- mapping maintenance tools
- export sync report

## 16. Suggested Implementation Sequence

## Phase 1: Contract and persistence

1. Define source-of-truth matrix
2. Add integration configuration model for PeopleStrong
3. Add inbound integration event log
4. Add exception log and sync status tracking

## Phase 2: Inbound webhook path

1. Add PeopleStrong receiver endpoint
2. Validate signature and idempotency
3. Normalize payload
4. Upsert resource baseline fields
5. Log outcomes and exceptions

## Phase 3: Reconciliation path

1. Add scheduled delta sync
2. Add full reconciliation job
3. Add drift reports and replay tools

## Phase 4: Admin UX

1. Integrations health and config
2. People source badges and ownership visibility
3. Exception queue and review workflows
4. Data Management reconcile tools

## 17. Recommended Product Decision

Recommended policy for NewVision:

1. Use PeopleStrong as the upstream employee master for all new and changed people records
2. Keep RMGaaS as the system of record for staffing and commercial execution
3. Implement hybrid sync: webhook where possible, batch reconciliation always
4. Keep the integration unidirectional in Phase 1: PeopleStrong -> RMGaaS only
5. Treat lifecycle events as triggers for governed operational actions, not blind destructive updates

## 18. Success Criteria

The integration is successful when:

- new hires appear in RMG automatically from PeopleStrong
- employee master updates flow into RMG without harming staffing data
- exits create governed operational cleanup rather than data loss
- admins can trace every applied or rejected PeopleStrong event
- missed events are corrected by reconciliation without manual spreadsheet work