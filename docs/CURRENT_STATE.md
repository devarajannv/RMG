# RMGaaS Current State

> Last Updated: December 19, 2025

## Product Overview

RMGaaS (Resource Management as a Service) is a comprehensive resource management platform for NewVision Software Pvt. Ltd. The product has completed its initial 14-day development sprint and has now implemented the first 10 features from the feature expansion discussions.

---

## Recent Changes (December 19, 2025)

### Workflow Builder (Visual Canvas)
- ✅ Visual workflow list with status badges and step counts
- ✅ Search and filter workflows by status
- ✅ Create/Edit workflow form with validation
- ✅ Drag-and-drop step reordering (motion/react Reorder)
- ✅ Step configuration panel with 3 tabs (Basic, Advanced, Timing & SLA)
- ✅ Approver types: Role, User, Dynamic
- ✅ Approval modes: Any, All, Majority, First Response
- ✅ SLA, auto-approve, reminders, and escalation configuration
- ✅ 12 tests covering core functionality
- ✅ Connected to existing `/api/v1/approval-chains` API

---

## Recent Changes (December 18, 2025)

### Real-time Notifications (WebSocket)
- ✅ WebSocket server at `/ws` with JWT authentication
- ✅ Room-based message routing (user + tenant rooms)
- ✅ Heartbeat mechanism for connection health
- ✅ Auto-reconnection on client (5 attempts, 3s interval)
- ✅ `useWebSocket` and `useNotifications` hooks
- ✅ Live `NotificationPanel` component with real-time updates
- ✅ `NotificationBell` with animated badge and connection indicator
- ✅ Notification service emits WebSocket events

### Frontend Permission System
- ✅ `usePermissions` hook with React Query caching
- ✅ `<Can>`, `<Cannot>`, `<AdminOnly>`, `<ManagerOnly>` gate components
- ✅ 50+ permission constants defined
- ✅ Navigation sidebar filtered by permissions
- ✅ ResourcesPage and RequestsPage actions permission-gated
- ✅ Test infrastructure updated with permissions

---

## Recent Changes (December 17, 2025)

### Inactive/Former Employee Handling
- ✅ Dashboard "Total Resources" now shows only ACTIVE employees (655 active, 854 inactive/former)
- ✅ Added "inactive" count to dashboard metrics
- ✅ Resources API defaults to ACTIVE-only (use `includeInactive=true` to see all)
- ✅ Added "Show Former Employees" toggle on Resources page
- ✅ Visual distinction for former employees (opacity, gray background, "Former" badge)
- ✅ Cannot allocate inactive resources (validation with clear error message)
- ✅ Cannot mark resource INACTIVE if they have active allocations (must reassign first)
- ✅ All resource dropdowns (allocations, managers) show only active employees

### Authentication & Page Rendering
- ✅ Fixed login page flash/reload issue (auth store hydration)
- ✅ Fixed "Objects are not valid as a React child" error on Resources page (skills object handling)
- ✅ Fixed missing sidebar on Resources page (added MainLayout wrapper)
- ✅ Fixed Data Management navigation link mismatch

---

## Data Status

### CSV Import Complete (December 17, 2025)
- **Source File**: `Analysis Copy RMG_Master_File V2.csv`
- **Resources**: 1,509 (655 active, 854 inactive/former)
- **Clients**: 27
- **Projects**: 152
- **Skills**: 485
- **Practices**: 5 (AI & ML, Cloud, Data Engineering, Enterprise Applications, QA & Automation)
- **Locations**: 5 (Bangalore, Chennai, Hyderabad, Mumbai, Pune)
- **Bands**: 4 (E1-E2, E3-E4, M1-M2, M3+)

---

## Completed Development Phases

### ✅ Phase 1: Foundation (Days 1-2)
- Monorepo architecture (Turborepo)
- Database schema (20+ entities, Prisma)
- Authentication (JWT + Argon2)
- Docker setup (PostgreSQL + Redis)
- Frontend scaffolding (React + Vite + TailwindCSS)

### ✅ Phase 2: Core Features (Days 3-6)
- Resource CRUD with skills management
- Project management with client association
- Client management
- Allocation management
- Dashboard with KPIs
- Basic reporting

### ✅ Phase 3: Advanced Features (Days 7-9)
- Contract management (MSA/SOW/CR)
- Timesheet system (weekly entry, approvals)
- Bench management (5-tab analysis, alerts, forecast)
- Rolloff tracking
- Quick allocation

### ✅ Phase 4: Intelligence & Analytics (Days 10-11)
- Smart resource matching (scoring algorithm)
- Skill gap analysis
- Utilization insights
- Executive/Practice/Financial/Project Health dashboards

### ✅ Phase 5: Integrations (Day 12)
- CSV/JSON export (7 types)
- Bulk CSV import with validation
- Webhook system (15 event types)

### ✅ Phase 6: Production Ready (Days 13-14)
- Unit tests (261 tests passing)
- Integration tests
- Security validation
- API documentation (Swagger/OpenAPI)
- Production deployment configuration
- Microsoft 365 SSO integration

### ✅ Post-Sprint: UI/UX Audit & Fixes
- 103 UI issues identified and fixed
- Sidebar visibility on all pages
- New pages: SettingsPage, ProjectDetailPage, ClientDetailPage
- Functional search bar
- Consistent layout across application

### ✅ Feature Expansion: First 10 Items Completed

#### Multi-Currency Support
- Currency CRUD API (6 default currencies)
- Exchange rate management (manual rates)
- Rate conversion API (current and historical)
- Settings UI for currency management

#### Enhanced Role Management
- Decoupled role from designation
- Permission-based access control (30+ permissions)
- Role hierarchy (org → delivery → practice → team → individual)
- Role assignment audit trail
- Custom role creation with permission builder
- Settings UI for role management

#### Document Storage
- Document upload with version control
- Access control (role/user/practice-based)
- Document classification (public/internal/restricted/confidential)
- Access logging and audit trail
- Download with version history
- Storage abstraction (local, ready for S3/Azure)

#### AI Agent (Query-Only Phase 1)
- Self-routing LLM architecture (tier-based)
- Natural language queries for resources, projects, metrics
- Rich response formatting (text, tables, cards, gauges)
- Conversation tracking and history
- Feedback mechanism
- Floating widget UI (accessible from all pages)
- Command palette (Cmd+K shortcut)

---

## Current Architecture

### Backend (`apps/api`)
```
22 modules, 99+ endpoints
├── auth (including Microsoft SSO)
├── resources
├── projects
├── clients
├── allocations
├── dashboard
├── timesheets
├── bench
├── intelligence
├── analytics
├── export
├── import
├── webhooks
├── currency
├── roles
├── documents
├── agent
├── requests
├── notifications
└── approval-chains (workflow engine)
```

### Frontend (`apps/frontend`)
```
20 pages
├── LoginPage (with Microsoft SSO)
├── DashboardPage
├── ResourcesPage / ResourceDetailPage
├── ProjectsPage / ProjectDetailPage
├── ClientsPage / ClientDetailPage
├── AllocationsPage
├── ContractsPage / ContractDetailPage
├── BenchAnalysisPage
├── SmartSearchPage
├── TimesheetsPage
├── ReportsPage
├── AnalyticsPage
├── ExportImportPage (Data Management)
├── SettingsPage
├── RequestsPage / RequestDetailPage
└── WorkflowBuilderPage (NEW)
```

### Database
- PostgreSQL 16
- 20+ entities with multi-tenant isolation
- Audit logging enabled
- Soft delete pattern

---

## Access Information

### Application URLs
| Environment | URL |
|-------------|-----|
| Frontend | http://localhost:3001 |
| API | http://localhost:3000/api/v1 |
| API Docs | http://localhost:3000/api-docs |

### Test Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@newvision.com | Admin@123! |
| Manager | priya.sharma@newvision.com | Manager@123! |
| Resource | rahul.kumar@newvision.com | User@123! |

---

## Test Status

| Category | Count | Status |
|----------|-------|--------|
| Backend Unit Tests | 450+ | ✅ Passing |
| Backend Integration Tests | 70+ | ✅ Passing |
| Security Tests | 97 | ✅ Passing |
| SSO Tests | 44 | ✅ Passing |
| Frontend UI Tests | 204 | ✅ Passing |

### Frontend Test Coverage (18 Test Files)

| Page | Tests | Status |
|------|-------|--------|
| LoginPage | 15 | ✅ Passing |
| DashboardPage | 24 | ✅ Passing |
| ResourcesPage | 22 | ✅ Passing |
| ProjectsPage | 14 | ✅ Passing |
| ClientsPage | 16 | ✅ Passing |
| AllocationsPage | 16 | ✅ Passing |
| ContractsPage | 14 | ✅ Passing |
| SettingsPage | 15 | ✅ Passing |
| AnalyticsPage | 10 | ✅ Passing |
| BenchAnalysisPage | 14 | ✅ Passing |
| ReportsPage | 19 | ✅ Passing |
| TimesheetsPage | 8 | ✅ Passing |
| SmartSearchPage | 9 | ✅ Passing |
| ExportImportPage | 11 | ✅ Passing |
| ResourceDetailPage | 3 | ✅ Passing |
| ProjectDetailPage | 3 | ✅ Passing |
| ClientDetailPage | 2 | ✅ Passing |
| ContractDetailPage | 2 | ✅ Passing |

---

## Known Limitations

1. **Webhook Storage**: In-memory (should migrate to DB for production)
2. **Email Notifications**: Not implemented (placeholder)
3. **Migration Tool**: Basic CSV import only
4. **Invoicing Module**: Not implemented
5. **SettingsPage API Bug**: Currency/Roles queries expect raw arrays (documented for fix)

---

## Next Development Focus

See `NEXT_ACTIONS.md` for detailed roadmap including:
- Comprehensive RBAC enhancements
- HubSpot integration
- PeopleStrong sync
- Invoicing module
- Document management with e-signatures
- AI Agent development
- Multi-currency support

---

*Document maintained by AI development assistant*

