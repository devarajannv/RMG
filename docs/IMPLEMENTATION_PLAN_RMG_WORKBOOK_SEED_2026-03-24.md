# RMG Workbook Seed Plan

**Date:** 2026-03-24  
**Source of Truth:** `RMG_Master_File_My Copy.xlsm`  
**Objective:** Seed the current tenant application so the platform reflects the organization structure, people, staffing, projects, and client reality represented by the RMG workbook.

## 1. Goal

Populate the tenant with the highest-value data that the platform can use immediately across:

- Dashboard
- Resources
- Projects
- Allocations
- Bench
- Resource search
- Organization onboarding data foundations

This plan intentionally prioritizes operational truth over full administrative completeness.

## 2. Constraint

The workbook is currently not machine-readable in this environment. The implementation plan therefore assumes one of the following before execution:

- a repaired/resaved `.xlsm` or `.xlsx` workbook, or
- trusted sheet exports from the workbook in `.csv` form

Until that is available, this document is the approved seed design, not an executable import runbook.

## 3. Recommended Seed Scope

### In scope

1. Tenant baseline
2. Practices
3. Locations
4. Grade bands
5. Business roles
6. Departments
7. Teams
8. Skills
9. Resources
10. Resource skill assignments
11. Manager hierarchy
12. Clients
13. Projects
14. Allocations
15. Optional user invitations or default user accounts for selected active employees

### Out of scope for this seed

1. Approval chains
2. Delegation rules
3. Request types and workflow governance
4. SSO and MFA setup
5. Contract lifecycle data requiring legal/financial validation
6. Timesheet history
7. Audit history
8. Opportunity / CRM pipeline beyond simple project status inference

## 4. Target Outcome

After the seed, the tenant should have:

- a credible organization structure visible in onboarding and admin screens
- real active and inactive resources
- real manager relationships
- real practices, locations, clients, and projects
- allocation history plus current active allocations
- dashboard metrics that reflect the workbook rather than placeholder or synthetic seed data

## 5. Source-to-Platform Mapping

## 5.1 Tenant Baseline

### Source

- Workbook context and tenant defaults

### Target

- `Tenant`
- optionally `TenantProfile`

### Seed rules

- Reuse existing `newvision` tenant if present
- Set timezone to `Asia/Kolkata`
- Set currency to `INR`
- Set default capacity to `100`
- Populate `TenantProfile` only where workbook or approved defaults support it

### Required defaults

- legal name if not explicit in workbook
- industry
- primary email
- country

## 5.2 Practices

### Source columns

- `Practice`
- optionally `Practice Head`

### Target

- `Practice`

### Seed rules

- Create one active practice per distinct normalized practice name
- Generate unique tenant-scoped practice codes
- Later attach `headId` if `Practice Head` resolves to a seeded resource
- Set target utilization default to `85` unless a tenant-specific rule is approved

## 5.3 Locations

### Source columns

- `Location`

### Target

- `Location`

### Seed rules

- Create one location per distinct normalized location name
- Infer timezone and country from location name mapping table
- Mark `OFFICE` unless a specific client site or remote rule is identified
- Set `isOnshore` via approved location-country mapping, not by ad hoc naming only

## 5.4 Grade Bands

### Source columns

- `Experience Range`
- current resource `band` fallback logic

### Target

- `GradeBand`
- `Resource.gradeBandId`
- keep `Resource.band` populated for backward compatibility

### Seed rules

- Create canonical grade bands from normalized experience buckets
- Assign stable codes such as `LT1`, `G1_3`, `G3_6`, `G6_9`, `G9_12`, `GT12`
- Preserve legacy short `band` string on resource for existing screens and filters
- Link `gradeBandId` where mapping is deterministic

## 5.5 Business Roles

### Source columns

- `Role`
- leadership indicators from `L1 Manager`, `Practice Head`, `Project Manager`

### Target

- `BusinessRole`
- `ResourceBusinessRole`

### Seed rules

- Create one business role per normalized workbook role title
- Mark managerial roles with `canManage = true`
- Mark approval-capable roles only where an explicit approved mapping exists
- Assign the resource's primary business role from workbook `Role`
- Use role normalization table to collapse duplicates such as `Software Engineer`, `Engineer`, `Consultant`, `Technical Lead`

## 5.6 Departments and Teams

### Source columns

- `Practice`
- `Sub-practice`

### Target

- `Department`
- `Team`
- `TeamMember`
- `Resource.departmentId`

### Seed rules

- Map `Practice` to `Department`
- Map `Sub-practice` to `Team` within that department
- Create one primary team membership per resource where `Sub-practice` exists
- Set department head from resolved `Practice Head` where possible
- Do not fabricate deep org hierarchy beyond what source data can support

## 5.7 Skills and Resource Skills

### Source columns

- `Primary Skill`
- `Skill`

### Target

- `Skill`
- `ResourceSkill`

### Seed rules

- Create a skill catalog from distinct normalized skill names
- Assign `Primary Skill` as primary high-confidence resource skill
- Assign secondary `Skill` value where distinct from primary skill
- Default proficiency to `INTERMEDIATE` unless a separate rule is approved
- Avoid over-claiming certifications or years of experience where workbook does not provide explicit values

## 5.8 Resources

### Source columns

- `Emp Id`
- `Full Name`
- `email ID`
- `FTE/ Consultant`
- `Role`
- `Practice`
- `Location`
- `DOJ`
- `Active`
- `Experience Range`
- optional phone fields if present in workbook

### Target

- `Resource`

### Seed rules

- One resource per unique employee ID
- Split full name into first and last name deterministically
- Generate unique fallback email if source email is missing or duplicated
- Map `FTE/ Consultant` into `EmploymentType`
- Map `Active` into `ResourceStatus`
- Set capacity to `100` unless another explicit source exists
- Link practice, location, department, team, manager, and grade band where available
- Populate `designation` from workbook `Role`
- Preserve both relational department/grade fields and legacy flat fields where needed for compatibility

## 5.9 Manager Hierarchy

### Source columns

- `L1 Manager`
- `Practice Head`
- `Project Manager`

### Target

- `Resource.managerId`
- `Practice.headId`
- `Project.managerId`
- optionally `Department.headId`
- optionally `Team.leadId`

### Seed rules

- Resolve named managers to existing seeded resources first
- Then perform case-insensitive normalization
- Then use approved fuzzy matching only if deterministic
- If still unresolved, create ghost manager resources only if the business accepts synthetic placeholders
- Preferred rule: ghost managers are allowed for hierarchy completeness but must be tagged in `customFields` as synthetic

## 5.10 Clients

### Source columns

- `Client`
- project sheet `Account`

### Target

- `Client`

### Seed rules

- Build one client catalog across both people-allocation and project sheets
- Generate unique client codes tenant-wide
- Set default status `ACTIVE`
- Apply tier only from approved mapping rules, not guesswork

## 5.11 Projects

### Source columns

- project sheet: `Project ID`, `Project name`, `Account`, `Revenue Type (...)`, `Project Type (...)`, `Status`, `Status2`, `Project start Date`, `Project SOW End Date`
- allocation sheet fallback: `Project Code`, `Project`, `Client`, `Project type`, `Project Status`, `Start Date`, `End Date`

### Target

- `Project`

### Seed rules

- Seed canonical projects from project master sheet first
- Create fallback projects from allocation sheet only where code exists and project master does not contain them
- Map client relationship, billing type, project type, status, dates, and manager where available
- Normalize project status to platform enum using explicit mapping rules
- Preserve ended and inactive projects; do not seed only active work

## 5.12 Allocations

### Source columns

- `Emp Id`
- `Project Code`
- `Role`
- `Start Date`
- `End Date`
- `Allocation%`
- `Billable`
- `Status`
- optionally `Utilised (Y/N)`

### Target

- `Allocation`

### Seed rules

- One allocation record per distinct resource-project-start-end-percentage combination
- Parse Excel serial dates and text dates safely
- Map percentage as integer capped at `100`
- Status assignment must be date-aware:
  - ended allocations -> `COMPLETED`
  - future allocations -> `CONFIRMED`
  - current allocations on active resources -> `ACTIVE`
  - allocations for inactive resources -> never `ACTIVE`
- Preserve historical allocations for trend, rolloff, and utilization history

## 5.13 User Accounts and Invitations

### Source columns

- `email ID`
- resource identity fields
- role inference from workbook title only if approved

### Target

- `User`
- `UserRole`
- `UserInvitation`

### Seed rules

- This is optional, not part of the mandatory operational seed
- Preferred first pass: create invitations only for selected active employees
- If users are auto-created, assign only safe default system roles using approved mapping
- Do not infer high-privilege access directly from workbook titles without explicit approval

## 6. Execution Sequence

1. Validate workbook readability and sheet names
2. Create or reuse tenant baseline
3. Clear previously imported tenant-scoped operational seed data in dependency order
4. Seed practices
5. Seed locations
6. Seed grade bands
7. Seed business roles
8. Seed departments
9. Seed teams
10. Seed clients
11. Seed skills
12. Seed projects from project master
13. Seed resources
14. Seed synthetic managers only where necessary
15. Link managers, practice heads, department heads, team leads, and project managers
16. Seed team memberships
17. Seed resource-skill assignments
18. Seed allocations with historical preservation
19. Optionally create user invitations or accounts
20. Run post-seed verification queries and dashboard validation

## 7. Idempotency Rules

The seed must be rerunnable.

### Natural keys

- Practice: normalized practice name or generated code
- Location: normalized location name or generated code
- GradeBand: code
- BusinessRole: normalized code
- Department: tenant + code
- Team: tenant + code
- Skill: tenant + normalized name
- Resource: tenant + employee ID
- Client: tenant + code
- Project: tenant + project code
- Allocation: tenant + resource + project + start + end + percentage

### Update strategy

- Reuse existing rows where natural key matches
- Update mutable attributes when source has changed
- Hard-delete imported operational seed data only if a full rebuild mode is explicitly chosen
- Never delete manually managed governance data as part of workbook sync

## 8. Transformation Rules

### Dates

- support Excel serial dates
- support text dates like `20-Jun-23`
- reject implausible years

### Strings

- trim whitespace
- normalize repeated spaces
- preserve display names while using normalized comparison keys for matching

### Emails

- lowercase
- de-duplicate per tenant using deterministic suffixes

### Codes

- generate tenant-unique codes capped to schema length
- preserve original project codes and employee IDs where present

### Status normalization

- workbook labels must map through explicit lookup tables
- avoid loose assumptions outside approved mappings

## 9. Validation Checklist

### Entity counts

- practices count matches workbook distinct practice count
- locations count matches workbook distinct location count
- clients count matches merged client/account distinct count
- resources count matches distinct employee count plus any approved ghost managers
- projects count matches project master plus approved fallback creations
- allocations count matches deduped workbook rows

### Relationship checks

- every seeded allocation resolves to an existing resource and project
- every active project with staffing has at least one allocation
- every resolvable manager name links to a resource
- department-team-resource mappings are internally consistent

### Dashboard checks

- active resources
- active allocations
- active projects
- bench count
- billable utilization
- non-billable utilization
- headline utilization

### Data quality checks

- duplicate emails handled
- duplicate codes handled
- inactive resources do not carry active allocations
- obviously corrupted dates rejected or logged

## 10. Cutover Strategy

### Phase 1

Seed the operational core:

- practices
- locations
- clients
- projects
- resources
- allocations

### Phase 2

Add organizational enrichment:

- grade bands
- business roles
- departments
- teams
- team memberships
- resource skills

### Phase 3

Optional identity layer:

- user invitations
- selected user accounts

This phased rollout reduces risk while making the platform useful immediately after Phase 1.

## 11. Recommended Acceptance Criteria

The seed is acceptable when:

1. Dashboard utilization is credible relative to workbook allocations
2. Resource directory matches workbook headcount and status
3. Project list matches project master plus approved fallback projects
4. Bench view identifies genuinely unallocated active resources
5. Manager relationships are mostly resolved and remaining synthetic placeholders are explicitly tracked
6. Onboarding organization screens show departments, teams, grade bands, and roles without empty-state blockers

## 12. Decision Log Needed Before Implementation

The following decisions should be confirmed before executing this plan:

1. Are ghost manager resources acceptable, or should unresolved managers remain null?
2. Should `Practice` map to `Department`, or should practices remain separate from departments?
3. Should `Sub-practice` map to `Team`?
4. Should workbook role titles become business roles directly, or be normalized through a curated mapping table?
5. Should user accounts be created automatically, or only invitations?
6. Is this a destructive full rebuild for imported operational data, or an incremental sync?

## 13. Best-Scope Recommendation

The recommended implementation scope for the first real workbook-driven seed is:

- tenant baseline
- practices
- locations
- grade bands
- business roles
- departments from practice
- teams from sub-practice
- skills and resource skills
- resources with manager hierarchy
- clients
- projects
- allocations
- optional user invitations only

This scope gives the current platform the best balance of fidelity, usability, and safety without overreaching into governance or access-control assumptions.
