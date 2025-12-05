# RMGaaS - Master Context

> **⚠️ THIS FILE IS THE SINGLE SOURCE OF TRUTH**
> **AI assistants MUST read this file FIRST at the start of every session.**
> **Changes require Product Owner approval via PR.**

---

## Project Identity

| Field | Value |
|-------|-------|
| **Name** | RMGaaS (Resource Management & Governance as a Service) |
| **Codename** | Project Phoenix |
| **Description** | Enterprise-grade platform for managing professional services workforce allocation, utilization, and governance |
| **Created** | 2025-12-06 |
| **Owner** | NewVision Software Pvt. Ltd. |
| **Product Owner** | Devarajan |
| **Target Market** | IT Services, Consulting Firms, Engineering Services (50-50,000 employees) |

---

## Vision Statement

**Transform how professional services firms manage their most valuable asset—their people—by replacing fragmented spreadsheets with an intelligent, real-time platform that maximizes utilization, minimizes bench cost, and enables data-driven workforce decisions.**

### The Problem We Solve

Professional services firms currently manage resources using:
- Spreadsheets (Excel/Google Sheets) that are always stale
- Multiple disconnected systems (HRMS, CRM, Finance, PM tools)
- Tribal knowledge in managers' heads
- Reactive firefighting instead of proactive planning

**Result:** Lost revenue, underutilization, bench burn, poor client delivery, employee frustration.

### Our Solution

A unified platform that provides:
1. **Real-time visibility** into every resource's allocation, skills, and availability
2. **Intelligent matching** of resources to opportunities
3. **Predictive analytics** for demand forecasting and capacity planning
4. **Governance workflows** ensuring compliance and approvals
5. **Multi-persona dashboards** from Board to individual contributor

---

## Non-Negotiable Requirements

These requirements CANNOT be compromised under any circumstances:

### 1. Data Integrity
- [ ] No data loss under any circumstances
- [ ] Complete audit trail for all changes
- [ ] Real-time consistency across all views

### 2. Security
- [ ] Role-based access control (RBAC)
- [ ] Data encryption at rest and in transit
- [ ] SOC 2 Type II compliance ready
- [ ] No PII exposed in logs

### 3. Performance
- [ ] Dashboard load time < 2 seconds
- [ ] API response time < 500ms (p95)
- [ ] Support 10,000 concurrent users
- [ ] 99.9% uptime SLA

### 4. User Experience
- [ ] Zero training required for basic operations
- [ ] Mobile-responsive design
- [ ] Accessibility (WCAG 2.1 AA)

### 5. Scalability
- [ ] Multi-tenant architecture
- [ ] Support 50,000+ resources per tenant
- [ ] Horizontal scaling capability

---

## Target Personas (Priority Order)

| Priority | Persona | Primary Need | Success Metric |
|----------|---------|--------------|----------------|
| P0 | Resource Manager | Allocate resources efficiently | Time to staff < 48 hrs |
| P0 | Practice Head | Maximize practice utilization | Utilization > 85% |
| P1 | Project Manager | Staff projects on time | 100% staffed projects |
| P1 | COO/Delivery Head | Operational efficiency | Bench cost < 5% revenue |
| P2 | CFO | Revenue predictability | Forecast accuracy > 95% |
| P2 | CEO | Strategic workforce planning | Decision support |
| P2 | Individual Employee | Career visibility | Allocation transparency |
| P3 | Client (Portal) | Team visibility | Self-service access |

---

## Core Features (MVP)

### Phase 1 - Foundation (Weeks 1-4)
- [ ] Resource Management (CRUD, profiles, skills)
- [ ] Project & Client Management
- [ ] Basic Allocation (create, modify, timeline)
- [ ] Utilization Dashboard (practice-level)
- [ ] User Authentication & RBAC

### Phase 2 - Operations (Weeks 5-8)
- [ ] Bench Management & Aging
- [ ] Resource Request Workflow
- [ ] Rolloff Calendar
- [ ] Basic Reports & Exports
- [ ] Notification System

### Phase 3 - Intelligence (Weeks 9-12)
- [ ] Smart Resource Matching
- [ ] Demand Forecasting
- [ ] Capacity Planning
- [ ] Advanced Analytics
- [ ] Client Portal (read-only)

---

## Technology Stack (Decided)

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | React 18 + TypeScript | Industry standard, rich ecosystem |
| **UI Components** | shadcn/ui + Tailwind CSS | Modern, accessible, customizable |
| **State Management** | TanStack Query + Zustand | Server state + client state separation |
| **Backend** | Node.js + Express + TypeScript | JavaScript full-stack, team expertise |
| **API** | REST + GraphQL (queries) | REST for mutations, GraphQL for flexible queries |
| **Database** | PostgreSQL 16 | Relational integrity, JSONB flexibility |
| **ORM** | Prisma | Type safety, migrations, excellent DX |
| **Cache** | Redis | Session, real-time features |
| **Search** | PostgreSQL Full Text (MVP) → Elasticsearch | Start simple, scale later |
| **Auth** | JWT + Refresh Tokens | Stateless, scalable |
| **Hosting** | Docker + Ubuntu Server | Developer's existing infrastructure |
| **CI/CD** | GitHub Actions | Integrated with repo |

---

## Out of Scope (Explicitly)

The following are **NOT** part of this product (at least for v1):

1. ❌ Timesheet management (integrate with existing systems)
2. ❌ Invoicing/Billing (integrate with ERP)
3. ❌ HRMS features (payroll, benefits, etc.)
4. ❌ Project management (Jira, Azure DevOps integration)
5. ❌ CRM functionality (Salesforce integration)
6. ❌ Learning Management (training tracking only)
7. ❌ Native mobile apps (responsive web only for MVP)
8. ❌ Multi-currency (single currency per tenant for MVP)
9. ❌ Multi-language (English only for MVP)

---

## Domain Terminology

| Term | Definition |
|------|------------|
| **Resource** | Any person who can be allocated (FTE, contractor, consultant) |
| **Allocation** | Assignment of a resource to a project with %, dates, role |
| **Utilization** | Percentage of time a resource is allocated to billable work |
| **Bench** | Resources not currently allocated to any project |
| **Billable** | Work that can be charged to a client |
| **Practice** | Organizational unit grouping resources by skill (e.g., Microsoft, Data) |
| **SOW** | Statement of Work - contractual agreement with client |
| **Rolloff** | When a resource's allocation to a project ends |
| **Demand** | Resource requirement from a project or opportunity |
| **Supply** | Available resources (bench + upcoming rolloffs) |

---

## Success Metrics

| Metric | Current (Excel) | Target (RMGaaS) |
|--------|-----------------|-----------------|
| Time to update allocation | 1-2 days | Real-time |
| Data accuracy | ~70% | >99% |
| Time to find resource | 2-4 hours | < 5 minutes |
| Utilization visibility | Weekly | Real-time |
| Bench aging visibility | Manual calculation | Automated alerts |
| Report generation | Hours | Seconds |

---

## Integration Points (Future)

| System | Direction | Priority |
|--------|-----------|----------|
| HRMS (Keka/Darwinbox) | Inbound (employee data) | P1 |
| CRM (Salesforce) | Bidirectional (opportunities) | P2 |
| ERP (NetSuite) | Outbound (billing data) | P2 |
| PM Tools (Jira/ADO) | Bidirectional (project data) | P2 |
| Calendar (Google/O365) | Inbound (availability) | P3 |
| Slack/Teams | Outbound (notifications) | P1 |

---

## Constraints & Assumptions

### Constraints
- Initial deployment on single Ubuntu server (scale later)
- Team of 3-5 developers
- Must handle NewVision's own data (~500 resources) as first customer
- 12-week MVP timeline

### Assumptions
- Users have modern browsers (Chrome, Edge, Firefox, Safari latest)
- Users have stable internet connection
- English language proficiency for all users
- Basic computer literacy

---

## Reference Documents

- [Original Data Analysis](../Analysis%20Copy%20RMG_Master_File%20V2.csv) - Sample data structure
- [Architecture Decisions](./ARCHITECTURE_DECISIONS.md) - Technical decisions
- [Coding Standards](./CODING_STANDARDS.md) - Development guidelines
- [API Contracts](../.specs/api/) - API specifications

---

*Last Updated: 2025-12-06T00:00:00Z*
*Version: 1.0*
*Status: APPROVED*
