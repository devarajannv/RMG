# Role And Access Backbone Implementation Plan

Date: 2026-03-25

## 1. Objective

Implement a reliable role and permission backbone for the tenant app so that:

- tenant admins can create roles using complete, business-meaningful authority controls
- the UI, API, and stored role data all use one canonical permission model
- PMO and similar operational roles can be configured without hidden gaps
- direct actions, approvals, document governance, audit access, exception handling, and rollback can be represented consistently
- the `Level` field is removed from the role-creation UX

This plan covers the access-control backbone only. It does not implement PMO workflows, document taxonomy, or rollback execution itself, but it provides the permission and UX foundation required for those areas.

## 2. Why This Work Is Required

Current role creation is not trustworthy as the source of truth for effective access.

### 2.1 Observed gaps

- The create-role modal exposes a limited permission list and an arbitrary `Level (1-1000)` input in `/apps/frontend/src/pages/admin/shared.tsx`.
- The backend validates role level as `0..10` and internally models a small fixed hierarchy in `/apps/api/src/modules/roles/role.controller.ts` and `/apps/api/src/modules/roles/role.service.ts`.
- The backend route guards use permission names that do not fully match the role-form list, including singular permission families such as `client:*`, `contract:*`, `project:*`, `request:*`, `document:*`, `workflow:*`, `role:*`, and `audit:*`.
- The frontend permission hook still uses plural legacy families such as `clients:*`, `contracts:*`, `projects:*`, `requests:*`, and `documents:*` in `/apps/frontend/src/hooks/usePermissions.ts`.
- The current role screen omits important authority domains including requests, documents, audit, role assignment/audit, workflow management detail, SLA permissions, and sensitive-data access.

### 2.2 Risks of leaving it as-is

- Tenant admins may create roles that appear sufficient in the UI but fail against live API route guards.
- Sensitive powers may remain hidden, implicitly granted, or unmanaged.
- PMO role rollout will be blocked by missing document, request, audit, and governance permissions.
- Future exception handling and rollback governance will have no clean permission model.
- Admin UX will remain confusing and technically leaky.

## 3. Target Outcome

At the end of this initiative, the product should have:

- one canonical permission registry for backend, frontend, seeds, and admin UI
- one normalized naming scheme for permission keys
- one business-readable role creation flow exposing all meaningful authority controls
- no numeric level field in role creation
- role screen sections grouped by business meaning instead of raw legacy permission strings
- support for advanced permission categories such as approvals, governance, document control, audit, exception handling, and rollback
- a migration path so existing tenants and roles are not broken

## 4. Scope Boundaries

### In scope

- canonical permission model
- permission naming normalization
- role data contract cleanup
- role creation/edit UX redesign
- admin permission display model
- route and frontend permission alignment
- migration and compatibility strategy
- validation and rollout plan

### Out of scope

- implementing PMO business processes
- implementing document taxonomy maintenance itself
- implementing rollback engine behavior itself
- redesigning the full org structure model
- redesigning approval-chain engine behavior beyond permission exposure

## 5. Implementation Principles

1. Permissions define capability.
2. Scope defines visibility boundaries.
3. Approval powers are distinct from edit powers.
4. Governance powers are distinct from operational powers.
5. Sensitive-data access must be explicit.
6. Exception and rollback authority must be explicit.
7. Admins should see all business-meaningful authority controls, not every raw internal field.
8. UI must be generated from the same source of truth used by backend authorization.

## 6. Canonical Permission Model

### 6.1 Permission structure

Adopt one canonical permission key shape:

`<domain>:<action>[:<scope>]`

Examples:

- `client:read`
- `client:write`
- `project:read`
- `request:approve`
- `document:manage`
- `resource:read:team`
- `ctc:read:all`

### 6.2 Canonical actions

Supported canonical actions should include:

- `read`
- `write`
- `delete`
- `approve`
- `manage`
- `assign`
- `export`
- `import`
- `audit`

Notes:

- `write` should replace fragmented `create` and `update` where the live route model already uses write semantics.
- Some domains may still require domain-specific actions like `clone` if materially distinct.

### 6.3 Canonical domains

The canonical registry should include at least:

- `resource`
- `project`
- `allocation`
- `timesheet`
- `client`
- `contract`
- `document`
- `request`
- `request-type`
- `request-template`
- `workflow`
- `sla`
- `report`
- `analytics`
- `user`
- `role`
- `audit`
- `settings`
- `ctc`
- `import`
- `agent` if exposed in tenant admin
- `exception`
- `rollback`

### 6.4 Scope model

Where applicable, support scoped read access:

- `own`
- `team`
- `practice`
- `all`

Initial scope-enabled domains:

- `resource`
- `request`
- `document`
- optionally `project` and `client` if portfolio scoping is later adopted

## 7. Permission Registry Design

Introduce a single registry artifact owned by the backend and consumable by the frontend.

Each permission definition should include:

- `key`
- `domain`
- `action`
- `scope` optional
- `label`
- `description`
- `section`
- `riskLevel` (`LOW | MEDIUM | HIGH | CRITICAL`)
- `category` (`OPERATIONAL | APPROVAL | GOVERNANCE | SENSITIVE | ADMIN | EXCEPTION | ROLLBACK`)
- `tenantVisible` boolean
- `advancedOnly` boolean
- `dependencies` optional
- `incompatibleWith` optional

This registry becomes the source for:

- backend seed/init of permissions
- backend validation of role payloads
- frontend role screen sections and labels
- risk and summary generation in the role UI

## 8. Role Model Changes

### 8.1 Required decisions

- Hide `level` from role creation and editing UX.
- Retain stored `level` temporarily for compatibility only.
- Treat `level` as internal hierarchy metadata, not user-entered authority input.
- Add an optional business-friendly `accessProfile` classification for display if needed:
  - `ORGANIZATION`
  - `DELIVERY`
  - `PRACTICE`
  - `TEAM`
  - `INDIVIDUAL`

### 8.2 Recommended role payload shape

Target role write contract:

- `name`
- `description`
- `accessProfile` optional
- `permissionKeys[]`
- `scopeConfig` optional for scoped permissions
- `metadata` optional for tags/purpose

Avoid exposing:

- `level`
- `parentRoleId` unless advanced mode is explicitly enabled
- legacy raw permission JSON as a user concern

### 8.3 Legacy compatibility

The current `Role.permissions` JSON field is marked as legacy in Prisma. Continue reading it during transition, but move all live authority logic to `RolePermission` relations and the canonical registry.

## 9. Admin UX Redesign

### 9.1 Role creation sections

Redesign the create/edit role UI into these sections:

1. Role Identity
2. Access Profile
3. Business Area Permissions
4. Scope
5. Approval Participation
6. Document And Artefact Control
7. Workflow And Governance Powers
8. Sensitive Data Access
9. Role And User Administration
10. Override, Exception, And Rollback
11. Visibility Summary
12. Risk Review

### 9.2 Section content

#### Role Identity

- role name
- description
- business function tag optional

#### Access Profile

- guided choice, not numeric level
- optional clone-from-existing-role

#### Business Area Permissions

Operational access by domain:

- Resources
- Projects
- Allocations
- Timesheets
- Clients
- Contracts
- Requests
- Reports

#### Scope

Only show for domains with scoped permissions.

#### Approval Participation

- request approval
- allocation approval
- timesheet approval
- contract approval
- document approval
- rollback approval
- exception approval

#### Document And Artefact Control

- upload documents
- view documents
- edit document metadata
- delete documents
- manage document access
- view document logs
- maintain document taxonomy
- maintain required-document policies

#### Workflow And Governance Powers

- view workflows
- manage workflows
- view request types
- manage request types
- clone request types
- import request templates
- view SLA policies
- manage SLA policies

#### Sensitive Data Access

- audit read
- audit export
- compensation read all
- legal/commercial artefact access where needed

#### Role And User Administration

- user read/write/delete
- role read/write/delete
- role assign/revoke
- role assignment audit

#### Override, Exception, And Rollback

- raise exception
- resolve exception
- initiate rollback
- approve rollback
- execute rollback
- view override history
- view rollback history

#### Visibility Summary

Generate a plain-language summary before save.

#### Risk Review

Warn on dangerous combinations.

### 9.3 UX rules

- Hide raw permission keys by default.
- Use human-readable labels.
- Show tooltips/descriptions for sensitive permissions.
- Collapse advanced sections by default.
- Provide “recommended presets” for common business roles later.
- Show missing prerequisites or dependencies inline.

## 10. PMO Role Blueprint Requirements

The new backbone must support a PMO role with at least these permissions available for assignment.

### 10.1 Expected PMO operational permissions

- client:read
- client:write
- contract:read
- contract:write
- project:read
- project:write
- document:read
- document:create
- document:update
- request:read
- request:create
- report:read

### 10.2 Optional PMO elevated permissions

- request:approve if PMO is an approver
- document:manage if PMO manages access
- audit:read if PMO needs cross-case audit visibility
- exception:write if PMO manages exception intake
- rollback:create if PMO can initiate rollback

### 10.3 PMO should not automatically receive

- role:write
- role:assign
- workflow:manage
- request-type:write
- user:delete
- audit:export
- ctc:read:all

unless explicitly intended by the tenant.

## 11. Backend Workstreams

### Workstream A: Canonical permission registry

Deliverables:

- create canonical registry module
- define domain/action/scope metadata
- define section/category/risk metadata
- expose registry for admin UI consumption

Tasks:

1. inventory all current `authorize()` keys in backend modules
2. inventory all current permission checks in frontend
3. classify each key as canonical, alias, or deprecated
4. generate canonical registry definitions
5. introduce alias mapping for transition

Acceptance criteria:

- every route guard key maps to a canonical permission
- no permission in UI exists without registry definition
- deprecated aliases are documented and mapped

### Workstream B: Route normalization

Deliverables:

- backend routes aligned to canonical permission names
- auth middleware supports alias resolution during migration window

Tasks:

1. normalize singular/plural mismatches
2. normalize create/update into write where intended
3. normalize workflow and role management naming
4. normalize documents and requests naming

Acceptance criteria:

- route guards use canonical keys only after migration
- integration tests cover high-risk routes

### Workstream C: Role API contract cleanup

Deliverables:

- create/update role endpoints accept canonical permission keys
- validation rejects unknown keys
- validation hides/removes raw `level` from client-facing role form contract

Tasks:

1. update schemas for role create/update
2. introduce registry-backed validation
3. support advanced internal metadata only where necessary
4. ensure backward compatibility for existing role reads

Acceptance criteria:

- role writes fail on unregistered permission keys
- role reads provide everything needed by the admin UI

### Workstream D: Permission bootstrap and seed migration

Deliverables:

- permission initialization from canonical registry
- migration script mapping old role permissions to new canonical keys

Tasks:

1. map legacy permission strings to canonical keys
2. backfill missing `RolePermission` records
3. retain read compatibility for legacy JSON temporarily
4. validate existing system roles after migration

Acceptance criteria:

- no existing tenant loses effective access unexpectedly
- all system roles reconcile to canonical keys

## 12. Frontend Workstreams

### Workstream E: Frontend permission model normalization

Deliverables:

- `usePermissions` constants aligned to canonical keys
- frontend `Can` usage updated where needed

Tasks:

1. replace legacy plural constants with canonical keys
2. add missing domains: documents, audit, role assignment, workflows, SLA, requests, rollback, exceptions
3. add alias support only during transition

Acceptance criteria:

- frontend permission constants mirror backend registry
- hidden UI states match backend authority behavior

### Workstream F: Role creation/edit redesign

Deliverables:

- new role form structure
- level field hidden
- registry-driven section rendering
- summary and risk review blocks

Tasks:

1. replace static `AVAILABLE_PERMISSIONS` array
2. consume permission registry metadata
3. group permissions by section
4. add sensitive permission descriptions
5. add advanced sections
6. add final summary panel
7. add risk warnings based on combinations

Acceptance criteria:

- admin sees every business-meaningful access control attribute
- admin does not see numeric level
- PMO role can be created from available controls without hidden backend gaps

### Workstream G: Roles list and detail improvements

Deliverables:

- roles list no longer emphasizes numeric level
- detail summary shows business-readable authority

Tasks:

1. replace `Level X` on cards with access profile or concise permission summary
2. show approval/governance/sensitive badges
3. show assigned user count and risk summary

Acceptance criteria:

- roles list is understandable to tenant admins
- no internal numeric metadata is presented as core authority signal

## 13. Migration Strategy

### 13.1 Phase 1: Registry introduction

- add canonical registry
- add alias map
- keep current behavior operational

### 13.2 Phase 2: Dual-read / dual-check period

- backend accepts canonical keys and legacy aliases
- frontend can still read old roles while writing canonical keys

### 13.3 Phase 3: Role data migration

- migrate existing role assignments and permissions
- re-seed or reconcile system roles
- verify all admin routes and major user flows

### 13.4 Phase 4: UI cutover

- ship redesigned role UI
- hide level field
- display canonical permissions only

### 13.5 Phase 5: Alias cleanup

- remove deprecated aliases from UI
- eventually remove deprecated alias checks from backend after migration window

## 14. Testing And Validation Plan

### 14.1 Registry validation

- every backend route guard must resolve to a registry permission
- every UI-exposed permission must resolve to a registry permission
- no orphan permissions remain

### 14.2 Role CRUD validation

- create role with canonical keys
- update role with canonical keys
- reject unknown permission keys
- verify role read payload supports UI sections

### 14.3 Authorization validation

- clients, contracts, projects, documents, requests, workflows, audit, and roles
- both positive and negative permission cases
- sensitive combinations tested explicitly

### 14.4 Migration validation

- existing admin role still works
- existing tenant operational roles still work
- no silent privilege escalation
- no silent privilege loss on key flows

### 14.5 PMO validation

Validate that PMO can perform:

- create client
- create NDA contract
- upload/view/update supporting documents
- read and create requests
- view relevant reports

Validate PMO cannot perform unless explicitly granted:

- assign roles
- edit workflows
- export audit
- read all compensation data

## 15. Rollout Sequence

### Sprint 1: Architecture and inventory

- freeze canonical permission decisions
- complete permission inventory and alias map
- finalize role section IA

### Sprint 2: Backend registry and normalization

- implement registry
- update route guards and validation
- add migration support

### Sprint 3: Frontend permission normalization

- update `usePermissions`
- update `Can` usage where required
- verify module navigation gates

### Sprint 4: Admin role UX redesign

- replace create/edit role modal
- hide level
- add summary/risk review

### Sprint 5: Migration and validation

- migrate existing roles
- regression test major modules
- validate starter business roles including PMO

## 16. Risks And Mitigations

### Risk: Permission naming drift continues

Mitigation:

- enforce registry-backed validation in both backend and frontend

### Risk: Existing roles break during migration

Mitigation:

- introduce alias mapping and staged migration

### Risk: Admin UI becomes too complex

Mitigation:

- group by business sections
- hide advanced controls by default
- generate summary and risk review

### Risk: PMO still misses hidden powers

Mitigation:

- validate PMO blueprint against real API route guards before rollout

## 17. Explicit Decisions To Lock Before Implementation

1. Canonical naming style: singular domains with `write` preferred over fragmented create/update where appropriate.
2. Numeric role level: hidden from admin UX.
3. Access profile: guided metadata only, not authority math.
4. Role form rule: show all meaningful authority controls, not all raw fields.
5. Requests, documents, audit, role assignment, workflow governance, exception handling, and rollback must all be representable in the role model.
6. PMO starter role must be supported as a first-class validation case.

## 18. Definition Of Done

This initiative is complete when all of the following are true:

- one canonical permission registry exists and is used by backend and frontend
- create-role/edit-role no longer exposes numeric level
- role screen exposes complete business-meaningful authority controls
- UI permission options match live backend route enforcement
- migration path for existing tenants is executed safely
- PMO role can be configured without hidden permission gaps
- regression tests verify no major authorization mismatch remains
