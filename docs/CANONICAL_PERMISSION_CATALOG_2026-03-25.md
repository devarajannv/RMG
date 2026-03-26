# Canonical Permission Catalog

## Principle
Canonical permission keys must match live backend enforcement. Legacy keys remain supported only as compatibility aliases.

## Canonical Families
- Operational Work
  - `resource:read`, `resource:write`, `resource:read:own`, `resource:read:team`, `resource:read:practice`
  - `project:read`, `project:write`
  - `allocation:create`, `allocation:read`, `allocation:write`, `allocation:approve`
  - `timesheet:read`, `timesheet:write`, `timesheet:approve`
  - `client:read`, `client:write`
  - `contract:read`, `contract:write`
- Documents And Artefacts
  - `document:read`, `document:create`, `document:update`, `document:delete`, `document:manage`
- Requests And Approvals
  - `request:read`, `request:create`, `request:update`, `request:delete`, `request:approve`
- Reporting
  - `report:read`, `report:export`
- Governance
  - `settings:read`, `settings:update`
  - `request-types:read`, `request-types:create`, `request-types:update`, `request-types:delete`, `request-types:clone`
  - `request-templates:read`, `request-templates:import`
  - `workflow:read`, `workflow:manage`
  - `sla:read`, `sla:manage`
- Access Administration
  - `users:read`, `users:create`, `users:update`, `users:delete`
  - `role:read`, `role:write`, `role:delete`, `role:assign`, `role:admin`, `role:audit`
- Audit And Sensitive Oversight
  - `audit:read`, `audit:export`
  - `ctc:read:own`, `ctc:read:all`
- Automation And Integrations
  - `triggers:read`, `triggers:manage`
  - `import:read`, `import:write`
  - `agent:query`, `agent:manage`

## Compatibility Rules
- Legacy plural families map to singular canonical families where backend enforcement is singular.
- Legacy granular CRUD permissions map to the nearest live backend capability when runtime enforcement is broader.
- Example mappings:
  - `clients:create`, `clients:update`, `clients:delete` -> `client:write`
  - `projects:create`, `projects:update`, `projects:delete` -> `project:write`
  - `documents:read` -> `document:read`
  - `requests:approve` -> `request:approve`
  - `workflows:create`, `workflows:update`, `workflows:delete` -> `workflow:manage`

## PMO Baseline
The PMO blueprint includes:
- `client:read`, `client:write`
- `contract:read`, `contract:write`
- `project:read`, `project:write`
- `document:read`, `document:create`, `document:update`
- `request:read`, `request:create`, `request:update`
- `report:read`
- `workflow:read`
- `request-types:read`
- `audit:read`

## Deliberate Non-Inclusions
- Rollback and exception authority are not modeled as standalone permissions yet.
- Those controls still need dedicated domain behavior before they should appear as role toggles.
