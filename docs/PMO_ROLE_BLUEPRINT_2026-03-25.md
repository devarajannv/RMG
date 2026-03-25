# PMO Role Blueprint

## Intent
This blueprint defines the baseline role for PMO operations in the tenant app under the new canonical permission model.

## PMO Can Do Directly
- Create, update, and maintain customer records
- Create, update, activate, renew, and close contracts
- Create and maintain projects
- Upload and maintain project and contract documents
- Create and update operational requests
- View workflows and request-type definitions that drive approvals
- View reports needed for PMO governance
- View audit history for PMO-managed entities

## PMO Cannot Do By Default
- Assign roles or manage user access
- Approve access changes
- Manage tenant settings
- Modify workflow definitions
- Delete roles or users
- View tenant-wide compensation data
- Use high-risk automation controls unless specifically delegated

## Baseline Permission Set
- `client:read`
- `client:write`
- `contract:read`
- `contract:write`
- `project:read`
- `project:write`
- `document:read`
- `document:create`
- `document:update`
- `request:read`
- `request:create`
- `request:update`
- `report:read`
- `workflow:read`
- `request-types:read`
- `audit:read`

## Optional Add-Ons
- Approval participation:
  - `request:approve`
- Document access administration:
  - `document:manage`
- Request-governance administration:
  - `request-types:update`
  - `workflow:manage`
- Import-led PMO operations:
  - `import:read`
  - `import:write`

## Operating Notes
- The PMO baseline is now provisionable as a concrete system role through the role administration backend, rather than existing only as a UI preset.
- Document categories are now governed through a tenant-admin document taxonomy policy and enforced during document create and update operations.
- PMO exception handling now has a first-class request path through the seeded `PMO_OPERATIONAL_EXCEPTION` blueprint in the Professional Services Core pack.
- PMO direct action is allowed where this role grants write authority and the target workflow does not require a request.
- Rollback remains request-controlled at the process layer; it is not represented as a standalone role permission in the current release.
- Workflow approvals must still be defined through workflow configuration, not inferred from the PMO role itself.
