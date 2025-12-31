# Master Implementation Plan - GOD Level Execution

> **Document Version:** 1.0.0  
> **Created:** December 31, 2025  
> **Author:** AI Assistant (Claude Opus 4.5)  
> **Status:** IN PROGRESS

---

## 🎯 Executive Summary

This document is the comprehensive plan for four major initiatives that will transform RMGaaS from a "collection of islands" into a cohesive, production-ready product.

### The Four Initiatives

| # | Initiative | Priority | Effort | Dependencies |
|---|------------|----------|--------|--------------|
| 1 | **Product Rename** | HIGH | 2-3 hours | None |
| 2 | **Detailed Org Onboarding Specs** | CRITICAL | 4-6 hours | #1 recommended |
| 3 | **Build Phase 0: Organization Onboarding** | CRITICAL | 3-4 weeks | #2 |
| 4 | **Architecture Review & Integration** | HIGH | 1 week | #3 |

### Success Metrics

1. **Product Rename Complete:** Zero references to "RMGaaS" except in historical docs
2. **Specs Complete:** Every database model, API endpoint, and UI component documented
3. **Phase 0 Complete:** New tenant can complete full onboarding in <30 mins
4. **Integration Complete:** Workflow Builder dropdowns populated, no orphan features

---

## 📋 Initiative 1: Product Rename

### Current State Analysis

The product is currently named "RMGaaS" (Resource Management & Governance as a Service), but:
- The scope is broader than just RMG
- "aaS" suffix is overused and unclear
- Need a name that captures workforce/operations platform vision

### Files Requiring Updates

| Category | Files | Changes Needed |
|----------|-------|----------------|
| **Root Config** | package.json, README.md, ARCHITECTURE.md | Name, descriptions |
| **Documentation** | 15+ docs in /docs/ | Headers, references |
| **API** | swagger.ts, email templates, webhooks | Branding |
| **Frontend** | stores, components | App name displays |
| **Docker** | compose files, Dockerfiles | Container names |
| **Database** | schema.prisma comments | Comments only |
| **Tests** | e2e, integration | Email domains, names |

### Proposed New Names (For User Decision)

| Option | Name | Rationale |
|--------|------|-----------|
| A | **Nexus** | Connection hub for workforce ops |
| B | **Prism** | Multi-faceted view of operations |
| C | **Atlas** | Comprehensive workforce map |
| D | **Orbit** | Everything revolves around people |
| E | **Pulse** | Heartbeat of organization |
| F | **[User's Choice]** | Custom name |

### Rename Execution Plan

```
Phase 1: Collect Decision
├── Present options to user
└── Get final name + tagline

Phase 2: Update Core Files
├── package.json (all workspaces)
├── README.md
├── ARCHITECTURE.md
└── .github/copilot-instructions.md

Phase 3: Update Documentation
├── All /docs/*.md files
└── API swagger documentation

Phase 4: Update Code
├── API branding (email service, webhooks)
├── Frontend stores and components
└── Test files

Phase 5: Update Infrastructure
├── Docker compose files
├── Deployment scripts
└── Database connection strings (comments only)
```

---

## 📋 Initiative 2: Organization Onboarding Detailed Specs

### Overview

The Organization Onboarding Module is the **CRITICAL BLOCKER** preventing the product from being usable. This specification will define every aspect of implementation.

### Phase Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ORGANIZATION ONBOARDING                               │
│                                                                              │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐ │
│  │  PHASE   │   │  PHASE   │   │  PHASE   │   │  PHASE   │   │  PHASE   │ │
│  │    1     │──▶│    2     │──▶│    3     │──▶│    4     │──▶│    5     │ │
│  │ Identity │   │Structure │   │  Roles   │   │  People  │   │Governance│ │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘ │
│       │              │              │              │              │         │
│       ▼              ▼              ▼              ▼              ▼         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                     PHASE 6: REVIEW & ACTIVATE                        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### PHASE 1: Organization Identity

#### Database Schema

```prisma
// NEW: Organization Identity (extends Tenant)
model TenantProfile {
  id                String   @id @default(uuid()) @db.Uuid
  tenantId          String   @unique @db.Uuid
  tenant            Tenant   @relation(fields: [tenantId], references: [id])
  
  // Legal Entity
  legalName         String   @db.VarChar(300)
  tradingName       String?  @db.VarChar(300)
  registrationNo    String?  @db.VarChar(100)
  taxId             String?  @db.VarChar(100)
  
  // Industry & Size
  industry          String   @db.VarChar(100)
  industryCode      String?  @db.VarChar(20)  // NAICS/SIC code
  employeeCount     EmployeeCountRange
  annualRevenue     RevenueRange?
  
  // Contact
  primaryEmail      String   @db.VarChar(255)
  primaryPhone      String?  @db.VarChar(20)
  website           String?  @db.VarChar(255)
  
  // Address
  addressLine1      String   @db.VarChar(255)
  addressLine2      String?  @db.VarChar(255)
  city              String   @db.VarChar(100)
  state             String   @db.VarChar(100)
  country           String   @db.VarChar(100)
  postalCode        String   @db.VarChar(20)
  
  // Branding
  logoUrl           String?  @db.VarChar(500)
  primaryColor      String?  @db.VarChar(7)   // #RRGGBB
  secondaryColor    String?  @db.VarChar(7)
  
  // Settings
  timezone          String   @default("UTC") @db.VarChar(50)
  dateFormat        String   @default("YYYY-MM-DD") @db.VarChar(20)
  timeFormat        String   @default("HH:mm") @db.VarChar(10)
  
  // Fiscal
  fiscalYearStart   Int      @default(1)  // Month (1-12)
  fiscalYearEnd     Int      @default(12)
  currency          String   @default("USD") @db.VarChar(3)
  
  // Onboarding
  onboardingPhase   Int      @default(1)
  onboardingStatus  OnboardingStatus @default(IN_PROGRESS)
  onboardedAt       DateTime?
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

enum EmployeeCountRange {
  SOLO        // 1
  MICRO       // 2-10
  SMALL       // 11-50
  MEDIUM      // 51-200
  LARGE       // 201-1000
  ENTERPRISE  // 1001+
}

enum RevenueRange {
  STARTUP     // <$1M
  GROWING     // $1M-$10M
  ESTABLISHED // $10M-$100M
  LARGE       // $100M-$1B
  ENTERPRISE  // $1B+
}

enum OnboardingStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
  SKIPPED
}
```

#### API Endpoints

```yaml
# Organization Identity Endpoints
POST   /api/v1/organization/identity        # Create/update org identity
GET    /api/v1/organization/identity        # Get current org identity
PATCH  /api/v1/organization/identity        # Update specific fields
POST   /api/v1/organization/identity/logo   # Upload logo
DELETE /api/v1/organization/identity/logo   # Remove logo

# Validation Endpoints
POST   /api/v1/organization/identity/validate-tax-id  # Validate tax ID format
GET    /api/v1/organization/industries      # List industries (NAICS codes)
GET    /api/v1/organization/timezones       # List timezones
GET    /api/v1/organization/currencies      # List currencies
```

#### UI Components

```
/apps/frontend/src/features/onboarding/
├── components/
│   ├── identity/
│   │   ├── OrgIdentityForm.tsx        # Main form component
│   │   ├── LegalEntitySection.tsx     # Legal details
│   │   ├── IndustrySelector.tsx       # Industry picker
│   │   ├── AddressForm.tsx            # Address with autocomplete
│   │   ├── BrandingUploader.tsx       # Logo + colors
│   │   └── FiscalSettings.tsx         # Fiscal year config
│   └── shared/
│       ├── OnboardingProgress.tsx     # Progress indicator
│       ├── OnboardingNav.tsx          # Navigation between phases
│       └── SaveContinueFooter.tsx     # Save & continue buttons
├── hooks/
│   ├── useOrgIdentity.ts              # Identity CRUD
│   ├── useIndustries.ts               # Industry list
│   └── useTimezones.ts                # Timezone list
└── pages/
    └── OrgIdentityPage.tsx            # Full page wrapper
```

---

### PHASE 2: Organization Structure

#### Database Schema

```prisma
// Department/Business Unit
model Department {
  id            String       @id @default(uuid()) @db.Uuid
  tenantId      String       @db.Uuid
  tenant        Tenant       @relation(fields: [tenantId], references: [id])
  
  parentId      String?      @db.Uuid
  parent        Department?  @relation("DeptHierarchy", fields: [parentId], references: [id])
  
  code          String       @db.VarChar(20)
  name          String       @db.VarChar(200)
  description   String?      @db.VarChar(500)
  type          DepartmentType
  
  headId        String?      @db.Uuid  // Department head (Resource)
  costCenterId  String?      @db.Uuid
  costCenter    CostCenter?  @relation(fields: [costCenterId], references: [id])
  
  status        EntityStatus @default(ACTIVE)
  sortOrder     Int          @default(0)
  
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  deletedAt     DateTime?
  
  // Relations
  children      Department[] @relation("DeptHierarchy")
  resources     Resource[]
  teams         Team[]
  
  @@unique([tenantId, code])
  @@index([tenantId, status])
  @@index([tenantId, parentId])
}

enum DepartmentType {
  BUSINESS_UNIT
  DEPARTMENT
  DIVISION
  REGION
}

// Team (within Department)
model Team {
  id            String       @id @default(uuid()) @db.Uuid
  tenantId      String       @db.Uuid
  tenant        Tenant       @relation(fields: [tenantId], references: [id])
  
  departmentId  String       @db.Uuid
  department    Department   @relation(fields: [departmentId], references: [id])
  
  code          String       @db.VarChar(20)
  name          String       @db.VarChar(200)
  description   String?      @db.VarChar(500)
  
  leadId        String?      @db.Uuid  // Team lead (Resource)
  
  status        EntityStatus @default(ACTIVE)
  sortOrder     Int          @default(0)
  
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  deletedAt     DateTime?
  
  // Relations
  members       TeamMember[]
  
  @@unique([tenantId, code])
  @@index([tenantId, departmentId])
}

model TeamMember {
  id            String       @id @default(uuid()) @db.Uuid
  teamId        String       @db.Uuid
  team          Team         @relation(fields: [teamId], references: [id])
  resourceId    String       @db.Uuid
  resource      Resource     @relation(fields: [resourceId], references: [id])
  role          String?      @db.VarChar(100)  // Role within team
  isPrimary     Boolean      @default(false)   // Primary team?
  joinedAt      DateTime     @default(now())
  leftAt        DateTime?
  
  @@unique([teamId, resourceId])
}

// Cost Center
model CostCenter {
  id            String       @id @default(uuid()) @db.Uuid
  tenantId      String       @db.Uuid
  tenant        Tenant       @relation(fields: [tenantId], references: [id])
  
  code          String       @db.VarChar(20)
  name          String       @db.VarChar(200)
  description   String?      @db.VarChar(500)
  
  managerId     String?      @db.Uuid  // Cost center manager
  budget        Decimal?     @db.Decimal(15, 2)
  
  status        EntityStatus @default(ACTIVE)
  
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  
  // Relations
  departments   Department[]
  
  @@unique([tenantId, code])
}

enum EntityStatus {
  ACTIVE
  INACTIVE
  ARCHIVED
}
```

#### API Endpoints

```yaml
# Department Endpoints
GET    /api/v1/organization/departments           # List all (flat or tree)
POST   /api/v1/organization/departments           # Create department
GET    /api/v1/organization/departments/:id       # Get single
PATCH  /api/v1/organization/departments/:id       # Update
DELETE /api/v1/organization/departments/:id       # Soft delete
POST   /api/v1/organization/departments/reorder   # Reorder hierarchy
POST   /api/v1/organization/departments/import    # Bulk import (CSV/Excel)
GET    /api/v1/organization/departments/export    # Export to CSV

# Team Endpoints
GET    /api/v1/organization/teams                 # List all teams
POST   /api/v1/organization/teams                 # Create team
GET    /api/v1/organization/teams/:id             # Get single with members
PATCH  /api/v1/organization/teams/:id             # Update
DELETE /api/v1/organization/teams/:id             # Soft delete
POST   /api/v1/organization/teams/:id/members     # Add member
DELETE /api/v1/organization/teams/:id/members/:resourceId  # Remove member

# Cost Center Endpoints
GET    /api/v1/organization/cost-centers          # List all
POST   /api/v1/organization/cost-centers          # Create
PATCH  /api/v1/organization/cost-centers/:id      # Update
DELETE /api/v1/organization/cost-centers/:id      # Soft delete

# Location Endpoints (already exists, extend)
GET    /api/v1/organization/locations             # List all
POST   /api/v1/organization/locations             # Create
PATCH  /api/v1/organization/locations/:id         # Update
DELETE /api/v1/organization/locations/:id         # Soft delete
```

#### UI Components

```
/apps/frontend/src/features/onboarding/
├── components/
│   └── structure/
│       ├── OrgStructureWizard.tsx     # Main wizard
│       ├── DepartmentTree.tsx         # Drag-drop tree
│       ├── DepartmentForm.tsx         # Create/edit dept
│       ├── TeamManager.tsx            # Team CRUD
│       ├── CostCenterManager.tsx      # Cost center CRUD
│       ├── LocationManager.tsx        # Location CRUD
│       ├── BulkImportModal.tsx        # CSV/Excel import
│       └── OrgChartPreview.tsx        # Visual preview
└── pages/
    └── OrgStructurePage.tsx
```

---

### PHASE 3: Roles & Permissions

#### Database Schema

```prisma
// Business Role (Organizational function, not system permissions)
model BusinessRole {
  id            String       @id @default(uuid()) @db.Uuid
  tenantId      String       @db.Uuid
  tenant        Tenant       @relation(fields: [tenantId], references: [id])
  
  code          String       @db.VarChar(20)
  name          String       @db.VarChar(200)
  description   String?      @db.VarChar(500)
  
  category      RoleCategory
  level         GradeLevel?
  
  // Capabilities
  canApprove    Boolean      @default(false)
  canManage     Boolean      @default(false)
  canBillable   Boolean      @default(true)
  
  // Competencies required for this role
  competencies  Json?        // Array of competency requirements
  
  status        EntityStatus @default(ACTIVE)
  isSystem      Boolean      @default(false)  // System-defined vs custom
  
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  
  // Relations
  assignments   ResourceBusinessRole[]
  
  @@unique([tenantId, code])
}

enum RoleCategory {
  LEADERSHIP      // C-suite, VPs
  MANAGEMENT      // Directors, Managers
  DELIVERY        // PMs, Tech Leads
  INDIVIDUAL      // ICs, Engineers
  SUPPORT         // HR, Admin
  CONTRACTOR      // External
}

enum GradeLevel {
  L1    // Entry
  L2    // Junior
  L3    // Mid
  L4    // Senior
  L5    // Staff/Lead
  L6    // Principal
  L7    // Director
  L8    // VP
  L9    // SVP
  L10   // C-Level
}

// Resource to Business Role mapping (many-to-many)
model ResourceBusinessRole {
  id              String       @id @default(uuid()) @db.Uuid
  resourceId      String       @db.Uuid
  resource        Resource     @relation(fields: [resourceId], references: [id])
  businessRoleId  String       @db.Uuid
  businessRole    BusinessRole @relation(fields: [businessRoleId], references: [id])
  
  isPrimary       Boolean      @default(false)
  effectiveFrom   DateTime     @default(now())
  effectiveTo     DateTime?
  
  assignedBy      String       @db.Uuid
  assignedAt      DateTime     @default(now())
  
  @@unique([resourceId, businessRoleId, effectiveFrom])
}

// Grade Band (for compensation, not permissions)
model GradeBand {
  id            String       @id @default(uuid()) @db.Uuid
  tenantId      String       @db.Uuid
  tenant        Tenant       @relation(fields: [tenantId], references: [id])
  
  code          String       @db.VarChar(10)
  name          String       @db.VarChar(100)
  level         Int          // Numeric level for sorting
  
  minSalary     Decimal?     @db.Decimal(15, 2)
  maxSalary     Decimal?     @db.Decimal(15, 2)
  currency      String       @default("USD") @db.VarChar(3)
  
  billRateMin   Decimal?     @db.Decimal(10, 2)
  billRateMax   Decimal?     @db.Decimal(10, 2)
  
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  
  @@unique([tenantId, code])
  @@index([tenantId, level])
}
```

#### API Endpoints

```yaml
# Business Role Endpoints
GET    /api/v1/organization/business-roles           # List all
POST   /api/v1/organization/business-roles           # Create
GET    /api/v1/organization/business-roles/:id       # Get single
PATCH  /api/v1/organization/business-roles/:id       # Update
DELETE /api/v1/organization/business-roles/:id       # Soft delete
GET    /api/v1/organization/business-roles/templates # Get templates

# System Role Endpoints (existing, enhance)
GET    /api/v1/roles                                 # List system roles
POST   /api/v1/roles                                 # Create custom role
GET    /api/v1/roles/:id/permissions                 # Get role permissions
PATCH  /api/v1/roles/:id/permissions                 # Update permissions

# Grade Band Endpoints
GET    /api/v1/organization/grade-bands              # List all
POST   /api/v1/organization/grade-bands              # Create
PATCH  /api/v1/organization/grade-bands/:id          # Update
DELETE /api/v1/organization/grade-bands/:id          # Soft delete
```

#### UI Components

```
/apps/frontend/src/features/onboarding/
├── components/
│   └── roles/
│       ├── RoleSetupWizard.tsx        # Main wizard
│       ├── SystemRoleConfig.tsx       # System roles setup
│       ├── BusinessRoleManager.tsx    # Business roles CRUD
│       ├── RoleTemplateSelector.tsx   # Start from templates
│       ├── PermissionMatrix.tsx       # Visual permission grid
│       ├── GradeBandManager.tsx       # Grade bands setup
│       └── RoleMappingPreview.tsx     # Preview role structure
└── pages/
    └── RoleSetupPage.tsx
```

---

### PHASE 4: People Setup

#### Database Schema

```prisma
// Note: Resource and User models already exist
// We need to add/modify:

// Extend Resource model
model Resource {
  // ... existing fields ...
  
  // NEW: Link to department and team
  departmentId    String?      @db.Uuid
  department      Department?  @relation(fields: [departmentId], references: [id])
  
  // NEW: Business roles
  businessRoles   ResourceBusinessRole[]
  
  // NEW: Team memberships
  teamMemberships TeamMember[]
  
  // NEW: Grade band
  gradeBandId     String?      @db.Uuid
  gradeBand       GradeBand?   @relation(fields: [gradeBandId], references: [id])
}

// Pending Invitation (for new users)
model UserInvitation {
  id            String       @id @default(uuid()) @db.Uuid
  tenantId      String       @db.Uuid
  tenant        Tenant       @relation(fields: [tenantId], references: [id])
  
  email         String       @db.VarChar(255)
  firstName     String       @db.VarChar(100)
  lastName      String       @db.VarChar(100)
  
  roleId        String       @db.Uuid  // System role to assign
  resourceId    String?      @db.Uuid  // Link to resource if any
  
  token         String       @unique @db.VarChar(64)
  expiresAt     DateTime
  
  invitedBy     String       @db.Uuid
  invitedAt     DateTime     @default(now())
  acceptedAt    DateTime?
  
  status        InviteStatus @default(PENDING)
  
  @@unique([tenantId, email])
  @@index([token])
  @@index([expiresAt])
}

enum InviteStatus {
  PENDING
  ACCEPTED
  EXPIRED
  REVOKED
}
```

#### API Endpoints

```yaml
# Resource Setup Endpoints
GET    /api/v1/organization/people                   # List all resources
POST   /api/v1/organization/people                   # Create resource
GET    /api/v1/organization/people/:id               # Get single
PATCH  /api/v1/organization/people/:id               # Update
DELETE /api/v1/organization/people/:id               # Soft delete
POST   /api/v1/organization/people/import            # Bulk import (CSV/Excel)
GET    /api/v1/organization/people/export            # Export to CSV
POST   /api/v1/organization/people/validate-import   # Validate import data

# User Account Endpoints
POST   /api/v1/organization/people/:id/create-user   # Create user for resource
POST   /api/v1/organization/people/:id/invite        # Send invite to resource
GET    /api/v1/invitations                           # List pending invites
DELETE /api/v1/invitations/:id                       # Revoke invite
POST   /api/v1/invitations/:token/accept             # Accept invite (public)

# Assignment Endpoints
POST   /api/v1/organization/people/:id/roles         # Assign business role
DELETE /api/v1/organization/people/:id/roles/:roleId # Remove business role
POST   /api/v1/organization/people/:id/teams         # Add to team
DELETE /api/v1/organization/people/:id/teams/:teamId # Remove from team
```

#### UI Components

```
/apps/frontend/src/features/onboarding/
├── components/
│   └── people/
│       ├── PeopleSetupWizard.tsx      # Main wizard
│       ├── ResourceForm.tsx           # Create/edit resource
│       ├── BulkImportWizard.tsx       # CSV/Excel import
│       ├── ImportMapping.tsx          # Column mapping
│       ├── ImportPreview.tsx          # Preview & validate
│       ├── UserAccountCreator.tsx     # Create user accounts
│       ├── InviteManager.tsx          # Manage invitations
│       ├── RoleAssigner.tsx           # Assign business roles
│       ├── TeamAssigner.tsx           # Assign to teams
│       └── PeopleDirectory.tsx        # Full directory view
└── pages/
    └── PeopleSetupPage.tsx
```

---

### PHASE 5: Governance Rules

#### Database Schema

```prisma
// Note: ApprovalChain, ApprovalRule already exist
// We need to add:

// Approval Matrix Template
model ApprovalMatrixTemplate {
  id            String       @id @default(uuid()) @db.Uuid
  tenantId      String       @db.Uuid
  tenant        Tenant       @relation(fields: [tenantId], references: [id])
  
  name          String       @db.VarChar(200)
  description   String?      @db.VarChar(500)
  
  // Template definition
  requestType   String       @db.VarChar(50)  // Request type this applies to
  conditions    Json         // Array of conditions
  steps         Json         // Array of approval steps
  
  isActive      Boolean      @default(true)
  
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
}

// Delegation Rule
model DelegationRule {
  id            String       @id @default(uuid()) @db.Uuid
  tenantId      String       @db.Uuid
  tenant        Tenant       @relation(fields: [tenantId], references: [id])
  
  name          String       @db.VarChar(200)
  description   String?      @db.VarChar(500)
  
  // Who can delegate
  delegatorType DelegatorType
  delegatorId   String?      @db.Uuid  // Specific user/role
  
  // Auto-delegation rules
  autoDelegate  Boolean      @default(false)
  triggerDays   Int?         // Auto-delegate after X days OOO
  
  // Constraints
  maxDuration   Int?         // Max delegation days
  allowedTypes  String[]     // Request types that can be delegated
  
  status        EntityStatus @default(ACTIVE)
  
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
}

enum DelegatorType {
  ANY_USER
  SPECIFIC_USER
  ROLE_HOLDER
  MANAGER_OF
}

// SLA Configuration
model SlaConfiguration {
  id            String       @id @default(uuid()) @db.Uuid
  tenantId      String       @db.Uuid
  tenant        Tenant       @relation(fields: [tenantId], references: [id])
  
  name          String       @db.VarChar(200)
  requestType   String       @db.VarChar(50)
  priority      String       @db.VarChar(20)
  
  // Time limits (in hours)
  responseTime  Int          // First response
  resolutionTime Int         // Final resolution
  
  // Escalation
  escalationEnabled Boolean  @default(true)
  escalateAfter    Int?      // Hours before escalation
  escalateTo       String?   @db.Uuid  // User/role to escalate to
  
  // Business hours
  useBusinessHours Boolean   @default(true)
  
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  
  @@unique([tenantId, requestType, priority])
}
```

#### API Endpoints

```yaml
# Approval Matrix Endpoints
GET    /api/v1/organization/governance/approval-matrices     # List all
POST   /api/v1/organization/governance/approval-matrices     # Create
PATCH  /api/v1/organization/governance/approval-matrices/:id # Update
DELETE /api/v1/organization/governance/approval-matrices/:id # Delete
GET    /api/v1/organization/governance/approval-matrices/templates # Get templates

# Delegation Endpoints
GET    /api/v1/organization/governance/delegation-rules      # List all
POST   /api/v1/organization/governance/delegation-rules      # Create
PATCH  /api/v1/organization/governance/delegation-rules/:id  # Update
DELETE /api/v1/organization/governance/delegation-rules/:id  # Delete

# SLA Endpoints
GET    /api/v1/organization/governance/sla                   # List all
POST   /api/v1/organization/governance/sla                   # Create
PATCH  /api/v1/organization/governance/sla/:id               # Update
DELETE /api/v1/organization/governance/sla/:id               # Delete

# Business Hours Endpoints
GET    /api/v1/organization/governance/business-hours        # Get config
PUT    /api/v1/organization/governance/business-hours        # Update config
```

#### UI Components

```
/apps/frontend/src/features/onboarding/
├── components/
│   └── governance/
│       ├── GovernanceWizard.tsx       # Main wizard
│       ├── ApprovalMatrixBuilder.tsx  # Visual matrix builder
│       ├── WorkflowTemplates.tsx      # Pre-built templates
│       ├── DelegationRules.tsx        # Delegation config
│       ├── SlaConfigurator.tsx        # SLA setup
│       ├── BusinessHoursSetup.tsx     # Working hours
│       ├── EscalationPathBuilder.tsx  # Escalation paths
│       └── GovernancePreview.tsx      # Preview all rules
└── pages/
    └── GovernanceSetupPage.tsx
```

---

### PHASE 6: Review & Activate

#### Components

```
/apps/frontend/src/features/onboarding/
├── components/
│   └── review/
│       ├── OnboardingReview.tsx       # Full review page
│       ├── IdentitySummary.tsx        # Identity recap
│       ├── StructureSummary.tsx       # Structure recap
│       ├── RolesSummary.tsx           # Roles recap
│       ├── PeopleSummary.tsx          # People recap
│       ├── GovernanceSummary.tsx      # Governance recap
│       ├── ValidationResults.tsx      # Issues & warnings
│       ├── ActivationChecklist.tsx    # Pre-activation checks
│       └── ActivationConfirm.tsx      # Final confirmation
└── pages/
    └── OnboardingReviewPage.tsx
```

#### Validation Rules

```typescript
interface ValidationResult {
  phase: number;
  status: 'complete' | 'incomplete' | 'warning' | 'error';
  message: string;
  action?: string;  // Suggested fix
}

const validations = [
  // Phase 1: Identity
  { check: 'org.legalName', required: true },
  { check: 'org.industry', required: true },
  { check: 'org.timezone', required: true },
  
  // Phase 2: Structure
  { check: 'departments.count >= 1', required: false, warning: 'No departments defined' },
  { check: 'departments.hasHead', required: false, warning: 'Departments without heads' },
  
  // Phase 3: Roles
  { check: 'businessRoles.count >= 1', required: true },
  { check: 'systemRoles.adminExists', required: true },
  
  // Phase 4: People
  { check: 'resources.count >= 1', required: true },
  { check: 'resources.hasRoles', required: false, warning: 'Resources without roles' },
  
  // Phase 5: Governance
  { check: 'approvalChains.count >= 1', required: false, warning: 'No approval workflows' },
];
```

---

## 📋 Initiative 3: Build Phase 0 - Organization Onboarding

### Sprint Plan

#### Sprint 1 (Week 1): Foundation + Identity

| Day | Tasks |
|-----|-------|
| Day 1 | Database migrations for TenantProfile, update Tenant relations |
| Day 2 | API: Identity endpoints, validation, file upload for logo |
| Day 3 | Frontend: Identity form components |
| Day 4 | Frontend: Identity page, integration |
| Day 5 | Testing, polish, documentation |

#### Sprint 2 (Week 2): Structure

| Day | Tasks |
|-----|-------|
| Day 1 | Database migrations for Department, Team, CostCenter |
| Day 2 | API: Department CRUD, tree operations |
| Day 3 | API: Team, CostCenter CRUD, import/export |
| Day 4 | Frontend: Tree builder, forms |
| Day 5 | Frontend: Bulk import, testing |

#### Sprint 3 (Week 3): Roles + People

| Day | Tasks |
|-----|-------|
| Day 1 | Database: BusinessRole, GradeBand, assignments |
| Day 2 | API: Business role endpoints, permission matrix |
| Day 3 | Frontend: Role manager, templates |
| Day 4 | API: People endpoints, invitations |
| Day 5 | Frontend: People setup, bulk import |

#### Sprint 4 (Week 4): Governance + Review + Integration

| Day | Tasks |
|-----|-------|
| Day 1 | Database: Governance models |
| Day 2 | API: Governance endpoints |
| Day 3 | Frontend: Governance wizard |
| Day 4 | Frontend: Review & Activate |
| Day 5 | Integration testing, Workflow Builder connection |

---

## 📋 Initiative 4: Architecture Review & Integration

### Integration Points

| Feature | Needs | From Phase |
|---------|-------|------------|
| Workflow Builder | Roles dropdown | Phase 3 |
| Request Form | Departments, Teams | Phase 2 |
| User Management | Invitations, roles | Phase 3, 4 |
| Reports | Structure hierarchy | Phase 2 |
| Approvals | Business roles | Phase 3 |

### Testing Matrix

| Test Type | Scope | Automation |
|-----------|-------|------------|
| Unit | All services | Vitest |
| Integration | API endpoints | Vitest + Supertest |
| E2E | Full flows | Playwright |
| Visual | UI components | Storybook |

### Documentation Updates

| Document | Updates Needed |
|----------|----------------|
| ARCHITECTURE.md | Phase 0 completion |
| API_REFERENCE.md | New endpoints |
| USER_GUIDE.md | Onboarding guide |
| DEPLOYMENT_GUIDE.md | New migrations |

---

## 📊 Risk Register

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Schema changes break existing data | HIGH | MEDIUM | Careful migrations, backups |
| Onboarding too complex | MEDIUM | MEDIUM | Templates, AI assistance |
| Performance with large orgs | MEDIUM | LOW | Pagination, caching |
| UI/UX complexity | MEDIUM | MEDIUM | Progressive disclosure |

---

## ✅ Acceptance Criteria

### Initiative 1: Product Rename
- [ ] New name decided and documented
- [ ] All code references updated
- [ ] All documentation updated
- [ ] No broken imports or tests

### Initiative 2: Specs Complete
- [ ] All 6 phases fully specified
- [ ] Database schemas defined
- [ ] API endpoints defined
- [ ] UI components mapped

### Initiative 3: Build Complete
- [ ] All migrations applied
- [ ] All endpoints implemented
- [ ] All UI components built
- [ ] Full onboarding flow working

### Initiative 4: Integration Complete
- [ ] Workflow Builder populates roles
- [ ] Request forms show structure
- [ ] All tests passing
- [ ] Documentation updated

---

## 🚀 Execution Order

```
PHASE 1: PLANNING (Today)
├── [x] Create this master plan
├── [ ] Get user decision on product name
└── [ ] Review and approve specs

PHASE 2: RENAME (Today)
├── [ ] Execute rename across codebase
└── [ ] Verify no broken references

PHASE 3: BUILD (Weeks 1-4)
├── Week 1: Identity + Structure foundations
├── Week 2: Structure completion
├── Week 3: Roles + People
└── Week 4: Governance + Review + Integration

PHASE 4: POLISH (Week 5)
├── [ ] E2E testing
├── [ ] Performance testing
├── [ ] Documentation finalization
└── [ ] Production deployment prep
```

---

*This document will be updated as each initiative progresses.*
