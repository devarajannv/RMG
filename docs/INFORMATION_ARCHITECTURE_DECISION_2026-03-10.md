# Tenant App Information Architecture Decision

Date: 2026-03-10  
Status: Approved and implemented in frontend  
Scope: Tenant application navigation, settings scope, tenant-admin information architecture

---

## 1. Decision Summary

The tenant application will separate navigation by **scope of responsibility**, not by generic labels.

Approved tenant-app sidebar structure:

- Dashboard
- Daily Work
- Resource Management
- Business
- Intelligence
- My Settings
- Organization Admin

This replaces the ambiguous split where tenant-wide admin capabilities were divided between sidebar `Administration` and a broad `Settings` page.

---

## 2. Scope Model

### 2.1 My Settings
Personal, user-scoped controls only:

- Profile
- Notifications
- Display
- Security

### 2.2 Organization Admin
Tenant-wide administrative controls for a specific customer tenant only:

- Onboarding
- Users
- Roles
- Functions
- Request Types
- Workflows
- Currency
- Integrations
- Organization
- Audit Logs
- Data Management

### 2.3 Platform-Global Scope
Anything cross-tenant or platform-global remains outside the tenant app and belongs in the Platform Portal.

---

## 3. Core Rationale

The current tenant app mixes three scopes inside one settings surface:

1. Personal preferences
2. Tenant-wide administration
3. Workflow governance/configuration

This makes `Administration` and `Settings` overlap semantically and weakens discoverability.

The approved model fixes that by making scope explicit:

- `My Settings` = me
- `Organization Admin` = my tenant
- `Platform Portal` = all tenants / NewVision internal operations

---

## 4. Workflow Domain Decision

Workflow-related capabilities must be kept together under tenant administration.

### 4.1 Keep Adjacent
- Request Types
- Workflows

### 4.2 Merge Into Workflow Area
The current tenant-wide `Workflow Settings` concept should not remain a separate admin/settings destination.
Its contents should be absorbed into the workflow domain, for example as subsections under `Organization Admin > Workflows`:

- Templates
- SLA rules
- Escalation rules
- Default workflow policies

### 4.3 Why
`Request Types` defines **what** can be requested.  
`Workflows` defines **how** those requests are governed and approved.

They are distinct, but part of the same administrative domain.

---

## 5. Route / Surface Recommendation

### 5.1 Personal Settings
Retain `/settings` as the personal settings surface, or relabel it as `My Settings` in navigation.

Recommended contents:

- Profile
- Notifications
- Display
- Security

### 5.2 Organization Admin
Prefer dedicated admin routes instead of one oversized settings page.

Recommended route model:

- `/admin/onboarding`
- `/admin/users`
- `/admin/roles`
- `/admin/functions`
- `/admin/request-types`
- `/admin/workflows`
- `/admin/currency`
- `/admin/integrations`
- `/admin/organization`
- `/admin/audit`
- `/admin/data-management`

---

## 6. Current-to-Target Mapping

### 6.1 Remain in Personal Settings
- Profile
- Notifications
- Display
- Security

### 6.2 Move from Current Settings to Organization Admin
- Users
- Roles
- Functions
- Request Types
- Currency
- Integrations
- Organization
- Audit Logs

### 6.3 Already Tenant-Admin, Keep Under Organization Admin
- Onboarding
- Data Management
- Workflows

---

## 7. Implementation Status

The approved structure is now implemented in the tenant frontend with these route surfaces:

- `/settings` → personal-only settings
- `/admin/onboarding`
- `/admin/users`
- `/admin/roles`
- `/admin/functions`
- `/admin/request-types`
- `/admin/workflows`
- `/admin/currency`
- `/admin/integrations`
- `/admin/organization`
- `/admin/audit`
- `/admin/data-management`

The implementation uses dedicated Organization Admin route pages rather than a single mixed admin/settings wrapper.

## 8. Documentation Implications

The following documentation must treat this as the current approved IA direction until implementation is complete:

- `ARCHITECTURE.md` — source-of-truth product structure
- `ALIGNMENT_TRACKER.md` — current drift vs approved target state
- `docs/IMPLEMENTATION_PLAN_REQUEST_WORKFLOW_SYSTEM_2026-01-20_1730.md` — supersede old `Settings > Requests` navigation assumption
- `docs/IMPLEMENTATION_PLAN_TENANT_APP_INFORMATION_ARCHITECTURE_2026-03-10.md` — frontend execution blueprint for the approved IA

User-facing guides should not be rewritten to the new structure until the UI implementation is actually shipped.

---

## 9. Implementation Sequence

1. Rename sidebar `Settings` to `My Settings`
2. Rename sidebar `Administration` to `Organization Admin`
3. Remove tenant-wide admin tabs from personal settings
4. Move workflow-related admin controls into the workflow area
5. Break oversized settings/admin surfaces into dedicated tenant-admin routes

---

## 10. Success Criteria

The IA change is complete when:

- Users can distinguish personal settings from tenant administration without explanation
- No tenant-wide admin functionality remains hidden under personal settings
- Workflow governance is no longer split between multiple admin/settings destinations
- The tenant app contains no ambiguous “global” terminology for cross-tenant behavior
