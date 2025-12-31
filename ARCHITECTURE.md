# RMGaaS Master Architecture Document

> **⚠️ THIS IS THE SOURCE OF TRUTH**  
> All AI sessions MUST read this file first.  
> All architectural decisions are recorded here.  
> Update this document when decisions change.

**Last Updated:** December 31, 2025  
**Version:** 2.0.0

---

## 📖 How to Use This Document

### For AI Assistants (Claude, GPT, etc.)
1. **READ THIS ENTIRE FILE** at the start of every session
2. Decisions here override any assumptions
3. If uncertain, ask—don't assume
4. Update this file when new decisions are made

### For Human Developers
1. This is the architectural truth
2. Code must align with these decisions
3. Propose changes via discussion, then update here

---

## 🏛️ Platform Architecture

### Two-Portal Model (DECISION: December 31, 2025)

```
┌─────────────────────────────────────────────────────────────────┐
│  PLATFORM PORTAL (platform.product.com)                         │
│  Owner: NewVision                                               │
├─────────────────────────────────────────────────────────────────┤
│  • Tenant provisioning & lifecycle                              │
│  • Subscription tier & feature flags                            │
│  • Billing & invoicing                                          │
│  • Create first admin user per tenant                           │
│  • Support tools (impersonation, logs)                          │
│  • Cross-tenant analytics & health                              │
│  • Platform configuration                                       │
│                                                                 │
│  Users: NewVision staff only                                    │
│  Security: Isolated, god-mode access                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Tenant shell created
                              │ Admin credentials provided
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  TENANT APPLICATION (app.product.com)                           │
│  Owner: Customer Organization                                   │
├─────────────────────────────────────────────────────────────────┤
│  ALL USERS:                                                     │
│  • Dashboard, Requests, Timesheets, My Approvals                │
│  • Resource search, Project views                               │
│  • Personal settings, notifications                             │
│                                                                 │
│  MANAGERS: (+ above)                                            │
│  • Team views, approval queues                                  │
│  • Reports for their scope                                      │
│  • Bench management for their team                              │
│                                                                 │
│  TENANT ADMIN: (+ above)                                        │
│  • Organization Onboarding & Setup                              │
│  • User management, role assignment                             │
│  • Workflow builder, approval chains                            │
│  • System settings, integrations                                │
│  • Audit logs, compliance                                       │
└─────────────────────────────────────────────────────────────────┘
```

**Rationale:** 
- Tenant Admin IS a tenant user (they also approve, view dashboards)
- Platform Admin is fundamentally different (cross-tenant, billing, support)
- Security boundary: Platform has god-mode, must be isolated

---

## 🎯 Product Vision

### The Writer + Scribe Model

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   WRITER (Core Product)              SCRIBE (AI Layer)         │
│   ━━━━━━━━━━━━━━━━━━━━━              ━━━━━━━━━━━━━━━━━          │
│                                                                 │
│   • Resource Management              • Natural Language Input   │
│   • Request & Approval Flows         • Smart Suggestions        │
│   • Workflow Engine                  • Conversational Setup     │
│   • Analytics & Reports              • Predictive Insights      │
│   • Document Management              • Voice Commands           │
│                                                                 │
│   ✅ MUST work independently         ✅ Accelerates everything  │
│   ✅ Complete UX without AI          ✅ Optional, not required  │
│   ✅ Full feature set always         ✅ Same outcome, faster    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Core Principles

| Principle | Description |
|-----------|-------------|
| **Product Stands Alone** | If AI APIs go down, users remain fully productive |
| **AI is Accelerator** | AI makes things faster, never gates functionality |
| **Two Complete Paths** | Traditional UI and AI are both first-class citizens |
| **AI Outputs → Traditional UI** | AI pre-fills forms, user reviews in familiar interface |
| **Same Data, Same Rules** | AI cannot bypass validation, permissions, or approvals |

### The Litmus Test

> "If OpenAI's API went down for a week, would users still be productive?"
> 
> **Answer: YES** — They use traditional UI, just slower for some tasks.

---

## 🏗️ AI Role by Product Phase

### Phase Definitions

| Phase | Duration | AI Role | Manual Fallback |
|-------|----------|---------|-----------------|
| **Onboarding** | 1-2 weeks | **PRIMARY** (Recommended Path) | Full manual wizard available |
| **Workflow Configuration** | Periodic | **PRIMARY** (Recommended Path) | Visual builder + templates |
| **Daily Operations** | Ongoing | **OPTIONAL** (Accelerator) | Complete traditional UI |
| **Configuration Changes** | As needed | **ASSISTANT** (Helper) | Settings panels |

---

## 🏢 Organization Onboarding Module (DECISION: December 31, 2025)

### The Problem We're Solving

Every feature assumes organizational context exists, but we never built the module 
that creates that context. The Workflow Builder has an empty "Select Role" dropdown
because no roles exist in the tenant.

### Onboarding Approach: Flexible with Guardrails (Option B)

- Can jump between phases
- System warns about missing dependencies
- Example: "You're creating a workflow, but you have no roles defined. Create roles first?"

### Organization Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  TENANT (Company boundary)                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  ORGANIZATIONAL STRUCTURE                                 │  │
│  │  - Departments / Business Units                           │  │
│  │  - Teams                                                  │  │
│  │  - Reporting hierarchy                                    │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │  ROLES & PERMISSIONS                                      │  │
│  │  - System roles (Admin, Manager, User)                    │  │
│  │  - Business roles (PM, Resource Manager, etc.)            │  │
│  │  - Custom roles per organization                          │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │  PEOPLE                                                   │  │
│  │  - Users (login accounts)                                 │  │
│  │  - Resources (people who do trackable work)               │  │
│  │  - Mapping: User ↔ Resource (optional 1:1)                │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │  GOVERNANCE RULES                                         │  │
│  │  - Approval chains                                        │  │
│  │  - Delegation rules                                       │  │
│  │  - SLA configurations                                     │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Onboarding Phases

| Phase | Name | What's Defined | Writer Path | Scribe Path |
|-------|------|----------------|-------------|-------------|
| 1 | **Tenant Provisioning** | Tenant record, admin user | Automatic | Automatic |
| 2 | **Organization Identity** | Company name, industry, size, fiscal settings | Simple form (5 min) | "Tell me about your company" |
| 3 | **Org Structure** | Departments, teams, hierarchy | Tree builder / CSV import | "Upload your org chart" / Natural language |
| 4 | **Roles & Permissions** | System + Business roles | Template selection + customize | "Who approves what at your company?" |
| 5 | **People Setup** | Users + Resources + Mapping | Manual entry / Bulk import | "Import from this spreadsheet" |
| 6 | **Governance Rules** | Workflows, approvals, SLA | Workflow Builder UI | "Describe your approval process" |

### User vs Resource: Critical Distinction

```
USER = Login account                    RESOURCE = Person who does work
├── Email, password/SSO                 ├── Employee ID, skills, rates
├── System role (permissions)           ├── Department, team, manager
├── App preferences                     ├── Business role(s)
└── May or may not be a Resource        ├── Availability calendar
                                        └── May or may not have a User account

MAPPING SCENARIOS:
• User WITH Resource: Employee who logs in AND does tracked work
• User WITHOUT Resource: Admin who manages but isn't tracked for utilization
• Resource WITHOUT User: Contractor tracked in system but has no login
```

### Two Types of Roles

```
SYSTEM ROLES (What can they DO in the app)    BUSINESS ROLES (What ARE they in the org)
├── Super Admin → Everything                   ├── Project Manager
├── Admin → Manage org, users, settings        ├── Resource Manager
├── Manager → Approve, reports, manage team    ├── Practice Lead
├── User → Self-service, own data              ├── Account Manager
└── Read Only → Dashboard only                 ├── Team Lead
                                               ├── Individual Contributor
                                               └── [Custom roles...]

A person can have: ONE system role + MULTIPLE business roles
Example: "Sarah is a User (system) who is PM AND Team Lead (business)"
```

### Phase Dependencies

```
Phase 1 ─► Phase 2 ─► Phase 3 ─► Phase 4 ─► Phase 5 ─► Phase 6
Tenant     Identity   Structure   Roles      People     Governance
                          │          │          │
                          └──────────┴──────────┘
                             Interconnected:
                             - Roles need structure context
                             - People need roles + structure
                             - Governance needs all above
```

### Implementation Status

| Phase | Backend | Frontend | Status |
|-------|---------|----------|--------|
| Phase 1: Tenant Provisioning | ✅ Exists (seed script) | ❌ No UI | Platform Portal needed |
| Phase 2: Org Identity | ⚠️ Partial (Org model exists) | ❌ No UI | **NEEDS BUILDING** |
| Phase 3: Org Structure | ⚠️ Partial (Team model exists) | ❌ No UI | **NEEDS BUILDING** |
| Phase 4: Roles & Permissions | ✅ Complete | ⚠️ Settings page exists | **NEEDS ONBOARDING FLOW** |
| Phase 5: People Setup | ✅ Complete | ⚠️ Users page exists | **NEEDS ONBOARDING FLOW** |
| Phase 6: Governance | ✅ Complete | ✅ Workflow Builder exists | Works, but needs roles first |

---

## 🚀 Platform Portal Phasing (DECISION: December 31, 2025)

### Phase 0: Now (Development)
**No portal.** Seed scripts + direct DB access.
- ✅ Already have this

### Phase 1: Private Beta (First Customers)
**Minimal internal tool.** NewVision staff only.
```
/platform (protected, internal only)
├── /tenants          → List, create, edit tenants
├── /tenants/:id      → View tenant details, feature flags
└── /users            → Create admin users for tenants
```
- Simple CRUD, no billing integration
- Authentication: NewVision employee accounts only
- **Effort: 1-2 weeks**

### Phase 2: Paid Launch
**Add billing + support tools.**
```
/platform
├── /tenants          → + subscription management
├── /billing          → Stripe/payment integration
├── /support          → Impersonation, audit logs
└── /analytics        → Cross-tenant health metrics
```
- **Effort: 3-4 weeks**

### Phase 3: Self-Service (Scale)
**Public signup flow.**
```
signup.product.com
├── Plan selection
├── Payment
├── Tenant auto-provisioning
└── Redirect to onboarding
```
- **Effort: 2-3 weeks**

---

### Onboarding Flow UI

```
┌─────────────────────────────────────────────────────────────────┐
│                    FIRST-TIME SETUP                             │
│                                                                 │
│   🤖 "Hi! Let's set up your workspace in about 30 minutes.     │
│       I'll ask a few questions and configure everything."       │
│                                                                 │
│   [Start AI-Guided Setup]  ← PRIMARY, prominent, recommended   │
│                                                                 │
│   ─────────────── or ───────────────                           │
│                                                                 │
│   [Set up manually]  ← Available, smaller, complete            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

AI Path:  Interview → AI Configures → User Reviews → Done (30 min)
Manual:   Wizard → Fill Forms → Configure → Done (2+ hours)
```

### Workflow Creation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                  CREATE NEW WORKFLOW                            │
│                                                                 │
│   "Describe what should happen..."                             │
│   ┌───────────────────────────────────────────────────────────┐│
│   │ When someone requests time off, their manager should      ││
│   │ approve it. If more than 5 days, HR needs to approve too. ││
│   └───────────────────────────────────────────────────────────┘│
│                                                                 │
│   [Generate Workflow]  ← AI creates, user reviews              │
│                                                                 │
│   ─────────────── or ───────────────                           │
│                                                                 │
│   [Build from scratch]   [Use template]  ← Manual options      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

AI Path:  Describe → AI Generates → Review on Canvas → Save
Manual:   Open Canvas → Drag Nodes → Connect → Configure → Save
```

### Daily Operations

```
┌─────────────────────────────────────────────────────────────────┐
│                    DAILY TASK: Create Request                   │
│                                                                 │
│  TRADITIONAL PATH                 AI-ASSISTED PATH              │
│  ─────────────────                ────────────────              │
│  1. Click "New Request"           1. Type: "I need 2 senior    │
│  2. Select type                      Java devs for Project X   │
│  3. Fill form                        starting next month"       │
│  4. Review                        2. AI pre-fills form          │
│  5. Submit                        3. Review (same UI)           │
│                                   4. Submit                     │
│                                                                 │
│  ↓                                ↓                             │
│  ════════════ SAME OUTCOME ═══════════                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Current Implementation Status

### Backend Status: ✅ STRONG

| Module | Status | Lines | Routes | Notes |
|--------|--------|-------|--------|-------|
| **auth** | ✅ Complete | ~500 | 6 | JWT + Microsoft SSO |
| **resources** | ✅ Complete | ~900 | 12 | Full CRUD + skills |
| **projects** | ✅ Complete | ~800 | 10 | Full CRUD + phases |
| **allocations** | ✅ Complete | ~800 | 8 | Full lifecycle |
| **clients** | ✅ Complete | ~600 | 8 | Full CRUD |
| **contracts** | ✅ Complete | ~700 | 10 | Full CRUD + lifecycle |
| **timesheets** | ✅ Complete | ~600 | 8 | Entry + approval |
| **requests** | ✅ Complete | ~3,500 | 45 | Full workflow engine |
| **roles** | ✅ Complete | ~600 | 11 | 30+ permissions |
| **documents** | ✅ Complete | ~800 | 11 | Upload + versioning |
| **currency** | ✅ Complete | ~600 | 12 | Multi-currency |
| **analytics** | ✅ Complete | ~600 | 6 | Reports + dashboards |
| **agent** | ⚠️ Simulated | ~670 | 9 | Pattern matching only |
| **intelligence** | ⚠️ Simulated | ~1,270 | 4 | Rule-based scoring |
| **ai-migration** | ⚠️ Simulated | ~1,800 | 4 | Regex patterns |

**Total: 22 modules, 99 API endpoints, 55 database models, ~15,000+ lines**

### Frontend Status: ⚠️ GOOD (85% Complete)

| Component | Status | Notes |
|-----------|--------|-------|
| **Auth & Login** | ✅ Complete | JWT + Microsoft SSO |
| **Dashboard** | ✅ Complete | Overview widgets |
| **Resources** | ✅ Complete | List + detail |
| **Projects** | ✅ Complete | List + detail |
| **Allocations** | ✅ Complete | List + create |
| **Clients** | ✅ Complete | List + detail |
| **Contracts** | ✅ Complete | List + detail |
| **Timesheets** | ✅ Complete | Entry + submission |
| **Bench** | ✅ Complete | Analysis view |
| **Reports** | ✅ Complete | Report builder |
| **Analytics** | ✅ Complete | Charts + metrics |
| **Smart Search** | ✅ Complete | Uses agent API |
| **Data Management** | ✅ Complete | Import/export |
| **Settings** | ✅ Basic | Needs expansion |
| **Requests UI** | ✅ Complete | List, detail, create, approve |
| **Sidebar** | ✅ Complete | Reorganized logically |
| **Workflow Builder** | ⚠️ Placeholder | Needs visual canvas |
| **Permission System** | ❌ **MISSING** | No frontend enforcement |
| **Real-time Notifications** | ❌ **MISSING** | Static mock data |
| **AI Streaming** | ❌ **MISSING** | No SSE support |

### AI Layer Status: ❌ NOT IMPLEMENTED

| Component | Current State | Required State |
|-----------|--------------|----------------|
| **LLM Integration** | ❌ None | OpenAI/Anthropic API |
| **Streaming Responses** | ❌ None | SSE infrastructure |
| **Vector Database** | ❌ None | pgvector for RAG |
| **Conversation Memory** | ⚠️ Schema exists | Need LLM integration |
| **Onboarding Agent** | ❌ None | Interview + configure |
| **Workflow Agent** | ❌ None | Describe + generate |

---

## 🛠️ Technology Stack

### Backend (Confirmed)
```
Runtime:        Node.js 20+
Framework:      Express.js
Language:       TypeScript 5.x
Database:       PostgreSQL 15+
ORM:            Prisma
Cache:          Redis
Auth:           JWT + Microsoft MSAL
API Style:      REST
```

### Frontend (Confirmed)
```
Framework:      React 18
Build Tool:     Vite
Language:       TypeScript 5.x
State:          Zustand (auth) + TanStack Query (server state)
Styling:        Tailwind CSS
Components:     shadcn/ui (Radix primitives)
Forms:          React Hook Form + Zod
Charts:         Recharts
Animations:     Framer Motion
```

### AI Layer (Planned)
```
LLM Provider:   [DECISION NEEDED] OpenAI / Anthropic / Google
Vector DB:      pgvector (PostgreSQL extension)
Streaming:      Server-Sent Events (SSE)
Embeddings:     text-embedding-3-small (OpenAI) or equivalent
Canvas Library: React Flow (XYFlow) for workflow builder
```

---

## 🔐 Permission System Architecture

### Backend (Implemented ✅)

**Permission Format:** `module:action:scope`

```typescript
// Examples
'resources:read'           // Read all resources
'resources:read:team'      // Read team resources only
'allocations:approve'      // Approve allocations
'timesheets:approve:team'  // Approve team timesheets
'settings:update'          // Modify settings
```

**Hierarchy:** Organization → Delivery → Practice → Team → Individual

### Frontend (To Be Implemented ❌)

**Architecture: React Query + Permission Hook**

```typescript
// usePermissions hook (to be built)
const { can, cannot, isLoading } = usePermissions();

// Usage in components
{can('requests:approve') && <ApproveButton />}

// Permission gate component (to be built)
<CanAccess permission="admin.settings">
  <AdminPanel />
</CanAccess>
```

---

## 🌊 Implementation Roadmap (UPDATED: December 31, 2025)

### Critical Path Identified

```
┌─────────────────────────────────────────────────────────────────┐
│  CAN'T LAUNCH WITHOUT THESE (in order):                         │
├─────────────────────────────────────────────────────────────────┤
│  1. Organization Onboarding Module (Tenant App)                 │
│     └── Without this, product doesn't work (empty dropdowns)    │
│                                                                 │
│  2. Platform Portal Phase 1 (NewVision Internal)                │
│     └── Without this, can't provision customers                 │
│                                                                 │
│  3. AI Layer (Optional for launch, but differentiator)          │
│     └── Accelerates onboarding, not required                    │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 0: Foundation ✅ COMPLETE (December 31, 2025)

| Priority | Task | Effort | Status |
|----------|------|--------|--------|
| 0.1 | **Organization Identity UI** | 2-3 days | ✅ DONE (IdentityPhase.tsx) |
| 0.2 | **Org Structure Builder** | 3-5 days | ✅ DONE (StructurePhase.tsx) |
| 0.3 | **Role Setup Flow** | 2-3 days | ✅ DONE (RolesPhase.tsx) |
| 0.4 | **User/Resource Setup Flow** | 2-3 days | ✅ DONE (PeoplePhase.tsx) |
| 0.5 | **Onboarding Wizard (connects above)** | 3-5 days | ✅ DONE (OnboardingWizard.tsx) |
| 0.6 | **Seed Default Data per Tenant** | 1-2 days | ✅ DONE (seed-defaults endpoints) |
| 0.7 | **Governance Rules** | 1-2 days | ✅ DONE (GovernancePhase.tsx) |

**Milestone:** ✅ New tenant can go from "empty shell" to "working organization"

**Implementation Details:**
- Backend: 50+ API endpoints in `/api/v1/onboarding/*`
- Frontend: 13 files, ~5,500 lines in `/features/onboarding/`
- Database: 8 new tables (TenantProfile, Department, Team, CostCenter, BusinessRole, GradeBand, etc.)
- Route: `/onboarding` with admin-only access

### Phase 1: Complete the Writer (Traditional UI)

| Priority | Task | Effort | Dependencies | Status |
|----------|------|--------|--------------|--------|
| 1.1 | **Request Flow UI** | 3-5 days | Backend ready | ✅ DONE |
| 1.2 | **Sidebar Reorganization** | 1 day | None | ✅ DONE |
| 1.3 | **Permission System (Frontend)** | 2-3 days | Backend ready | ⏳ Pending |
| 1.4 | **Workflow Builder (Visual)** | 5-7 days | React Flow | ✅ DONE |
| 1.5 | **Real-time Notifications** | 2-3 days | Backend ready | ⏳ Pending |
| 1.6 | **Settings Expansion** | 2 days | None | ✅ DONE |

**Milestone:** Full product works without any AI

### Phase 1.5: Platform Portal (Minimum Viable)

| Priority | Task | Effort | Status |
|----------|------|--------|--------|
| 1.5.1 | **Tenant List/Create/Edit** | 2-3 days | ❌ NOT STARTED |
| 1.5.2 | **Feature Flags per Tenant** | 1-2 days | ❌ NOT STARTED |
| 1.5.3 | **Admin User Creation** | 1 day | ❌ NOT STARTED |
| 1.5.4 | **NewVision Auth (separate)** | 1-2 days | ❌ NOT STARTED |

**Milestone:** NewVision can provision customers without scripts

### Phase 2: Add the Scribe (AI Layer)

| Priority | Task | Effort | Dependencies |
|----------|------|--------|--------------|
| 2.1 | **LLM Integration Service** | 3-5 days | API keys |
| 2.2 | **SSE Streaming Infrastructure** | 2-3 days | None |
| 2.3 | **Vector Database (pgvector)** | 2-3 days | PostgreSQL |
| 2.4 | **Update Agent Module** | 3-5 days | LLM service |
| 2.5 | **Onboarding Agent** | 5-7 days | All above |
| 2.6 | **Workflow Agent** | 5-7 days | Workflow builder |

**Milestone:** AI accelerates all functions

### Phase 3: Polish & Optimize

| Priority | Task | Effort |
|----------|------|--------|
| 3.1 | Response caching | 2 days |
| 3.2 | Cost optimization | 2 days |
| 3.3 | Fallback handling | 2 days |
| 3.4 | Analytics & monitoring | 2 days |

---

## 📐 AI Principles (Locked)

### Core Principles

| # | Principle | Description |
|---|-----------|-------------|
| 1 | **Simplify** | Reduce complexity, not add it |
| 2 | **Cognitive** | Understand intent, not just commands |
| 3 | **Informed Decisions** | Surface insights with sources |
| 4 | **Human Authority** | AI assists, humans decide |
| 5 | **Role-Bound Actions** | AI respects permission boundaries |
| 6 | **Transparent** | Explain reasoning, cite sources |
| 7 | **Non-Intrusive** | Proactive but not annoying |

### Security Principles

| # | Principle | Description |
|---|-----------|-------------|
| 8 | **AI Integrity** | Cannot be manipulated to bypass rules |
| 9 | **Data Boundaries** | Same access control as UI |
| 10 | **Action Classification** | Tiered confirmation based on impact |
| 11 | **Full Audit Trail** | Every AI action logged |
| 12 | **Rate Limited** | Abuse prevention |
| 13 | **Accuracy Labeling** | Fact vs inference vs suggestion |
| 14 | **PII Protection** | Sanitize, mask, never leak |
| 15 | **Tenant Isolation** | Strict multi-tenant boundaries |

### Action Tiers

| Tier | Type | Confirmation | Examples |
|------|------|--------------|----------|
| 1 | Read-Only | None | Search, view, analyze |
| 2 | Reversible | Soft (undo available) | Draft creation, preferences |
| 3 | Impactful | Hard (explicit yes) | Create, update, delete |
| 4 | Forbidden | AI cannot do | Approve, reject, delete users |

---

## 🚫 What AI CANNOT Do (Hard Rules)

1. **Approve or reject** any workflow step
2. **Complete workflows** on behalf of users
3. **Override permissions** or escalate access
4. **Act without confirmation** for Tier 3+ actions
5. **Hide reasoning** - transparency mandatory
6. **Access data** user cannot see
7. **Submit requests** without user review
8. **Bypass validation** rules
9. **Impersonate** other users
10. **Delete** critical data

---

## 📁 Key File Locations

### Backend
```
apps/api/
├── prisma/schema.prisma          # 55 database models
├── src/index.ts                  # Entry point
├── src/config/env.ts             # Environment config
├── src/lib/
│   ├── prisma.ts                 # Database client
│   ├── redis.ts                  # Cache client
│   └── jwt.ts                    # Auth utilities
├── src/middleware/
│   ├── auth.ts                   # Auth middleware
│   └── errorHandler.ts           # Error handling
└── src/modules/
    ├── agent/                    # AI chat (simulated)
    ├── intelligence/             # Smart matching (rule-based)
    ├── requests/                 # Full request workflow
    └── [18 more modules...]
```

### Frontend
```
apps/frontend/
├── src/App.tsx                   # Router
├── src/stores/authStore.ts       # Auth state (Zustand)
├── src/lib/api.ts                # API client
├── src/components/
│   ├── layout/MainLayout.tsx     # App shell
│   ├── agent/                    # AI widgets
│   └── ui/                       # shadcn components
├── src/pages/                    # 18 page components
└── src/hooks/                    # [EMPTY - needs hooks]
```

### Documentation
```
docs/
├── ARCHITECTURE.md               # THIS FILE - source of truth
├── WORKFLOW_ENGINE_DESIGN.md     # Workflow engine specs
├── AI_PRINCIPLES_AND_SECURITY.md # AI guidelines
├── PLANNING_INTELLIGENT_UI.md    # Permission system design
└── COMPREHENSIVE_AUDIT_REPORT.md # Full system audit
```

---

## 🔄 Change Log

| Date | Version | Change | Author |
|------|---------|--------|--------|
| 2025-12-31 | 2.1.0 | **Phase 0 COMPLETE:** Full Organization Onboarding implementation - Backend (50+ endpoints, 8 DB tables) + Frontend (13 files, ~5,500 lines, 5-phase wizard). Critical blocker resolved. | AI Assistant |
| 2025-12-31 | 2.0.0 | **Major Update:** Added Organization Onboarding module design, Two-Portal architecture (Platform + Tenant App), Platform Portal phasing, Updated roadmap with Phase 0 (blocking), User/Resource distinction, System vs Business roles | AI Assistant |
| 2025-12-30 | 1.2.0 | E2E tests, K8s manifests, CI/CD, Health endpoints, Dashboard widgets, Settings components, Workflow Builder | AI Assistant |
| 2025-12-18 | 1.1.0 | Request Flow UI complete, Sidebar reorganized | AI Assistant |
| 2025-12-18 | 1.0.0 | Initial architecture document | AI Assistant |

---

## ❓ Pending Decisions

| Decision | Options | Status | Notes |
|----------|---------|--------|-------|
| **Product Name** | TBD | ⏳ Needs decision | "More than RMG" - broader scope |
| **LLM Provider** | OpenAI, Anthropic, Google | ⏳ Needs decision | |
| **Vector DB** | pgvector, Pinecone, Weaviate | ✅ Decided: pgvector | |
| **Streaming Protocol** | SSE, WebSocket | ✅ Decided: SSE | |
| **Onboarding Approach** | Strict wizard, Flexible, Minimal | ✅ Decided: Flexible with Guardrails | Option B |
| **Portal Architecture** | Single app, Separate admin, Single + Platform | ✅ Decided: Single App + Platform Portal | Option 3 |

---

## 📋 Session Checklist for AI Assistants

Before starting any work, verify:

- [ ] Read this entire ARCHITECTURE.md file
- [ ] Understand Writer + Scribe model
- [ ] Understand Two-Portal architecture (Platform vs Tenant App)
- [x] ~~Organization Onboarding phases and dependencies~~ **✅ COMPLETE (Phase 0 Done)**
- [ ] Know what's implemented vs missing
- [ ] Check pending decisions
- [ ] Respect AI principles and boundaries

### Current Priority (After Phase 0 Completion)
1. **Phase 1.5: Platform Portal** - NewVision needs to provision customers
2. **Phase 2: AI Layer** - LLM integration, onboarding agent
- [ ] Update this file if decisions change

---

*This document is the single source of truth for the product architecture.*
*Product name pending - currently referred to as "RMGaaS" in codebase.*
