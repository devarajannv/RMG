# PeopleStrong Event Contract Recommendation

Date: 2026-03-24
Status: Recommendation
Scope: Public-doc-based contract recommendation for Phase 1 PeopleStrong -> RMGaaS integration

## 1. What the Public PeopleStrong Docs Actually Confirm

The public documentation at `https://api-docs.peoplestrong.com/` confirms the following:

- PeopleStrong exposes `Inbound API`, `Outbound API`, and `Transactional API`
- webhook support is available for `row wise` and `column wise incremental APIs`
- webhook behavior is described generically as notification of data changes
- the public docs say webhook notifications occur `every 1Hr`
- the public navigation exposes module families including `HRIS`, `Leave`, `Transfer`, `Promotion`, `Confirmation`, and `Exit`
- the public docs use examples such as `new hire information` and `leave transactions`

The public docs do not confirm the following:

- a published named webhook event list
- official vendor event names like `employee.created`
- a public payload contract that guarantees event-type strings for each HR lifecycle change

## 2. Design Decision for RMGaaS

RMGaaS should not model the integration contract as if PeopleStrong sends a stable vendor event catalog.

Instead, RMGaaS should use a two-layer contract:

1. `Source delivery contract`
2. `RMG canonical event contract`

## 3. Source Delivery Contract

This is the boundary we should expect from PeopleStrong unless tenant-specific documentation proves otherwise.

Recommended source envelope:

```json
{
  "source": "PeopleStrong",
  "deliveryMode": "webhook",
  "dataFlowType": "ROW_WISE_INCREMENTAL",
  "sourceDomain": "HRIS",
  "integrationMasterName": "EmployeeMasterDelta",
  "marker": "2026-03-24T08:00:00Z",
  "occurredAt": "2026-03-24T08:12:40Z",
  "employeeCode": "NVS01234",
  "payload": {},
  "changedFields": []
}
```

Required envelope fields for ingestion:

- `source`
- `deliveryMode`
- `dataFlowType`
- `sourceDomain`
- `integrationMasterName`
- `occurredAt` or equivalent marker timestamp
- employee identifier such as `employeeCode`
- raw `payload`

Important rule:

- Treat `sourceDomain` and `dataFlowType` as authoritative
- treat vendor labels as metadata, not business logic keys

## 4. RMG Canonical Event Contract

This is the contract inside RMGaaS after normalization.

Recommended canonical event set for Phase 1:

1. `employee.upsert`
2. `employee.transfer`
3. `employee.promotion`
4. `employee.confirmation`
5. `employee.exit`
6. `employee.leave.recorded`

Why this set is better than many low-level events:

- it matches the public PeopleStrong module families more closely
- it avoids inventing precision that the vendor docs do not publish
- it keeps orchestration logic simpler in the first implementation
- it still allows the sync service to derive field-level changes internally

## 5. Mapping from Publicly Visible PeopleStrong Domains

Recommended Phase 1 mapping:

| PeopleStrong public domain | RMG canonical event | Notes |
|---|---|---|
| `HRIS` | `employee.upsert` | Includes new hires and baseline profile updates |
| `Transfer` | `employee.transfer` | Department, manager, location, org-unit changes |
| `Promotion` | `employee.promotion` | Title, designation, grade, band changes |
| `Confirmation` | `employee.confirmation` | Probation to confirmed status or similar status change |
| `Exit` | `employee.exit` | Termination, resignation, release, exit lifecycle |
| `Leave` | `employee.leave.recorded` | Leave transaction visibility, not allocation control by default |

Not recommended in Phase 1:

- separate public canonical events for `employee.created` and `employee.updated`
- relying on PeopleStrong to distinguish create versus update at source
- field-specific canonical event names as the primary internal bus contract

Those can still be derived inside processing logic after resource lookup.

## 6. Derived Processing Outcomes Inside RMGaaS

After normalization, the sync service can still infer more specific outcomes:

- `employee.upsert` can result in create or update behavior
- `employee.transfer` can change manager, department, location, or multiple fields together
- `employee.promotion` can change designation, band, grade, or employment status
- `employee.exit` can trigger exit-cascade review if active allocations exist
- `employee.leave.recorded` can create an informational or exception record depending on future staffing policy

This preserves operational precision without pretending the source publishes that precision as a contract.

## 7. Recommended Receiver Design

Recommended inbound path for Phase 1:

- one PeopleStrong ingress endpoint family
- one normalization layer
- one canonical event dispatcher

Recommended endpoint approach:

- `POST /api/v1/integrations/peoplestrong/webhooks`

Optional split only if the tenant-specific PeopleStrong delivery shape truly requires it:

- `POST /api/v1/integrations/peoplestrong/webhooks/hris`
- `POST /api/v1/integrations/peoplestrong/webhooks/lifecycle`
- `POST /api/v1/integrations/peoplestrong/webhooks/leave`

Default recommendation:

- start with one endpoint and route by `sourceDomain`

## 8. Normalized Internal Shape

Recommended normalized payload:

```json
{
  "tenantExternalKey": "newvision",
  "source": "PeopleStrong",
  "sourceDomain": "Transfer",
  "dataFlowType": "ROW_WISE_INCREMENTAL",
  "canonicalEventType": "employee.transfer",
  "eventId": "ps-20260324-001",
  "occurredAt": "2026-03-24T08:30:00Z",
  "employee": {
    "employeeId": "NVS01234",
    "firstName": "Asha",
    "lastName": "Patil",
    "email": "asha.patil@newvision-software.com",
    "designation": "Senior Engineer",
    "band": "E3",
    "managerEmployeeId": "NVS00091",
    "departmentCode": "DA",
    "locationCode": "PUNE",
    "employmentStatus": "ACTIVE"
  },
  "changedFields": [
    "managerEmployeeId",
    "departmentCode",
    "locationCode"
  ],
  "sourceMetadata": {
    "integrationMasterName": "TransferDelta",
    "vendorEventName": null,
    "marker": "2026-03-24T08:00:00Z"
  },
  "rawPayload": {}
}
```

## 9. Implementation Guidance

Phase 1 implementation should follow these rules:

1. Persist the raw PeopleStrong payload unchanged for audit and replay.
2. Normalize into the RMG canonical event set above.
3. Resolve the target `Resource` primarily by PeopleStrong employee identifier.
4. Apply only PeopleStrong-owned fields.
5. Raise exceptions for unmapped structures or operationally risky changes.
6. Keep create-versus-update as sync logic, not source-contract logic.

## 10. Final Recommendation

For this codebase, the safest first contract is:

- external assumption: `PeopleStrong sends domain-scoped delta changes`
- internal contract: `RMGaaS converts them into a small canonical lifecycle set`

Recommended Phase 1 canonical events:

1. `employee.upsert`
2. `employee.transfer`
3. `employee.promotion`
4. `employee.confirmation`
5. `employee.exit`
6. `employee.leave.recorded`

This is the cleanest boundary that is both defensible from public documentation and practical for implementation in RMGaaS.