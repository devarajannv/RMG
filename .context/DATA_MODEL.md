# Data Model & Entity Specifications

> **Version:** 2.0  
> **Last Updated:** 2025-12-15  
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
       │                    │                 │
       │    ┌───────────────┘                 │
       │    │                                 │
       ▼    ▼                                 ▼
┌─────────────┐       ┌─────────────┐  ┌─────────────┐
│  TIMESHEET  │       │  CONTRACT   │──┤   CLIENT    │
│  (Hours)    │       │  (SOW/MSA)  │  │ (Customer)  │
└─────────────┘       └─────────────┘  └─────────────┘
       
┌─────────────┐
│   SKILL     │
│ (Competency)│
└─────────────┘
```

### Key Hierarchy
```
CLIENT (Customer)
  └── CONTRACT (MSA/SOW - legal agreement)
        └── PROJECT (work engagement)
              └── ALLOCATION (resource assignment)
                    └── TIMESHEET_ENTRY (hours logged)
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

### 7. CONTRACT (SOW/MSA)

Legal agreements with clients that govern projects.

```
┌────────────────────────────────────────────────────────────────────────┐
│ CONTRACT                                                               │
├────────────────────────────────────────────────────────────────────────┤
│ PK  id            UUID        NOT NULL                                 │
│ FK  tenantId      UUID        NOT NULL  → TENANT.id                    │
│ FK  clientId      UUID        NOT NULL  → CLIENT.id                    │
│ FK  accountMgrId  UUID        NULL      → RESOURCE.id (Account Mgr)    │
│                                                                        │
│ -- Identity --                                                         │
│     contractNumber VARCHAR(50) NOT NULL  Contract ID (unique/tenant)   │
│     name          VARCHAR(200) NOT NULL  Contract name                 │
│     type          ENUM        NOT NULL  'msa','sow','amendment',       │
│                                         'nda','other'                  │
│     description   TEXT        NULL                                     │
│                                                                        │
│ -- Timeline --                                                         │
│     startDate     DATE        NOT NULL  Contract start                 │
│     endDate       DATE        NULL      Contract end (NULL = ongoing)  │
│     signedDate    DATE        NULL      When signed                    │
│                                                                        │
│ -- Financials --                                                       │
│     value         DECIMAL(15,2) NULL    Total contract value           │
│     currency      VARCHAR(3)  NOT NULL  Default: tenant currency       │
│     billingType   ENUM        NOT NULL  'tm','fixed','retainer',       │
│                                         'milestone','hybrid'           │
│     paymentTerms  VARCHAR(50) NULL      e.g., "Net 30"                 │
│                                                                        │
│ -- Status --                                                           │
│     status        ENUM        NOT NULL  'draft','pending_approval',    │
│                                         'active','expired',            │
│                                         'terminated','renewed'         │
│     renewalDate   DATE        NULL      When up for renewal            │
│     autoRenew     BOOLEAN     NOT NULL  Default: false                 │
│                                                                        │
│ -- Documents --                                                        │
│     documentUrl   VARCHAR(500) NULL     Link to signed document        │
│     attachments   JSONB       NULL      Array of attachment refs       │
│                                                                        │
│ -- Metadata --                                                         │
│     notes         TEXT        NULL                                     │
│     customFields  JSONB       NULL                                     │
│     externalRefs  JSONB       NULL      HubSpot deal ID, etc.          │
│     createdAt     TIMESTAMP   NOT NULL                                 │
│     updatedAt     TIMESTAMP   NOT NULL                                 │
│     deletedAt     TIMESTAMP   NULL                                     │
└────────────────────────────────────────────────────────────────────────┘

INDEXES:
  - UNIQUE (tenantId, contractNumber)
  - INDEX (tenantId, clientId)
  - INDEX (tenantId, status)
  - INDEX (tenantId, endDate) WHERE status = 'active'  -- For renewal alerts
  - INDEX (tenantId, renewalDate)
```

**Contract Status Flow:**
```
draft → pending_approval → active → expired
    ↓                        ↓         ↓
    └────────────────────────┴─→ terminated
                             ↓
                          renewed → active (new contract)
```

**External Refs JSONB:**
```json
{
  "hubspot": {
    "dealId": "12345",
    "url": "https://app.hubspot.com/deals/12345"
  },
  "docusign": {
    "envelopeId": "abc123"
  }
}
```

---

### 8. PROJECT

Work engagements that resources are allocated to. **Projects belong to Contracts.**

```
┌────────────────────────────────────────────────────────────────────────┐
│ PROJECT                                                                │
├────────────────────────────────────────────────────────────────────────┤
│ PK  id            UUID        NOT NULL                                 │
│ FK  tenantId      UUID        NOT NULL  → TENANT.id                    │
│ FK  clientId      UUID        NULL      → CLIENT.id (NULL = internal)  │
│ FK  contractId    UUID        NULL      → CONTRACT.id (NULL = internal)│
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

### 13. TIMESHEET_ENTRY

Time logged by resources against projects/allocations.

```
┌────────────────────────────────────────────────────────────────────────┐
│ TIMESHEET_ENTRY                                                        │
├────────────────────────────────────────────────────────────────────────┤
│ PK  id            UUID        NOT NULL                                 │
│ FK  tenantId      UUID        NOT NULL  → TENANT.id                    │
│ FK  resourceId    UUID        NOT NULL  → RESOURCE.id                  │
│ FK  projectId     UUID        NOT NULL  → PROJECT.id                   │
│ FK  allocationId  UUID        NULL      → ALLOCATION.id                │
│ FK  approvedBy    UUID        NULL      → USER.id                      │
│                                                                        │
│ -- Time Entry --                                                       │
│     date          DATE        NOT NULL  Date of work                   │
│     hours         DECIMAL(4,2) NOT NULL Hours worked (0.25-24)         │
│     taskType      VARCHAR(100) NULL     Category of work               │
│     description   TEXT        NULL      What was done                  │
│                                                                        │
│ -- Classification --                                                   │
│     isBillable    BOOLEAN     NOT NULL  Default: true                  │
│     isOvertime    BOOLEAN     NOT NULL  Default: false                 │
│     billRate      DECIMAL(10,2) NULL    Rate for this entry            │
│                                                                        │
│ -- Status --                                                           │
│     status        ENUM        NOT NULL  'draft','submitted',           │
│                                         'approved','rejected',         │
│                                         'invoiced'                     │
│     submittedAt   TIMESTAMP   NULL                                     │
│     approvedAt    TIMESTAMP   NULL                                     │
│     rejectedAt    TIMESTAMP   NULL                                     │
│     rejectionReason VARCHAR(500) NULL                                  │
│                                                                        │
│ -- Metadata --                                                         │
│     tags          TEXT[]      NULL                                     │
│     customFields  JSONB       NULL                                     │
│     createdAt     TIMESTAMP   NOT NULL                                 │
│     updatedAt     TIMESTAMP   NOT NULL                                 │
│     deletedAt     TIMESTAMP   NULL                                     │
└────────────────────────────────────────────────────────────────────────┘

INDEXES:
  - INDEX (tenantId, resourceId, date)
  - INDEX (tenantId, projectId, date)
  - INDEX (tenantId, status, date)
  - INDEX (tenantId, date) WHERE status = 'submitted'  -- For approval queue
  - UNIQUE (tenantId, resourceId, projectId, date, taskType)  -- Prevent duplicates

CONSTRAINTS:
  - hours BETWEEN 0.25 AND 24
  - date cannot be more than 7 days in future
  - Total hours per resource per day <= 24
```

**Timesheet Status Flow:**
```
draft → submitted → approved → invoiced
           ↓
        rejected → draft (can resubmit)
```

---

### 14. TIMESHEET_PERIOD

Aggregation of timesheet entries for approval periods.

```
┌────────────────────────────────────────────────────────────────────────┐
│ TIMESHEET_PERIOD                                                       │
├────────────────────────────────────────────────────────────────────────┤
│ PK  id            UUID        NOT NULL                                 │
│ FK  tenantId      UUID        NOT NULL  → TENANT.id                    │
│ FK  resourceId    UUID        NOT NULL  → RESOURCE.id                  │
│ FK  approvedBy    UUID        NULL      → USER.id                      │
│                                                                        │
│ -- Period --                                                           │
│     periodStart   DATE        NOT NULL  Period start (e.g., Monday)    │
│     periodEnd     DATE        NOT NULL  Period end (e.g., Sunday)      │
│     periodType    ENUM        NOT NULL  'weekly','biweekly','monthly'  │
│                                                                        │
│ -- Aggregates --                                                       │
│     totalHours    DECIMAL(5,2) NOT NULL Calculated from entries        │
│     billableHours DECIMAL(5,2) NOT NULL Billable portion               │
│     overtimeHours DECIMAL(5,2) NOT NULL Overtime portion               │
│                                                                        │
│ -- Status --                                                           │
│     status        ENUM        NOT NULL  'open','submitted',            │
│                                         'approved','rejected'          │
│     submittedAt   TIMESTAMP   NULL                                     │
│     approvedAt    TIMESTAMP   NULL                                     │
│     rejectedAt    TIMESTAMP   NULL                                     │
│     comments      TEXT        NULL                                     │
│                                                                        │
│     createdAt     TIMESTAMP   NOT NULL                                 │
│     updatedAt     TIMESTAMP   NOT NULL                                 │
└────────────────────────────────────────────────────────────────────────┘

INDEXES:
  - UNIQUE (tenantId, resourceId, periodStart, periodEnd)
  - INDEX (tenantId, status)
  - INDEX (tenantId, periodEnd)
```

---

### 15. OPPORTUNITY (Pipeline/Deals)

Sales opportunities synced from CRM (HubSpot) for demand forecasting.

```
┌────────────────────────────────────────────────────────────────────────┐
│ OPPORTUNITY                                                            │
├────────────────────────────────────────────────────────────────────────┤
│ PK  id            UUID        NOT NULL                                 │
│ FK  tenantId      UUID        NOT NULL  → TENANT.id                    │
│ FK  clientId      UUID        NULL      → CLIENT.id                    │
│ FK  ownerId       UUID        NULL      → RESOURCE.id (Sales owner)    │
│                                                                        │
│ -- Identity --                                                         │
│     externalId    VARCHAR(100) NOT NULL  CRM ID (unique/tenant)        │
│     name          VARCHAR(200) NOT NULL  Opportunity name              │
│     description   TEXT        NULL                                     │
│                                                                        │
│ -- Pipeline --                                                         │
│     stage         VARCHAR(50) NOT NULL  Pipeline stage                 │
│     probability   INT         NULL      Win probability % (0-100)      │
│     expectedCloseDate DATE    NULL                                     │
│                                                                        │
│ -- Value --                                                            │
│     dealValue     DECIMAL(15,2) NULL    Total deal value               │
│     currency      VARCHAR(3)  NOT NULL  Default: tenant currency       │
│                                                                        │
│ -- Resource Needs --                                                   │
│     estimatedHeadcount INT    NULL      Resources needed               │
│     requiredSkills JSONB      NULL      Skills needed for this deal    │
│     estimatedStart DATE       NULL      When work would start          │
│     estimatedDuration INT     NULL      Duration in months             │
│                                                                        │
│ -- Status --                                                           │
│     status        ENUM        NOT NULL  'open','won','lost','stalled'  │
│     wonDate       DATE        NULL                                     │
│     lostDate      DATE        NULL                                     │
│     lostReason    VARCHAR(200) NULL                                    │
│                                                                        │
│ -- Sync --                                                             │
│     source        VARCHAR(50) NOT NULL  'hubspot','salesforce','manual'│
│     lastSyncedAt  TIMESTAMP   NULL                                     │
│     externalUrl   VARCHAR(500) NULL     Link to CRM record             │
│                                                                        │
│     createdAt     TIMESTAMP   NOT NULL                                 │
│     updatedAt     TIMESTAMP   NOT NULL                                 │
│     deletedAt     TIMESTAMP   NULL                                     │
└────────────────────────────────────────────────────────────────────────┘

INDEXES:
  - UNIQUE (tenantId, externalId, source)
  - INDEX (tenantId, status)
  - INDEX (tenantId, stage)
  - INDEX (tenantId, expectedCloseDate)
  - GIN INDEX (requiredSkills)
```

**Required Skills JSONB:**
```json
[
  { "skill": "React", "proficiency": "advanced", "count": 2 },
  { "skill": "Node.js", "proficiency": "intermediate", "count": 3 },
  { "skill": "AWS", "proficiency": "expert", "count": 1 }
]
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
