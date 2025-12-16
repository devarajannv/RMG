# RMGaaS 14-Day Comprehensive Feature Scope

> **Document Status:** IN PROGRESS  
> **Last Updated:** 2025-12-16  
> **Version:** 1.2  
> **Timeline:** 14 days to full product  
> **Development Model:** AI-coded (Cursor)  
> **Current Progress:** Day 12 Complete ✅

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
| 9 | Bench Management | ✅ Complete |
| 10 | Intelligence Layer | ✅ Complete |
| 11 | Advanced Dashboards | ✅ Complete |
| 12 | Export/Import/Webhooks | ✅ Complete |
| 13 | Testing & Documentation | ✅ Complete |
| 14 | Production Deployment | ✅ Complete |

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

### Day 9: Bench Management & Availability ✅ COMPLETE

| Component | Deliverables | Status |
|-----------|--------------|--------|
| **Bench Dashboard** | Current bench with aging | ✅ |
| **Bench Aging Logic** | Days on bench, configurable thresholds | ✅ |
| **Availability Forecast** | 30/60/90 day view | ✅ |
| **Upcoming Rolloffs** | Calendar of rolloffs | ✅ |
| **Proactive Alerts** | "Will be on bench in X days" | ✅ |
| **Bench Cost Tracking** | Cost calculation, trends | ✅ |
| **Quick Allocation** | From bench to project in 2 clicks | ✅ |

**Output:** Best-in-class bench management ✅

---

### Day 10: Intelligence Layer (Rules-Based) ✅ COMPLETE

| Component | Deliverables | Status |
|-----------|--------------|--------|
| **Smart Matching Algorithm** | Skill match + availability + utilization | ✅ |
| **Match Scoring** | Weighted scoring with explanations | ✅ |
| **Optimal Utilization** | Configurable targets with intelligence | ✅ |
| **Skill Gap Detection** | Compare team skills vs. needs | ✅ |
| **Utilization Recommendations** | "Based on your data, 82% is optimal" | ✅ |
| **Resource Recommendations** | Top 5 candidates with reasons | ✅ |

**Output:** Intelligence that works on day 1 ✅

---

### Day 11: Dashboards & Analytics ✅ COMPLETE

| Component | Deliverables | Status |
|-----------|--------------|--------|
| **Executive Dashboard** | High-level metrics, trends, highlights | ✅ |
| **Utilization Dashboard** | Real-time utilization by practice/location | ✅ |
| **Bench Dashboard** | Bench analysis, costs, aging | ✅ (Day 9) |
| **Project Dashboard** | Project health, staffing status | ✅ |
| **Practice Dashboard** | Practice-level metrics, utilization vs target | ✅ |
| **Financial Dashboard** | Bench costs, projections, breakdown | ✅ |
| **Skill Inventory** | Organization skill supply/demand | ✅ (Day 10) |
| **Analytics API** | 5 endpoints for dashboard data | ✅ |

**Output:** Comprehensive real-time analytics ✅

---

### Day 12: Export/Import & Integrations ✅ COMPLETE

| Component | Deliverables | Status |
|-----------|--------------|--------|
| **CSV Export** | Resources, projects, allocations, clients | ✅ |
| **JSON Export** | All entities with full details | ✅ |
| **Bench Report Export** | Bench resources with costs | ✅ |
| **Utilization Report Export** | Utilization by resource | ✅ |
| **Skills Inventory Export** | Skills with resource breakdown | ✅ |
| **Bulk CSV Import** | Resources, allocations, projects | ✅ |
| **Import Validation** | Pre-import validation endpoint | ✅ |
| **Import Templates** | Downloadable templates | ✅ |
| **Webhook System** | 15 event types, retry logic | ✅ |
| **Webhook Management** | CRUD, test, delivery history | ✅ |
| **HMAC Signatures** | Webhook payload signing | ✅ |
| **Data Management UI** | 3-tab frontend (Export/Import/Webhooks) | ✅ |

**Output:** Complete export/import + webhook integrations ✅

*Note: Timesheet was completed in Day 8. Day 12 scope changed to integrations.*

---

### Day 13: Testing & Documentation ✅ COMPLETE

| Component | Deliverables | Status |
|-----------|--------------|--------|
| **Test Setup** | Vitest configuration, mock setup | ✅ |
| **Unit Tests** | 51 tests across 4 service modules | ✅ |
| **Auth Tests** | Password, token, session logic | ✅ |
| **Intelligence Tests** | Scoring, matching, utilization | ✅ |
| **Export Tests** | CSV/JSON export functionality | ✅ |
| **Import Tests** | Validation, error handling | ✅ |
| **API Documentation** | OpenAPI 3.0 spec at /api-docs | ✅ |
| **Swagger UI** | Interactive docs at /api-docs | ✅ |
| **User Guide** | Comprehensive user documentation | ✅ |

**Output:** Tested, documented codebase ✅

---

### Day 14: Production Deployment & Security ✅ COMPLETE

| Component | Deliverables | Status |
|-----------|--------------|--------|
| **Docker Production** | Multi-stage production builds | ✅ |
| **Docker Compose** | Production compose with health checks | ✅ |
| **Nginx Configuration** | Reverse proxy, SSL, rate limiting | ✅ |
| **Environment Config** | Production env template | ✅ |
| **Deployment Script** | Full deployment automation | ✅ |
| **Backup/Restore** | Automated backup procedures | ✅ |
| **Health Checks** | Service health monitoring | ✅ |
| **Deployment Guide** | Comprehensive documentation | ✅ |

**Output:** Production-ready, deployable system ✅

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

