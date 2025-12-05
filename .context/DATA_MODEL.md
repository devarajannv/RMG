# Data Model & Entity Specifications

> **Version:** 1.0  
> **Last Updated:** 2025-12-06T00:00:00Z  
> **Status:** APPROVED  
> **Owner:** Tech Lead

---

## Overview

This document defines all data entities, their relationships, field specifications, and validation rules for RMGaaS. **Any AI assistant or developer MUST reference this document when working with data.**

---

## Entity Relationship Diagram (Conceptual)

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   TENANT    │       │    USER     │       │    ROLE     │
│ (Organization)│◄────┤  (Login)    │───────┤ (Permission)│
└──────┬──────┘       └──────┬──────┘       └─────────────┘
       │                     │
       │    ┌────────────────┼────────────────┐
       │    │                │                │
       ▼    ▼                ▼                ▼
┌─────────────┐       ┌─────────────┐  ┌─────────────┐
│  RESOURCE   │◄──────┤ ALLOCATION  │──┤  PROJECT    │
│ (Employee)  │       │ (Assignment)│  │  (Work)     │
└──────┬──────┘       └─────────────┘  └──────┬──────┘
       │                                      │
       │    ┌─────────────────────────────────┘
       │    │
       ▼    ▼
┌─────────────┐       ┌─────────────┐
│   SKILL     │       │   CLIENT    │
│ (Competency)│       │ (Customer)  │
└─────────────┘       └─────────────┘
```

---

## Core Entities

### 1. TENANT (Organization)

The top-level entity representing a customer organization in the multi-tenant system.

```
┌────────────────────────────────────────────────────────────────────────┐
│ TENANT                                                                 │
├────────────────────────────────────────────────────────────────────────┤
│ PK  id            UUID        NOT NULL  Auto-generated                 │
│     name          VARCHAR(200) NOT NULL  Organization name             │
│     slug          VARCHAR(100) NOT NULL  URL-safe identifier (unique)  │
│     tier          ENUM        NOT NULL  'free','pro','enterprise'      │
│     status        ENUM        NOT NULL  'active','suspended','trial'   │
│     settings      JSONB       NULL      Tenant-specific config         │
│     logoUrl       VARCHAR(500) NULL     Logo URL                       │
│     primaryColor  VARCHAR(7)  NULL      Hex color code                 │
│     timezone      VARCHAR(50) NOT NULL  Default: 'Asia/Kolkata'        │
│     currency      VARCHAR(3)  NOT NULL  Default: 'INR'                 │
│     fiscalYearStart INT       NOT NULL  Month (1-12), Default: 4       │
│     createdAt     TIMESTAMP   NOT NULL  Auto-generated                 │
│     updatedAt     TIMESTAMP   NOT NULL  Auto-updated                   │
│     deletedAt     TIMESTAMP   NULL      Soft delete                    │
└────────────────────────────────────────────────────────────────────────┘

INDEXES:
  - UNIQUE (slug)
  - INDEX (status)
  - INDEX (tier)

RLS POLICY:
  - All queries filtered by tenant_id from JWT
```

**Settings JSONB Structure:**
```json
{
  "features": {
    "skillMatrix": true,
    "clientPortal": false,
    "aiRecommendations": false
  },
  "defaults": {
    "allocationUnit": "percentage",
    "workingHoursPerDay": 8,
    "workingDaysPerWeek": 5
  },
  "notifications": {
    "emailEnabled": true,
    "slackEnabled": false,
    "slackWebhookUrl": null
  }
}
```

---

### 2. USER (System User)

Users who can log into the system. One resource may or may not have a user account.

```
┌────────────────────────────────────────────────────────────────────────┐
│ USER                                                                   │
├────────────────────────────────────────────────────────────────────────┤
│ PK  id            UUID        NOT NULL  Auto-generated                 │
│ FK  tenantId      UUID        NOT NULL  → TENANT.id                    │
│ FK  resourceId    UUID        NULL      → RESOURCE.id (if employee)    │
│     email         VARCHAR(255) NOT NULL  Login email (unique per tenant)│
│     passwordHash  VARCHAR(255) NOT NULL  Argon2 hash                   │
│     firstName     VARCHAR(100) NOT NULL                                │
│     lastName      VARCHAR(100) NOT NULL                                │
│     status        ENUM        NOT NULL  'active','inactive','locked'   │
│     emailVerified BOOLEAN     NOT NULL  Default: false                 │
│     lastLoginAt   TIMESTAMP   NULL                                     │
│     failedLogins  INT         NOT NULL  Default: 0                     │
│     lockedUntil   TIMESTAMP   NULL      Account lockout                │
│     mfaEnabled    BOOLEAN     NOT NULL  Default: false                 │
│     mfaSecret     VARCHAR(100) NULL     TOTP secret                    │
│     preferences   JSONB       NULL      User preferences               │
│     createdAt     TIMESTAMP   NOT NULL                                 │
│     updatedAt     TIMESTAMP   NOT NULL                                 │
│     deletedAt     TIMESTAMP   NULL      Soft delete                    │
└────────────────────────────────────────────────────────────────────────┘

INDEXES:
  - UNIQUE (tenantId, email)
  - INDEX (tenantId, status)
  - FK INDEX (resourceId)

CONSTRAINTS:
  - email must be valid email format
  - failedLogins >= 0
```

**Preferences JSONB Structure:**
```json
{
  "theme": "light",
  "language": "en",
  "dashboardLayout": "default",
  "notificationPrefs": {
    "email": true,
    "inApp": true,
    "digest": "daily"
  }
}
```

---

### 3. ROLE & PERMISSION

Role-based access control system.

```
┌────────────────────────────────────────────────────────────────────────┐
│ ROLE                                                                   │
├────────────────────────────────────────────────────────────────────────┤
│ PK  id            UUID        NOT NULL                                 │
│ FK  tenantId      UUID        NOT NULL  → TENANT.id                    │
│     name          VARCHAR(100) NOT NULL  Role name                     │
│     description   VARCHAR(500) NULL                                    │
│     isSystem      BOOLEAN     NOT NULL  Default: false (built-in)      │
│     permissions   JSONB       NOT NULL  Permission array               │
│     createdAt     TIMESTAMP   NOT NULL                                 │
│     updatedAt     TIMESTAMP   NOT NULL                                 │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ USER_ROLE (Junction Table)                                             │
├────────────────────────────────────────────────────────────────────────┤
│ PK  userId        UUID        NOT NULL  → USER.id                      │
│ PK  roleId        UUID        NOT NULL  → ROLE.id                      │
│     assignedAt    TIMESTAMP   NOT NULL                                 │
│     assignedBy    UUID        NOT NULL  → USER.id                      │
└────────────────────────────────────────────────────────────────────────┘
```

**System Roles (Pre-seeded):**
| Role | Permissions |
|------|-------------|
| Super Admin | `*` (all permissions) |
| Admin | `resources:*`, `projects:*`, `allocations:*`, `users:read`, `reports:*` |
| Resource Manager | `resources:read`, `allocations:*`, `projects:read`, `reports:read` |
| Project Manager | `projects:*`, `allocations:read`, `resources:read` |
| Employee | `resources:read:self`, `allocations:read:self` |
| Client | `projects:read:own`, `resources:read:allocated` |

**Permission Format:**
```
{resource}:{action}:{scope}

Resources: resources, projects, allocations, users, reports, settings
Actions: create, read, update, delete, * (all)
Scope: all (default), self, own, allocated
```

---

### 4. RESOURCE (Employee/Contractor)

The core entity - people who can be allocated to work.

```
┌────────────────────────────────────────────────────────────────────────┐
│ RESOURCE                                                               │
├────────────────────────────────────────────────────────────────────────┤
│ PK  id            UUID        NOT NULL                                 │
│ FK  tenantId      UUID        NOT NULL  → TENANT.id                    │
│ FK  practiceId    UUID        NULL      → PRACTICE.id                  │
│ FK  managerId     UUID        NULL      → RESOURCE.id (reporting mgr)  │
│ FK  locationId    UUID        NULL      → LOCATION.id                  │
│                                                                        │
│ -- Identity --                                                         │
│     employeeId    VARCHAR(50) NOT NULL  HR system ID (unique/tenant)   │
│     firstName     VARCHAR(100) NOT NULL                                │
│     lastName      VARCHAR(100) NOT NULL                                │
│     preferredName VARCHAR(100) NULL      Display name                  │
│     email         VARCHAR(255) NOT NULL  Work email                    │
│     phone         VARCHAR(20) NULL                                     │
│     photoUrl      VARCHAR(500) NULL                                    │
│                                                                        │
│ -- Employment --                                                       │
│     employmentType ENUM       NOT NULL  'fte','contractor','intern'    │
│     band          VARCHAR(10) NOT NULL  Grade/Level (B1-B5, etc.)      │
│     designation   VARCHAR(100) NOT NULL  Job title                     │
│     department    VARCHAR(100) NULL                                    │
│     dateOfJoining DATE        NOT NULL                                 │
│     dateOfExit    DATE        NULL                                     │
│     exitReason    VARCHAR(200) NULL                                    │
│                                                                        │
│ -- Capacity --                                                         │
│     capacity      INT         NOT NULL  Default: 100 (percentage)      │
│     costPerHour   DECIMAL(10,2) NULL    Internal cost rate             │
│     billRateDefault DECIMAL(10,2) NULL  Default billing rate           │
│                                                                        │
│ -- Status --                                                           │
│     status        ENUM        NOT NULL  'active','inactive','notice'   │
│     benchSince    DATE        NULL      When moved to bench            │
│     lastAllocatedAt DATE      NULL      Last allocation end date       │
│                                                                        │
│ -- Metadata --                                                         │
│     tags          TEXT[]      NULL      Custom tags                    │
│     customFields  JSONB       NULL      Tenant-defined fields          │
│     createdAt     TIMESTAMP   NOT NULL                                 │
│     updatedAt     TIMESTAMP   NOT NULL                                 │
│     deletedAt     TIMESTAMP   NULL                                     │
└────────────────────────────────────────────────────────────────────────┘

INDEXES:
  - UNIQUE (tenantId, employeeId)
  - UNIQUE (tenantId, email)
  - INDEX (tenantId, status)
  - INDEX (tenantId, practiceId)
  - INDEX (tenantId, band)
  - INDEX (tenantId, benchSince) WHERE benchSince IS NOT NULL
  - GIN INDEX (tags)
  - GIN INDEX (customFields)

COMPUTED FIELDS (Virtual):
  - fullName = firstName + ' ' + lastName
  - displayName = preferredName OR fullName
  - isOnBench = (benchSince IS NOT NULL AND status = 'active')
  - benchDays = CURRENT_DATE - benchSince
  - tenure = CURRENT_DATE - dateOfJoining
```

---

### 5. SKILL & RESOURCE_SKILL

Skills and competencies that resources possess.

```
┌────────────────────────────────────────────────────────────────────────┐
│ SKILL                                                                  │
├────────────────────────────────────────────────────────────────────────┤
│ PK  id            UUID        NOT NULL                                 │
│ FK  tenantId      UUID        NOT NULL  → TENANT.id                    │
│ FK  categoryId    UUID        NULL      → SKILL_CATEGORY.id            │
│     name          VARCHAR(100) NOT NULL  Skill name                    │
│     description   VARCHAR(500) NULL                                    │
│     isVerifiable  BOOLEAN     NOT NULL  Default: false                 │
│     status        ENUM        NOT NULL  'active','deprecated'          │
│     createdAt     TIMESTAMP   NOT NULL                                 │
│     updatedAt     TIMESTAMP   NOT NULL                                 │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ SKILL_CATEGORY                                                         │
├────────────────────────────────────────────────────────────────────────┤
│ PK  id            UUID        NOT NULL                                 │
│ FK  tenantId      UUID        NOT NULL  → TENANT.id                    │
│     name          VARCHAR(100) NOT NULL  e.g., 'Programming', 'Cloud'  │
│     color         VARCHAR(7)  NULL      Hex color for UI               │
│     sortOrder     INT         NOT NULL  Display order                  │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ RESOURCE_SKILL (Junction)                                              │
├────────────────────────────────────────────────────────────────────────┤
│ PK  resourceId    UUID        NOT NULL  → RESOURCE.id                  │
│ PK  skillId       UUID        NOT NULL  → SKILL.id                     │
│     proficiency   ENUM        NOT NULL  'beginner','intermediate',     │
│                                         'advanced','expert'            │
│     yearsExp      DECIMAL(3,1) NULL     Years of experience            │
│     lastUsed      DATE        NULL      Last project using skill       │
│     certified     BOOLEAN     NOT NULL  Default: false                 │
│     certExpiry    DATE        NULL      Certification expiry           │
│     verifiedBy    UUID        NULL      → USER.id                      │
│     verifiedAt    TIMESTAMP   NULL                                     │
│     notes         VARCHAR(500) NULL                                    │
│     updatedAt     TIMESTAMP   NOT NULL                                 │
└────────────────────────────────────────────────────────────────────────┘

INDEXES:
  - UNIQUE (tenantId, name) on SKILL
  - INDEX (resourceId, proficiency) on RESOURCE_SKILL
  - INDEX (skillId) on RESOURCE_SKILL
```

**Proficiency Levels:**
| Level | Score | Definition |
|-------|-------|------------|
| Beginner | 1 | Learning, needs supervision |
| Intermediate | 2 | Can work independently on simple tasks |
| Advanced | 3 | Can handle complex tasks, mentor others |
| Expert | 4 | Deep expertise, can architect solutions |

---

### 6. CLIENT

External organizations that contract for services.

```
┌────────────────────────────────────────────────────────────────────────┐
│ CLIENT                                                                 │
├────────────────────────────────────────────────────────────────────────┤
│ PK  id            UUID        NOT NULL                                 │
│ FK  tenantId      UUID        NOT NULL  → TENANT.id                    │
│     name          VARCHAR(200) NOT NULL  Client organization name      │
│     code          VARCHAR(20) NOT NULL  Short code (unique/tenant)     │
│     industry      VARCHAR(100) NULL                                    │
│     website       VARCHAR(255) NULL                                    │
│     logoUrl       VARCHAR(500) NULL                                    │
│     status        ENUM        NOT NULL  'active','inactive','prospect' │
│     tier          ENUM        NULL      'strategic','key','standard'   │
│     billingAddress JSONB      NULL      Address object                 │
│     contacts      JSONB       NULL      Array of contact objects       │
│     notes         TEXT        NULL                                     │
│     customFields  JSONB       NULL                                     │
│     createdAt     TIMESTAMP   NOT NULL                                 │
│     updatedAt     TIMESTAMP   NOT NULL                                 │
│     deletedAt     TIMESTAMP   NULL                                     │
└────────────────────────────────────────────────────────────────────────┘

INDEXES:
  - UNIQUE (tenantId, code)
  - INDEX (tenantId, status)
  - INDEX (tenantId, tier)
```

**Contacts JSONB Structure:**
```json
[
  {
    "name": "John Doe",
    "title": "VP Engineering",
    "email": "john@client.com",
    "phone": "+1-555-0100",
    "isPrimary": true
  }
]
```

---

### 7. PROJECT

Work engagements that resources are allocated to.

```
┌────────────────────────────────────────────────────────────────────────┐
│ PROJECT                                                                │
├────────────────────────────────────────────────────────────────────────┤
│ PK  id            UUID        NOT NULL                                 │
│ FK  tenantId      UUID        NOT NULL  → TENANT.id                    │
│ FK  clientId      UUID        NULL      → CLIENT.id (NULL = internal)  │
│ FK  managerId     UUID        NULL      → RESOURCE.id (Project Manager)│
│ FK  practiceId    UUID        NULL      → PRACTICE.id                  │
│                                                                        │
│ -- Identity --                                                         │
│     code          VARCHAR(50) NOT NULL  Project code (unique/tenant)   │
│     name          VARCHAR(200) NOT NULL                                │
│     description   TEXT        NULL                                     │
│                                                                        │
│ -- Classification --                                                   │
│     type          ENUM        NOT NULL  'billable','internal',         │
│                                         'presales','support'           │
│     category      VARCHAR(100) NULL      Project category              │
│     deliveryModel ENUM        NULL      'onsite','offshore','hybrid'   │
│                                                                        │
│ -- Timeline --                                                         │
│     startDate     DATE        NOT NULL                                 │
│     endDate       DATE        NULL      NULL = ongoing                 │
│     actualEndDate DATE        NULL      When actually ended            │
│                                                                        │
│ -- Financials --                                                       │
│     budgetHours   INT         NULL      Total budgeted hours           │
│     budgetAmount  DECIMAL(15,2) NULL    Total budget value             │
│     billingType   ENUM        NULL      'tm','fixed','retainer'        │
│     defaultRate   DECIMAL(10,2) NULL    Default billing rate           │
│                                                                        │
│ -- Status --                                                           │
│     status        ENUM        NOT NULL  'pipeline','active',           │
│                                         'on_hold','completed','cancelled'│
│     healthStatus  ENUM        NULL      'green','amber','red'          │
│     priority      ENUM        NOT NULL  'low','medium','high','critical'│
│                                                                        │
│ -- Metadata --                                                         │
│     tags          TEXT[]      NULL                                     │
│     customFields  JSONB       NULL                                     │
│     externalRefs  JSONB       NULL      Links to Jira, ADO, etc.       │
│     createdAt     TIMESTAMP   NOT NULL                                 │
│     updatedAt     TIMESTAMP   NOT NULL                                 │
│     deletedAt     TIMESTAMP   NULL                                     │
└────────────────────────────────────────────────────────────────────────┘

INDEXES:
  - UNIQUE (tenantId, code)
  - INDEX (tenantId, status)
  - INDEX (tenantId, clientId)
  - INDEX (tenantId, type)
  - INDEX (tenantId, startDate, endDate)
```

**External Refs JSONB:**
```json
{
  "jira": {
    "projectKey": "PROJ",
    "url": "https://company.atlassian.net/projects/PROJ"
  },
  "ado": {
    "projectId": "12345",
    "url": "https://dev.azure.com/org/project"
  }
}
```

---

### 8. ALLOCATION

The assignment of a resource to a project for a time period.

```
┌────────────────────────────────────────────────────────────────────────┐
│ ALLOCATION                                                             │
├────────────────────────────────────────────────────────────────────────┤
│ PK  id            UUID        NOT NULL                                 │
│ FK  tenantId      UUID        NOT NULL  → TENANT.id                    │
│ FK  resourceId    UUID        NOT NULL  → RESOURCE.id                  │
│ FK  projectId     UUID        NOT NULL  → PROJECT.id                   │
│ FK  requestedBy   UUID        NULL      → USER.id                      │
│ FK  approvedBy    UUID        NULL      → USER.id                      │
│                                                                        │
│ -- Assignment --                                                       │
│     role          VARCHAR(100) NOT NULL  Role on project               │
│     percentage    INT         NOT NULL  Allocation % (1-100)           │
│     startDate     DATE        NOT NULL                                 │
│     endDate       DATE        NOT NULL                                 │
│     actualEndDate DATE        NULL      If ended early/late            │
│                                                                        │
│ -- Status --                                                           │
│     status        ENUM        NOT NULL  'proposed','confirmed',        │
│                                         'active','completed','cancelled'│
│     isBillable    BOOLEAN     NOT NULL  Default: true                  │
│     billRate      DECIMAL(10,2) NULL    Override rate for this alloc   │
│                                                                        │
│ -- Lifecycle --                                                        │
│     confirmedAt   TIMESTAMP   NULL                                     │
│     startedAt     TIMESTAMP   NULL      When status → active           │
│     completedAt   TIMESTAMP   NULL                                     │
│     cancelledAt   TIMESTAMP   NULL                                     │
│     cancelReason  VARCHAR(500) NULL                                    │
│                                                                        │
│ -- Metadata --                                                         │
│     notes         TEXT        NULL                                     │
│     customFields  JSONB       NULL                                     │
│     createdAt     TIMESTAMP   NOT NULL                                 │
│     updatedAt     TIMESTAMP   NOT NULL                                 │
│     deletedAt     TIMESTAMP   NULL                                     │
└────────────────────────────────────────────────────────────────────────┘

INDEXES:
  - INDEX (tenantId, resourceId, startDate, endDate)
  - INDEX (tenantId, projectId, startDate, endDate)
  - INDEX (tenantId, status)
  - INDEX (tenantId, endDate) WHERE status = 'active'  -- For rolloff queries

CONSTRAINTS:
  - percentage BETWEEN 1 AND 100
  - endDate >= startDate
  - No overlapping allocations > 100% per resource (enforced in app layer)

COMPUTED (Virtual):
  - durationDays = endDate - startDate + 1
  - daysRemaining = endDate - CURRENT_DATE
  - isRollingOff = (daysRemaining <= 14 AND status = 'active')
```

**Allocation Status Flow:**
```
proposed → confirmed → active → completed
    ↓          ↓         ↓
    └──────────┴─────────┴──→ cancelled
```

---

### 9. PRACTICE (Business Unit)

Organizational units grouping resources by skill domain.

```
┌────────────────────────────────────────────────────────────────────────┐
│ PRACTICE                                                               │
├────────────────────────────────────────────────────────────────────────┤
│ PK  id            UUID        NOT NULL                                 │
│ FK  tenantId      UUID        NOT NULL  → TENANT.id                    │
│ FK  headId        UUID        NULL      → RESOURCE.id (Practice Head)  │
│ FK  parentId      UUID        NULL      → PRACTICE.id (for hierarchy)  │
│     name          VARCHAR(100) NOT NULL                                │
│     code          VARCHAR(20) NOT NULL                                 │
│     description   VARCHAR(500) NULL                                    │
│     targetUtilization INT     NULL      Target % (e.g., 85)            │
│     costCenter    VARCHAR(50) NULL      Finance cost center code       │
│     status        ENUM        NOT NULL  'active','inactive'            │
│     createdAt     TIMESTAMP   NOT NULL                                 │
│     updatedAt     TIMESTAMP   NOT NULL                                 │
└────────────────────────────────────────────────────────────────────────┘

INDEXES:
  - UNIQUE (tenantId, code)
  - INDEX (tenantId, parentId)
```

---

### 10. LOCATION

Physical locations where resources are based.

```
┌────────────────────────────────────────────────────────────────────────┐
│ LOCATION                                                               │
├────────────────────────────────────────────────────────────────────────┤
│ PK  id            UUID        NOT NULL                                 │
│ FK  tenantId      UUID        NOT NULL  → TENANT.id                    │
│     name          VARCHAR(100) NOT NULL  e.g., "Bangalore Office"      │
│     code          VARCHAR(20) NOT NULL  e.g., "BLR"                    │
│     type          ENUM        NOT NULL  'office','remote','client_site'│
│     address       JSONB       NULL                                     │
│     timezone      VARCHAR(50) NOT NULL                                 │
│     country       VARCHAR(2)  NOT NULL  ISO country code               │
│     isOnshore     BOOLEAN     NOT NULL  Relative to client             │
│     status        ENUM        NOT NULL  'active','inactive'            │
│     createdAt     TIMESTAMP   NOT NULL                                 │
│     updatedAt     TIMESTAMP   NOT NULL                                 │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 11. AUDIT_LOG

Immutable audit trail for compliance.

```
┌────────────────────────────────────────────────────────────────────────┐
│ AUDIT_LOG                                                              │
├────────────────────────────────────────────────────────────────────────┤
│ PK  id            UUID        NOT NULL                                 │
│ FK  tenantId      UUID        NOT NULL  → TENANT.id                    │
│ FK  userId        UUID        NULL      → USER.id (NULL = system)      │
│     entityType    VARCHAR(50) NOT NULL  'resource','allocation', etc.  │
│     entityId      UUID        NOT NULL  ID of affected entity          │
│     action        ENUM        NOT NULL  'create','update','delete',    │
│                                         'login','logout','export'      │
│     changes       JSONB       NULL      {field: {old, new}}            │
│     metadata      JSONB       NULL      Request context, IP, etc.      │
│     timestamp     TIMESTAMP   NOT NULL  Default: NOW()                 │
└────────────────────────────────────────────────────────────────────────┘

INDEXES:
  - INDEX (tenantId, entityType, entityId)
  - INDEX (tenantId, userId)
  - INDEX (tenantId, timestamp)
  - INDEX (tenantId, action)

PARTITIONING:
  - Partition by timestamp (monthly) for performance
```

**Changes JSONB Example:**
```json
{
  "status": { "old": "active", "new": "completed" },
  "endDate": { "old": "2025-03-31", "new": "2025-02-28" }
}
```

---

## Entity State Machines

### Resource Status
```
         ┌────────┐
         │ active │◄───────────────┐
         └───┬────┘                │
             │                     │
     ┌───────┴───────┐      ┌─────┴─────┐
     ▼               ▼      │           │
┌────────┐     ┌─────────┐  │    rehire │
│ notice │────▶│ inactive│──┘           │
└────────┘     └─────────┘              │
                    │                   │
                    └───────────────────┘
```

### Allocation Status
```
┌──────────┐     ┌───────────┐     ┌────────┐     ┌───────────┐
│ proposed │────▶│ confirmed │────▶│ active │────▶│ completed │
└────┬─────┘     └─────┬─────┘     └───┬────┘     └───────────┘
     │                 │               │
     │                 │               │
     ▼                 ▼               ▼
┌───────────────────────────────────────┐
│              cancelled                 │
└───────────────────────────────────────┘
```

### Project Status
```
┌──────────┐     ┌────────┐     ┌───────────┐
│ pipeline │────▶│ active │────▶│ completed │
└────┬─────┘     └───┬────┘     └───────────┘
     │               │
     │          ┌────┴────┐
     │          ▼         │
     │     ┌─────────┐    │
     │     │ on_hold │────┘
     │     └────┬────┘
     │          │
     ▼          ▼
┌───────────────────┐
│    cancelled      │
└───────────────────┘
```

---

## Validation Rules

### Resource
| Field | Rule |
|-------|------|
| email | Valid email format, unique per tenant |
| employeeId | Alphanumeric, unique per tenant |
| band | Must match tenant's configured bands |
| capacity | 0-100, default 100 |
| dateOfJoining | Cannot be in future |
| dateOfExit | Must be >= dateOfJoining |

### Allocation
| Field | Rule |
|-------|------|
| percentage | 1-100 |
| startDate | Cannot be before project startDate |
| endDate | Cannot be after project endDate (if set) |
| Total allocation | Resource cannot exceed 100% on any given day |

### Project
| Field | Rule |
|-------|------|
| code | Alphanumeric + dash/underscore, 3-50 chars |
| startDate | Required |
| endDate | Must be >= startDate (if set) |
| budgetHours | Must be positive (if set) |

---

## Soft Delete Policy

All major entities support soft delete via `deletedAt` timestamp.

**Query Pattern:**
```sql
-- Default: Exclude deleted
WHERE deleted_at IS NULL

-- Include deleted (admin/audit view)
WHERE (deleted_at IS NULL OR include_deleted = true)
```

**Hard Delete:** Only via data retention policy (configurable, default 7 years).

---

## Multi-Tenant Query Pattern

All queries MUST include tenant filter:

```typescript
// Prisma middleware automatically adds
async function tenantMiddleware(params, next) {
  const tenantId = getCurrentTenantId(); // From request context
  
  if (params.action === 'findMany' || params.action === 'findFirst') {
    params.args.where = {
      ...params.args.where,
      tenantId
    };
  }
  
  return next(params);
}
```

---

*Last Updated: 2025-12-06T00:00:00Z*
*Version: 1.0*
