# Project Glossary

> **Standard terminology for RMGaaS**  
> **Last Updated:** 2025-12-06T00:00:00Z

---

## Business Terms

### Allocation
An assignment of a resource to a project for a specific time period and percentage.

**Example:** "John is allocated to Project Alpha at 50% from Jan 1 to Mar 31"

### Band / Grade
The seniority level of a resource, typically B1-B5 or similar.

| Band | Typical Title | Experience |
|------|---------------|------------|
| B1 | Junior | 0-2 years |
| B2 | Associate | 2-4 years |
| B3 | Senior | 4-7 years |
| B4 | Lead | 7-10 years |
| B5 | Principal | 10+ years |

### Bench
Resources without a billable project allocation. The "bench" is the collective pool of unallocated resources.

**Related metrics:**
- Bench Count: Number of resources on bench
- Bench Cost: Monthly cost of bench resources
- Bench Age: Days a resource has been on bench

### Billable
Work that can be charged to a client. Opposite of non-billable/internal.

### Capacity
The total available hours/percentage a resource can work. Usually 100% FTE.

### Chargeability
The percentage of a resource's time that is billable to clients.

**Formula:** `Chargeability = Billable Hours / Total Hours × 100`

### Client
An external organization that contracts for services.

### Employee ID (EID)
Unique identifier for a resource in HR systems.

### FTE
Full-Time Equivalent. 1 FTE = full-time work. 0.5 FTE = half-time.

### Ghost Billing
Billing for work not actually performed. Our system prevents this.

### Hard Allocation
A confirmed, committed assignment of a resource.

### Internal Project
Non-billable work such as training, R&D, or administrative tasks.

### Offshore / Onshore / Nearshore
Location-based designations for resources.

| Type | Definition |
|------|------------|
| Onshore | Same country as client |
| Nearshore | Adjacent region/timezone |
| Offshore | Different region, typically cost-optimized |

### Practice
A business unit organized around a skill domain (e.g., "Cloud Practice", "Data Practice").

### Resource
An employee or contractor who can be allocated to projects. The term "resource" is industry-standard for workforce planning, though we also use "team member" in user-facing contexts.

### Skill Matrix
A mapping of resources to their competencies and proficiency levels.

### Soft Allocation
A tentative, unconfirmed assignment that may change.

### Tentative
Status indicating an allocation is proposed but not confirmed.

### Utilization
The percentage of a resource's time that is allocated to any project (billable or not).

**Formula:** `Utilization = Allocated Hours / Available Hours × 100`

---

## Technical Terms

### ADR
Architecture Decision Record. A document capturing an important architectural decision.

### Context (in AI Development)
The background information an AI needs to generate appropriate code. Includes project structure, coding standards, and current state.

### Context File
A markdown file in `.context/` that stores project knowledge for AI consumption.

### CRUD
Create, Read, Update, Delete. The basic operations for data management.

### GraphQL
A query language for APIs that allows clients to request exactly the data they need.

### JWT
JSON Web Token. A compact, URL-safe means of representing claims between parties.

### Multi-Tenant
Architecture where a single instance serves multiple organizations with data isolation.

### Prisma
TypeScript ORM (Object-Relational Mapping) used for database access.

### RLS
Row-Level Security. PostgreSQL feature for fine-grained access control.

### Session (AI Development)
A period of work with AI assistance, bounded by ctx-start and ctx-end.

### shadcn/ui
A collection of reusable React components built with Radix UI and Tailwind CSS.

---

## Status Terms

### Status Indicators

| Emoji | Meaning |
|-------|---------|
| 🔴 | Not Started / Critical / Blocked |
| 🟠 | High Priority / Warning |
| 🟡 | In Progress / Medium |
| 🟢 | Complete / Low / Good |
| ⚪ | Not Applicable |

### Task Status

| Status | Meaning |
|--------|---------|
| Unclaimed | Available for anyone to take |
| Claimed | Someone is working on it |
| In Progress | Active development |
| In Review | PR submitted, awaiting review |
| Complete | Done and merged |
| Blocked | Cannot proceed, see BLOCKERS.md |

### Feature Status

| Status | Meaning |
|--------|---------|
| Not Started | No work done |
| In Progress | Being developed |
| Ready for QA | Dev complete, needs testing |
| In QA | Being tested |
| Ready for Release | QA passed |
| Released | In production |

---

## Acronyms

| Acronym | Full Form |
|---------|-----------|
| API | Application Programming Interface |
| CLI | Command-Line Interface |
| CI/CD | Continuous Integration / Continuous Deployment |
| CSV | Comma-Separated Values |
| DX | Developer Experience |
| EID | Employee ID |
| ESLint | ECMAScript Linter |
| FTE | Full-Time Equivalent |
| HMR | Hot Module Replacement |
| HR | Human Resources |
| KPI | Key Performance Indicator |
| MVP | Minimum Viable Product |
| ORM | Object-Relational Mapping |
| P0/P1/P2 | Priority levels (0 = highest) |
| PR | Pull Request |
| QA | Quality Assurance |
| REST | Representational State Transfer |
| RLS | Row-Level Security |
| RMG | Resource Management & Governance |
| SaaS | Software as a Service |
| SQL | Structured Query Language |
| SSO | Single Sign-On |
| UI | User Interface |
| UX | User Experience |

---

## NewVision Specific Terms

### NewVision
The organization building and using RMGaaS.

### RMGaaS
Resource Management & Governance as a Service. The product being built.

### Master File
The original Excel workbook used for resource management that RMGaaS replaces.

---

## Adding New Terms

When you encounter or create a new term:

1. Add it to the appropriate section above
2. Include a clear definition
3. Add examples if helpful
4. Create abbreviations entry if applicable
5. Commit with message: `docs: add glossary term [TERM]`
