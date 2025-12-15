# RMGaaS 14-Day Comprehensive Feature Scope

> **Document Status:** IN PROGRESS  
> **Last Updated:** 2025-12-15  
> **Version:** 1.1  
> **Timeline:** 14 days to full product  
> **Development Model:** AI-coded (Cursor)  
> **Current Progress:** Day 8 Complete ✅

---

## Progress Overview

| Day | Focus | Status |
|-----|-------|--------|
| 1 | Foundation & Infrastructure | ✅ Complete |
| 2 | Multi-Tenant & Auth | ✅ Complete |
| 3 | Resource Management | ✅ Complete |
| 4 | Client & Project | ✅ Complete |
| 5 | Allocation Management | ✅ Complete |
| 6 | Dashboard & Reports | ✅ Complete |
| 7 | Contract Management | ✅ Complete |
| 8 | Timesheet Management | ✅ Complete |
| 9 | Skill Matching | 🔴 Next |
| 10 | Intelligence Layer | 🔴 Pending |
| 11 | Advanced Dashboards | 🔴 Pending |
| 12 | Reporting Engine | 🔴 Pending |
| 13 | Admin Features | 🔴 Pending |
| 14 | Polish & Security | 🔴 Pending |

---

## Overview

This document defines the complete feature scope for RMGaaS, organized into a 14-day intensive development sprint. The aggressive timeline is enabled by AI-augmented development.

---

## Daily Breakdown

### Day 1: Foundation & Infrastructure ✅ COMPLETE

| Component | Deliverables | Status |
|-----------|--------------|--------|
| **Project Setup** | Monorepo structure, TypeScript config, ESLint/Prettier | ✅ |
| **Docker Setup** | Docker Compose for local dev (API, DB, Redis) | ✅ |
| **Database** | PostgreSQL + Prisma setup, base schema | ✅ |
| **CI/CD** | GitHub Actions for lint, type-check, test | ✅ |
| **Security** | Environment configuration, secrets management | ✅ |
| **Logo/Branding** | NewVision logo integrated, theme config | ✅ |

**Output:** Running local environment, empty shell app ✅

---

### Day 2: Multi-Tenant Core & Authentication ✅ COMPLETE

| Component | Deliverables | Status |
|-----------|--------------|--------|
| **Tenant Schema** | Complete tenant model with RLS policies | ✅ |
| **User Schema** | Users, passwords (Argon2), profile fields | ✅ |
| **Auth System** | Login, logout, JWT + refresh tokens, HttpOnly cookies | ✅ |
| **Password Security** | Hashing, validation rules, password change | ✅ |
| **Session Management** | Token refresh, revocation, session tracking | ✅ |
| **RBAC Foundation** | Role and Permission entities, base roles | ✅ |

**Output:** Secure login/logout, tenant isolation working ✅

---

### Day 3: Data Model Complete & RBAC ✅ COMPLETE

| Component | Deliverables | Status |
|-----------|--------------|--------|
| **Full Schema** | All entities: Resource, Project, Client, Allocation, Practice, Location, Skills | ✅ |
| **RBAC Complete** | All permissions, role assignments, permission checks | ✅ |
| **Soft Delete** | All entities with soft delete support | ✅ |
| **Audit Logging** | Full audit trail on all mutations | ✅ |
| **Data Validation** | Zod schemas for all entities | ✅ |
| **Seed Data** | Sample data for development + Real CSV import | ✅ |

**Output:** Complete data model, full RBAC, audit trail ✅

---

### Day 4: API Layer - Core CRUD ✅ COMPLETE (merged with Days 3-5)

| Component | Deliverables | Status |
|-----------|--------------|--------|
| **REST Endpoints** | Full CRUD for all entities | ✅ |
| **GraphQL Schema** | Query operations for all entities | ⏳ Partial |
| **Input Validation** | All endpoints validated via Zod | ✅ |
| **Error Handling** | Standardized error responses | ✅ |
| **Pagination** | Cursor + offset pagination | ✅ |
| **Filtering/Sorting** | Generic filter/sort on all collections | ✅ |

**Output:** Complete API for all entities ✅

---

### Day 5: Frontend Core & Layout ✅ COMPLETE (merged with allocation mgmt)

| Component | Deliverables | Status |
|-----------|--------------|--------|
| **App Shell** | Layout, navigation, routing | ✅ |
| **Theme System** | Light theme, NewVision brand colors | ✅ |
| **Auth Pages** | Login, forgot password UI | ✅ |
| **Dashboard Shell** | Main dashboard layout | ✅ |
| **Navigation** | Sidebar, header, breadcrumbs | ✅ |
| **Common Components** | Tables, forms, modals, toasts | ✅ |

**Output:** Beautiful, usable app shell, can login ✅

---

### Day 6: Resource Management UI ✅ COMPLETE (includes dashboard/reports)

| Component | Deliverables | Status |
|-----------|--------------|--------|
| **Resource List** | Full table with search, filter, sort | ✅ |
| **Resource Profile** | Detail view with all info | ✅ |
| **Resource Create/Edit** | Full forms with validation | ✅ |
| **Skills Management** | Tag-based skills with proficiency | ✅ |
| **Bulk Import** | Excel/CSV import with mapping | ✅ |
| **Resource Search** | Multi-filter skill-based search | ✅ |
| **Dashboard Analytics** | KPI cards, charts, action panels | ✅ |
| **Bench Analysis** | Summary cards, searchable table | ✅ |

**Output:** Complete resource management ✅

---

### Day 7: Project, Client & Contract Management UI ✅ COMPLETE

| Component | Deliverables | Status |
|-----------|--------------|--------|
| **Client List** | CRUD with search/filter | ✅ |
| **Client Detail** | Contracts, projects, history | ✅ |
| **Contract List** | CRUD with status filters | ✅ |
| **Contract Detail** | Value, timeline, linked projects | ✅ |
| **Contract Create/Edit** | All fields, client linkage | ✅ |
| **Contract Status Workflow** | Draft → Active → Renewal → Terminated | ✅ |
| **Project List** | Full table with status filters | ✅ |
| **Project Detail** | Info, team composition, timeline | ✅ |
| **Project Create/Edit** | All fields, client + contract linkage | ✅ |
| **Project Status Workflow** | State transitions | ✅ |
| **Team Composition View** | See allocated resources | ✅ |

**Output:** Complete client → contract → project management ✅

---

### Day 8: Allocation & Timesheet Management ✅ COMPLETE

| Component | Deliverables | Status |
|-----------|--------------|--------|
| **Allocation Creation** | Assign resource to project | ✅ |
| **Allocation Calendar** | Visual timeline of allocations | ✅ |
| **Conflict Detection** | Over-allocation warnings | ✅ |
| **Partial Allocations** | Percentage-based allocation | ✅ |
| **Allocation Workflow** | Request → Approve → Active | ✅ |
| **Bulk Allocation** | Allocate multiple resources at once | ✅ |
| **Rolloff Management** | Track and manage rolloffs | ✅ |
| **Timesheet Weekly Grid** | Mon-Sun entry interface | ✅ |
| **Timesheet Save/Submit** | Draft save and submission | ✅ |
| **Timesheet Approval** | Manager approve/reject workflow | ✅ |
| **Timesheet Stats** | Hours summary cards | ✅ |

**Output:** Full allocation + timesheet management ✅

---

### Day 9: Bench Management & Availability

| Component | Deliverables |
|-----------|--------------|
| **Bench Dashboard** | Current bench with aging |
| **Bench Aging Logic** | Days on bench, configurable thresholds |
| **Availability Forecast** | 30/60/90 day view |
| **Upcoming Rolloffs** | Calendar of rolloffs |
| **Proactive Alerts** | "Will be on bench in X days" |
| **Bench Cost Tracking** | Cost calculation, trends |
| **Quick Allocation** | From bench to project in 2 clicks |

**Output:** Best-in-class bench management

---

### Day 10: Intelligence Layer (Rules-Based)

| Component | Deliverables |
|-----------|--------------|
| **Smart Matching Algorithm** | Skill match + availability + utilization |
| **Match Scoring** | Weighted scoring with explanations |
| **Optimal Utilization** | Configurable targets with intelligence |
| **Skill Gap Detection** | Compare team skills vs. needs |
| **Utilization Recommendations** | "Based on your data, 82% is optimal" |
| **Resource Recommendations** | Top 5 candidates with reasons |

**Output:** Intelligence that works on day 1

---

### Day 11: Dashboards & Analytics

| Component | Deliverables |
|-----------|--------------|
| **Executive Dashboard** | High-level metrics, trends |
| **Utilization Dashboard** | Real-time utilization by practice/location |
| **Bench Dashboard** | Bench analysis, costs, aging |
| **Project Dashboard** | Project health, staffing status |
| **Practice Dashboard** | Practice-level metrics |
| **Financial Dashboard** | Revenue forecast, bench cost |
| **Skill Inventory** | Organization skill heatmap |
| **Technical Strength** | Org technical capabilities view |

**Output:** Comprehensive real-time analytics

---

### Day 12: Timesheet Management & Reporting

| Component | Deliverables |
|-----------|--------------|
| **Timesheet Entry** | Daily/weekly time entry UI |
| **Timesheet Calendar** | Calendar view for entries |
| **Timesheet Submission** | Submit for approval workflow |
| **Timesheet Approval** | Manager approval queue |
| **Timesheet Reports** | Hours by project/resource |
| **Billable vs Non-billable** | Classification and tracking |
| **Report Builder** | Configurable reports |
| **Standard Reports** | All defined reports (12+) |
| **Export to Excel** | All reports exportable |
| **Export to PDF** | Dashboard/report PDF export |
| **Scheduled Reports** | Email reports on schedule |
| **Custom Filters** | Save report configurations |

**Output:** Complete timesheet + reporting capability

---

### Day 13: Admin & System Features

| Component | Deliverables |
|-----------|--------------|
| **Tenant Settings** | Branding, preferences, thresholds |
| **User Management** | CRUD, role assignment |
| **Role Management** | Custom roles, permissions |
| **Practice/Location Management** | Manage organizational units |
| **System Settings** | Configurable parameters |
| **Email Templates** | Configurable notifications |
| **Integration Config** | HRMS sync configuration |
| **Data Import/Export** | Bulk operations |

**Output:** Complete admin capability

---

### Day 14: Polish, Testing & Security Hardening

| Component | Deliverables |
|-----------|--------------|
| **End-to-End Testing** | Critical paths tested |
| **Performance Optimization** | Load testing, optimization |
| **Security Audit** | OWASP Top 10 verification |
| **Input Sanitization** | Complete validation coverage |
| **Error Handling** | User-friendly messages |
| **UI Polish** | Animations, transitions, responsiveness |
| **Documentation** | User guide, admin guide |
| **Deployment Prep** | Production Docker setup |

**Output:** Production-ready, secure, polished product

---

## Feature Summary by Category

### Core Platform

| Feature | Description | Day |
|---------|-------------|-----|
| Multi-tenancy | Full tenant isolation | 2 |
| Authentication | JWT + refresh, secure cookies | 2 |
| Authorization | RBAC with granular permissions | 2-3 |
| Audit Trail | Complete mutation history | 3 |
| User Management | CRUD, roles, profiles | 13 |

### Resource Management

| Feature | Description | Day |
|---------|-------------|-----|
| Resource CRUD | Create, edit, archive resources | 4-6 |
| Skills Management | Tag-based, proficiency levels | 6 |
| Resource Search | Multi-filter, skill-based | 6 |
| Resource Profile | Comprehensive view | 6 |
| Bulk Import | Excel/CSV with mapping | 6 |

### Client, Contract & Project

| Feature | Description | Day |
|---------|-------------|-----|
| Client Management | Client CRUD with history | 7 |
| Contract Management | MSA/SOW CRUD, renewals | 7 |
| Project Management | Full CRUD with workflows | 7 |
| Client→Contract→Project | Hierarchy management | 7 |
| Allocation Management | Assign resources | 8 |
| Allocation Workflows | Request → Active lifecycle | 8 |
| Conflict Detection | Over-allocation alerts | 8 |

### Timesheet Management

| Feature | Description | Day |
|---------|-------------|-----|
| Time Entry | Daily/weekly hours logging | 12 |
| Timesheet Submission | Submit for approval | 12 |
| Timesheet Approval | Manager approval queue | 12 |
| Billable Tracking | Billable vs non-billable | 12 |
| Timesheet Reports | Hours by project/resource | 12 |

### Bench & Availability

| Feature | Description | Day |
|---------|-------------|-----|
| Bench Dashboard | Current bench, aging | 9 |
| Availability Forecast | 30/60/90 day prediction | 9 |
| Rolloff Calendar | Upcoming rolloffs | 9 |
| Bench Aging Alerts | Configurable thresholds | 9 |
| Bench Cost Tracking | Cost calculation | 9 |

### Intelligence

| Feature | Description | Day |
|---------|-------------|-----|
| Smart Matching | Scored recommendations | 10 |
| Skill Gap Analysis | Team vs. requirements | 10 |
| Optimal Utilization | Dynamic targets | 10 |
| Recommendations | Top candidates with reasons | 10 |

### Analytics & Reporting

| Feature | Description | Day |
|---------|-------------|-----|
| Dashboards (8+) | Real-time analytics | 11 |
| Reports (12+) | Configurable reports | 12 |
| Exports | Excel, PDF | 12 |
| Scheduled Reports | Email on schedule | 12 |

### Administration

| Feature | Description | Day |
|---------|-------------|-----|
| Tenant Settings | Branding, preferences | 13 |
| System Config | Configurable parameters | 13 |
| Email Templates | Notification templates | 13 |
| Integration Config | HRMS sync settings | 13 |

---

## Non-Functional Requirements

### Performance

| Requirement | Target |
|-------------|--------|
| Page Load | < 2 seconds |
| API Response | < 500ms (p95) |
| Search Results | < 1 second |
| Dashboard Refresh | < 3 seconds |
| Concurrent Users | 100+ per tenant |

### Security (ALL MUST-HAVE)

| Requirement | Implementation |
|-------------|----------------|
| OWASP Top 10 | All vulnerabilities addressed |
| Input Validation | Zod on all endpoints |
| SQL Injection | Parameterized queries via Prisma |
| XSS | Content Security Policy, output encoding |
| CSRF | Token validation |
| Password Security | Argon2, complexity rules |
| Session Security | HttpOnly, Secure cookies |
| Rate Limiting | Per-user, per-endpoint |
| Audit Logging | All mutations logged |
| Data Encryption | TLS in transit, encryption at rest |
| Code Vulnerabilities | Zero tolerance |
| Code Quality | High standards enforced |

### Scalability

| Requirement | Target |
|-------------|--------|
| Resources per Tenant | 10,000+ |
| Projects per Tenant | 1,000+ |
| Allocations per Tenant | 100,000+ |
| Tenants per Instance | 100+ (future) |

---

## Out of Scope for v1.0

1. ❌ Mobile native apps
2. ❌ Invoicing/Billing (track hours, but invoicing in ERP)
3. ❌ Multi-language
4. ❌ Multi-currency
5. ❌ Advanced ML models (rules-based only)
6. ❌ Client portal
7. ❌ Talent marketplace

## In Scope (Changed from earlier)

1. ✅ **Contract Management** - MSA/SOW tracking, renewals
2. ✅ **Timesheet Management** - Time entry, approval, reporting
3. ✅ **Integration API** - Provider capability for external systems
4. ✅ **HubSpot/PeopleStrong** - Integration readiness

---

## Definition of Done

- [ ] All P0/P1 features implemented
- [ ] All security requirements met
- [ ] Zero code vulnerabilities
- [ ] 80%+ test coverage on critical paths
- [ ] Performance targets met
- [ ] Documentation complete
- [ ] Can be deployed on Ubuntu server
- [ ] NewVision data imported and working

---

*Document created from strategic deliberation session on 2025-12-15*

