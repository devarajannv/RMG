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
| **Target Market** | IT Services, Engineering Services (1,000-5,000+ employees), Global |
| **Development Model** | AI-Led Development (Cursor) |
| **Timeline** | 14 days to full product |

---

## Brand Identity

| Element | Value |
|---------|-------|
| **Company** | NewVision Software |
| **Tagline** | THINK FORWARD |
| **Logo** | `New-Vision-2023.png` |
| **Theme** | Light only, professional, no gaudy colors |
| **Style** | Clean, enterprise SaaS aesthetic |

---

## Vision Statement

**Transform how professional services firms manage their most valuable asset—their people—by replacing fragmented spreadsheets with an intelligent, real-time platform that maximizes utilization, minimizes bench cost, and enables data-driven workforce decisions.**

### The Problem We Solve

Professional services firms currently manage resources using:
- Spreadsheets (Excel/Google Sheets) that are always stale ✅ VALIDATED
- Multiple disconnected systems (HRMS, CRM, Finance, PM tools)
- Tribal knowledge in managers' heads
- Reactive firefighting instead of proactive planning
- No meaningful reports or dashboards
- Can't assess technical strength of organization
- Don't know who becomes available when with what skills

**Result:** Lost revenue, underutilization, bench burn, poor client delivery, employee frustration.

### Our Solution

A unified platform that provides:
1. **Real-time visibility** into every resource's allocation, skills, and availability
2. **Intelligent matching** of resources to opportunities (Rules + ML hybrid)
3. **Predictive analytics** for demand forecasting and capacity planning
4. **Governance workflows** ensuring compliance and approvals
5. **Multi-persona dashboards** from Board to individual contributor
6. **Best-in-class bench management** with aging, costs, and proactive alerts

---

## Non-Negotiable Requirements

These requirements CANNOT be compromised under any circumstances. **All are MUST-HAVE.**

### 1. Data Integrity
- [ ] No data loss under any circumstances
- [ ] Complete audit trail for all changes
- [ ] Real-time consistency across all views

### 2. Security (ALL MUST-HAVE)
- [ ] OWASP Top 10 compliance
- [ ] Role-based access control (RBAC)
- [ ] Data encryption at rest and in transit
- [ ] SOC 2 Type II compliance ready
- [ ] No PII exposed in logs
- [ ] Zero code vulnerabilities
- [ ] Zero dependency vulnerabilities
- [ ] Input validation on all endpoints
- [ ] Secure authentication (JWT + refresh tokens)

### 3. Performance (TOP PRIORITY)
- [ ] Dashboard load time < 2 seconds
- [ ] API response time < 500ms (p95)
- [ ] First Contentful Paint < 1.5 seconds
- [ ] Time to Interactive < 3 seconds
- [ ] 99.9% uptime SLA

### 4. Code Quality (CRITICAL)
- [ ] High code quality standards
- [ ] Zero tolerance for security vulnerabilities
- [ ] Comprehensive input validation
- [ ] Proper error handling

### 5. User Experience
- [ ] Zero training required for basic operations
- [ ] Mobile-responsive design
- [ ] Accessibility (WCAG 2.1 AA)
- [ ] Performance is a UX feature

### 6. Scalability
- [ ] Multi-tenant architecture
- [ ] Support 10,000+ resources per tenant
- [ ] Horizontal scaling capability
- [ ] Cloud migration ready

---

## Target Personas (All Use the Tool)

| Priority | Persona | Primary Need | Success Metric |
|----------|---------|--------------|----------------|
| P0 | Resource Manager | Allocate resources efficiently | Time to staff < configurable SLA |
| P0 | Practice Head | Maximize practice utilization | Utilization at optimal % |
| P0 | COO/Delivery Head | Operational efficiency | Real-time visibility |
| P1 | Project Manager | Staff projects on time | 100% staffed projects |
| P1 | CFO | Revenue predictability | Forecast accuracy > 95% |
| P1 | HR/Talent | Hiring needs visibility | Proactive planning |
| P2 | CEO | Strategic workforce planning | Decision support |
| P2 | Individual Employee | Career visibility | Allocation transparency |

**Check Signer:** C-Level (COO/CFO)
**Purchase Champion:** The product itself (PLG approach)

---

## Intelligence Approach

| Type | Description | When |
|------|-------------|------|
| **Rules-Based** | Configurable business rules | Day 1 value |
| **ML-Based** | Learns from data patterns | As data accumulates |

**Key Intelligence Features:**
- Smart resource matching with scoring
- Optimal utilization suggestions (dynamic, not hardcoded)
- Predictive bench alerts
- Skill gap detection
- All thresholds configurable, not hardcoded

---

## Development Timeline (14 Days)

| Day | Focus |
|-----|-------|
| 1 | Foundation & Infrastructure |
| 2 | Multi-Tenant Core & Authentication |
| 3 | Data Model Complete & RBAC |
| 4 | API Layer - Core CRUD |
| 5 | Frontend Core & Layout |
| 6 | Resource Management UI |
| 7 | Project & Client Management UI |
| 8 | Allocation Management |
| 9 | Bench Management & Availability |
| 10 | Intelligence Layer (Rules-Based) |
| 11 | Dashboards & Analytics |
| 12 | Reporting & Export |
| 13 | Admin & System Features |
| 14 | Polish, Testing & Security Hardening |

See [FEATURE_SCOPE.md](./FEATURE_SCOPE.md) for detailed breakdown.

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + Vite + TypeScript |
| **UI Components** | shadcn/ui + TailwindCSS |
| **State** | TanStack Query + Zustand |
| **Backend** | Node.js + Express + TypeScript |
| **API** | REST (mutations) + GraphQL (queries) |
| **Database** | PostgreSQL 16 |
| **ORM** | Prisma |
| **Cache** | Redis |
| **Auth** | JWT + Refresh Tokens (HttpOnly cookies) |
| **Password** | Argon2 |
| **Hosting** | Docker + Ubuntu Server (initial) |
| **CI/CD** | GitHub Actions |

See [TECH_STACK.md](./TECH_STACK.md) for complete details.

---

## In Scope (Core Features)

1. ✅ **Contract Management** - MSA/SOW lifecycle, renewals, Client→Contract→Project hierarchy
2. ✅ **Timesheet Management** - Time entry, approval workflows, billable tracking
3. ✅ **Integration API** - RMGaaS as data provider to external systems
4. ✅ **Integration Readiness** - PeopleStrong (HRMS), HubSpot (CRM) integration patterns

## Out of Scope (v1)

1. ❌ Native mobile apps (responsive web only)
2. ❌ Invoicing/Billing (track hours, invoicing in ERP)
3. ❌ Multi-language (English only)
4. ❌ Multi-currency (single currency per tenant)
5. ❌ On-premise deployment (later consideration)
6. ❌ Advanced ML models (rules-based first)
7. ❌ Client portal
8. ❌ Talent marketplace

---

## Domain Terminology

| Term | Definition |
|------|------------|
| **Resource** | Any person who can be allocated (FTE, contractor, consultant) |
| **Allocation** | Assignment of a resource to a project with %, dates, role |
| **Utilization** | Percentage of time a resource is allocated to billable work |
| **Bench** | Resources not currently allocated to any project |
| **Billable** | Work that can be charged to a client |
| **Practice** | Organizational unit grouping resources by skill |
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
| Org technical strength visibility | Not possible | Instant |
| Future availability by skill | Manual tracking | Automated forecast |

---

## First Customer

**NewVision Software** - Internal dogfooding
- ~727 employees (FTE + Consultants)
- Real data from Excel file validated
- Practices: Data Engineering, Microsoft, AWS, etc.

---

## Deployment Path

| Phase | Environment |
|-------|-------------|
| **Initial** | Ubuntu server (office network) |
| **Future** | Cloud platform (AWS/Azure/GCP) |

Architecture is cloud-ready from day 1.

---

## Reference Documents

| Document | Description |
|----------|-------------|
| [PRODUCT_STRATEGY.md](./PRODUCT_STRATEGY.md) | Market, positioning, GTM |
| [USE_CASES.md](./USE_CASES.md) | Complete use case framework |
| [FEATURE_SCOPE.md](./FEATURE_SCOPE.md) | 14-day feature breakdown |
| [TECH_STACK.md](./TECH_STACK.md) | Technology choices |
| [INTEGRATIONS.md](./INTEGRATIONS.md) | Integration strategy (PeopleStrong, HubSpot) |
| [SECURITY_REQUIREMENTS.md](./SECURITY_REQUIREMENTS.md) | Security requirements |
| [BRAND_GUIDELINES.md](./BRAND_GUIDELINES.md) | UI/UX guidelines |
| [DECISIONS_LOG.md](./DECISIONS_LOG.md) | All decisions |
| [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md) | ADRs |
| [DATA_MODEL.md](./DATA_MODEL.md) | Entity specifications |
| [API_CONTRACTS.md](./API_CONTRACTS.md) | API specifications |
| [CODING_STANDARDS.md](./CODING_STANDARDS.md) | Development guidelines |
| [WORKFLOWS.md](./WORKFLOWS.md) | Business processes |

---

## Constraints & Assumptions

### Constraints
- Initial deployment on single Ubuntu server (scale later)
- AI-led development (Cursor)
- Must handle NewVision's data (~727 resources) as first customer
- 14-day development timeline

### Assumptions (Validated)
- ✅ Resource Managers want to replace Excel - ABSOLUTELY VALIDATED
- ✅ Users need real-time dashboards - VALIDATED
- ⚙️ Utilization target - DYNAMIC (not hardcoded 85%)
- ⚙️ Staffing SLA - CONFIGURABLE (not hardcoded 48 hours)

---

*Last Updated: 2025-12-15*
*Version: 2.0*
*Status: APPROVED (Post Strategic Session)*
