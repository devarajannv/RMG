# Tenant App IA Migration Map: NewVision vs External Tenants

Date: 2026-03-24
Status: Proposal
Scope: Tenant application navigation, Organization Admin screen model, onboarding reuse, NewVision internal mode, external tenant bootstrap mode

## 1. Purpose

This document translates the operating-model proposal into a screen-by-screen target information architecture and migration plan.

It answers four practical questions:

1. What should NewVision users see?
2. What should external tenant admins see?
3. Which current screens stay, move, split, or get renamed?
4. How should the existing onboarding work be repurposed instead of discarded?

## 2. Current State Summary

The current tenant app already has the right top-level direction:

- `My Settings` is separated from `Organization Admin`
- dedicated admin routes exist under `/admin/*`
- onboarding exists and is functionally rich

The main drift is lower in the stack:

- the real organization-management screens live inside the onboarding wizard
- the persistent `Organization` page is mostly stats and billing taxonomy
- the main `Resources` screen still reflects the older flat model in places
- business roles, grade bands, departments, teams, and governance are not presented as durable first-class admin destinations

## 3. Design Rule

Use one durable Organization Admin model for steady-state administration, with onboarding acting as a guided wrapper over the same domains.

That means:

- persistent screens own the data
- onboarding sequences the work
- NewVision defaults to persistent screens
- external tenants start in onboarding, then graduate to the same persistent screens

## 4. Target Tenant Modes

## 4.1 NewVision Internal Tenant

Default behavior:

- no forced onboarding redirect
- normal tenant app opens immediately
- `Organization Admin` is the primary setup and maintenance area
- `Onboarding` remains available as an optional guided assistant

Default admin landing page:

- `Organization Admin > Overview`

## 4.2 External Customer Tenant

Default behavior:

- if setup is incomplete, show onboarding status clearly
- tenant admin is routed into onboarding from the admin area
- once baseline setup is complete, the tenant operates from the same persistent admin screens as NewVision

Default admin landing page:

- incomplete tenant: `Organization Admin > Onboarding`
- operational tenant: `Organization Admin > Overview`

## 5. Target Organization Admin Navigation

Recommended durable Organization Admin navigation:

1. Overview
2. Organization Profile
3. Structure
4. People
5. Business Roles
6. Grade Bands
7. System Roles and Access
8. Approval Functions
9. Request Governance
10. Integrations
11. Currency
12. Audit
13. Data Management
14. Onboarding

Notes:

- `Onboarding` stays in Organization Admin, but it becomes an assistant surface, not the permanent home of the underlying data
- `Approval Functions` remains adjacent to governance because it defines approval authorities and assignment semantics used by workflow logic
- `Request Governance` groups request types and workflows together, consistent with the approved IA decision
- `Overview` becomes the durable admin landing screen and absorbs the current high-level organization stats

## 6. Screen-by-Screen Target Model

## 6.1 Overview

Route:

- `/admin/overview`

Audience:

- NewVision tenant admins
- external tenant admins after bootstrap

Purpose:

- tenant admin landing page
- setup health, coverage, and administrative summary

Should contain:

- organization profile summary
- setup status banner
- coverage cards for departments, teams, business roles, grade bands, users, resources, workflows
- data freshness and import status
- billing taxonomy summary
- quick actions to add department, add user, import data, create workflow

Absorbs from current product:

- current `/admin/organization` summary cards
- current onboarding progress summary concepts

Should not contain:

- the only editable version of organization fundamentals

## 6.2 Organization Profile

Route:

- `/admin/organization-profile`

Purpose:

- company identity and tenant-wide profile settings

Should contain:

- company name and legal identity
- branding
- industry and geography
- fiscal and regional settings
- baseline tenant metadata

Comes from:

- `IdentityPhase`

Current page impact:

- split profile editing out of onboarding into a durable page
- remove the expectation that `/admin/organization` is the place for all org setup

## 6.3 Structure

Route:

- `/admin/structure`

Purpose:

- durable home for organizational hierarchy

Should contain tabs or sections for:

- Departments
- Teams
- Cost Centers

Should support:

- create, edit, deactivate
- parent-child relationships where needed
- default seeding templates
- import and validation actions

Comes from:

- `StructurePhase`

Current page impact:

- this becomes the real home of structure management
- onboarding uses the same structure editor inside a guided flow

## 6.4 People

Route:

- `/admin/people`

Purpose:

- durable home for workforce setup and login provisioning

Should contain sections for:

- Resources
- User Invitations
- User-to-Resource Mapping
- Import and Validation

Should support:

- assign department, team, grade band, manager, business role
- create login for resource
- invite user without resource where appropriate
- bulk import review and commit

Comes from:

- `PeoplePhase`

Current page impact:

- separates tenant workforce administration from the operational `Resources` page
- makes organization placement a first-class admin concern

## 6.5 Business Roles

Route:

- `/admin/business-roles`

Purpose:

- define what people are in the organization

Should contain:

- business role list
- category and level model
- required skills and responsibilities
- active or inactive state

Comes from:

- `RolesPhase` business role section

Current page impact:

- moves business-role administration out of onboarding-only UX
- avoids conflating business roles with system RBAC roles

## 6.6 Grade Bands

Route:

- `/admin/grade-bands`

Purpose:

- manage job levels and grade structures used by people and planning flows

Should contain:

- grade band catalog
- level definition
- compensation range metadata where applicable

Comes from:

- `RolesPhase` grade band section

Current page impact:

- removes grade-band administration from wizard-only ownership

## 6.7 System Roles and Access

Route:

- `/admin/access`

Purpose:

- manage login roles, permissions, and user assignment

Should contain:

- System Roles
- Permission Matrix
- User Role Assignment
- Access Policies

Should explicitly distinguish:

- system roles = what a user can do in the app
- business roles = what the person is in the organization

Comes from:

- current `/admin/roles`
- current `/admin/users`

Current page impact:

- keep both pages functionally, but present them as one access domain
- fix the `Role.level` UX so hierarchy metadata is understandable or hidden behind guided choices

## 6.8 Approval Functions

Route:

- `/admin/functions`

Purpose:

- manage approval authorities and assignment-based functional hats used across workflow governance

Should contain:

- function catalog
- holder assignment and revocation
- effective date windows
- system versus tenant-defined functions

Current page impact:

- keep existing page
- position it explicitly as part of the governance domain instead of leaving it as a generic admin utility

## 6.9 Request Governance

Route:

- `/admin/request-governance`

Purpose:

- keep request types and workflow governance in one administrative domain

Should contain subsections for:

- Approval Functions
- Request Types
- Workflows
- Templates
- SLA and escalation policies
- Delegation rules

Comes from:

- current `/admin/request-types`
- current `/admin/workflows`
- current `/admin/functions`
- current `GovernancePhase`

Current page impact:

- preserves the approved adjacency of request types and workflows
- graduates delegation rules into the durable governance domain

## 6.10 Integrations

Route:

- `/admin/integrations`

Purpose:

- manage external system connectivity and sync behavior

Current page impact:

- keep existing page
- add import-source visibility when bootstrap/import is used

## 6.11 Currency

Route:

- `/admin/currency`

Purpose:

- tenant-wide currency and exchange-rate administration

Current page impact:

- keep existing page

## 6.12 Audit

Route:

- `/admin/audit`

Purpose:

- tenant-wide traceability of administrative actions

Current page impact:

- keep existing page

## 6.13 Data Management

Route:

- `/admin/data-management`

Purpose:

- import, export, bootstrap tools, validation, and reconciliation

Special role in NewVision mode:

- primary place for import/bootstrap operations

Current page impact:

- keep existing page
- elevate its role for NewVision internal setup

## 6.14 Onboarding

Route:

- `/admin/onboarding`

Purpose:

- guided first-run wrapper over the durable admin domains

Should contain:

- stepper
- progress tracking
- dependency warnings
- completion checks
- links back into the underlying admin screens where appropriate

Should not be:

- the only place where structure, roles, people, or governance can be edited

## 7. Current-to-Target Mapping

## 7.1 Existing routes to keep as-is

- `/admin/users`
- `/admin/roles`
- `/admin/functions`
- `/admin/request-types`
- `/admin/workflows`
- `/admin/currency`
- `/admin/integrations`
- `/admin/audit`
- `/admin/data-management`

These stay functionally alive during migration, even if the navigation grouping changes.

## 7.2 Existing routes to repurpose

- `/admin/organization`
  - from: stats and billing taxonomy page
  - to: `Overview` or a narrower `Organization Overview` page

- `/admin/onboarding`
  - from: only practical place for structure, business roles, grade bands, people, governance
  - to: guided wrapper over durable admin modules

## 7.3 New durable routes to add

- `/admin/overview`
- `/admin/organization-profile`
- `/admin/structure`
- `/admin/people`
- `/admin/business-roles`
- `/admin/grade-bands`
- `/admin/access`
- `/admin/request-governance`

## 7.4 Existing operational routes that should stay operational

- `/resources`
- `/projects`
- `/allocations`
- `/clients`

These are not the right place to own foundational org setup.

In particular:

- `/resources` should focus on operating the staffed workforce
- `/admin/people` should own foundational org placement and bootstrap-quality people setup

## 8. NewVision vs External Tenant Screen Behavior

## 8.1 NewVision Internal Tenant

Sidebar behavior:

- show full Organization Admin menu immediately
- do not hard-gate normal admin routes behind onboarding completion

Admin landing behavior:

- default to `/admin/overview`

Primary setup path:

- Data Management
- Structure
- People
- Business Roles
- Grade Bands
- Request Governance

Onboarding behavior:

- available as an optional assistant
- can be launched from Overview or Data Management

## 8.2 External Tenant

Sidebar behavior:

- same long-term menu model
- if incomplete, show setup status and emphasis on onboarding

Admin landing behavior:

- incomplete tenant defaults to `/admin/onboarding`
- operational tenant defaults to `/admin/overview`

Primary setup path:

- Onboarding first
- persistent pages become the steady-state editing surfaces after bootstrap

## 9. Migration of Existing Frontend Work

## 9.1 Reclassify onboarding phases as shared admin modules

- `IdentityPhase` -> Organization Profile page module
- `StructurePhase` -> Structure page module
- `RolesPhase` -> Business Roles and Grade Bands page modules
- `PeoplePhase` -> People page module
- `GovernancePhase` -> Governance page module

## 9.2 Leave wizard-only concerns inside onboarding

- phase sequencing
- progress persistence
- completion percentages
- dependency prompts
- stepper navigation

## 9.3 Keep operational pages separate

- do not turn `/resources` into the primary place for tenant bootstrap
- do not overload `/admin/users` with workforce modeling concerns that belong in People

## 10. Recommended Implementation Sequence

## Phase A: IA foundation

1. Add `Overview` as the Organization Admin landing page
2. Reclassify current `Organization` page content under `Overview`
3. Introduce tenant operating-mode and bootstrap-state handling
4. Change `/admin` default redirect based on tenant mode and completion state

## Phase B: Durable admin surfaces

1. Extract `Organization Profile` from onboarding
2. Extract `Structure` from onboarding
3. Extract `People` from onboarding
4. Extract `Business Roles` and `Grade Bands` from onboarding
5. Extract `Governance` from onboarding

## Phase C: Admin-domain consolidation

1. Group Users and Roles under `System Roles and Access`
2. Group Request Types, Workflows, and delegation under `Request Governance`
3. Keep Integrations, Currency, Audit, and Data Management as standalone admin utilities

## Phase D: Operational cleanup

1. Align the operational `Resources` page with the relational org model
2. stop using legacy flat department handling where relational fields exist
3. ensure admin-created org structure is visible consistently across operations screens

## 11. Route-Level Recommendation

Recommended `/admin` behavior:

- `NEWVISION_INTERNAL` -> `/admin/overview`
- `BOOTSTRAP_REQUIRED` -> `/admin/onboarding`
- `BOOTSTRAP_IN_PROGRESS` -> `/admin/onboarding`
- `OPERATIONAL` -> `/admin/overview`

## 12. Success Criteria

This migration is successful when:

- NewVision can operate the tenant without being forced through onboarding
- external tenants still have a strong guided bootstrap path
- structure, people, roles, and governance each have durable admin homes
- onboarding no longer owns the only editable version of tenant fundamentals
- operational screens consume the same org model the admin screens manage
- admins can understand the difference between access control and business structure without training

## 13. Immediate Product Decision

If approved, the next concrete design artifact should be a route-and-component execution plan that maps each target screen to existing frontend components, backend APIs, and required navigation changes.