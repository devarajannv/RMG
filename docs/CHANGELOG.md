# RMGaaS Changelog

> All notable changes to the RMGaaS project

---

## [Unreleased]

### Planned
- RBAC enhancements with hierarchical access
- Role management UI
- CTC access control workflow
- HubSpot integration
- PeopleStrong integration
- Invoicing module
- Document management with e-signatures
- Multi-currency support
- AI Agent
- AI-powered migration tool

---

## [1.1.0] - 2025-12-16

### Added
- **Microsoft 365 SSO Integration**
  - MSAL Node backend integration
  - MSAL Browser frontend integration
  - User provisioning from Azure AD
  - 15 SSO-specific tests
  - MICROSOFT_SSO_SETUP.md documentation

- **New Pages**
  - SettingsPage with 6 tabs (Profile, Notifications, Display, Security, Organization, Roles)
  - ProjectDetailPage with full project info and allocations
  - ClientDetailPage with contacts, contracts, and projects

- **UI Enhancements**
  - Functional search bar in header (navigates to Smart Search)
  - Clickable project cards → ProjectDetailPage
  - Clickable client cards → ClientDetailPage
  - Consistent sidebar visibility on all pages

- **Documentation**
  - CURRENT_STATE.md
  - SESSION_LOG.md
  - NEXT_ACTIONS.md
  - FEATURE_SCOPE.md (this file)
  - CHANGELOG.md

### Fixed
- Sidebar not visible on 6 pages (BenchAnalysis, SmartSearch, Reports, Analytics, DataManagement, Settings)
- User role display showing hardcoded "Administrator" instead of actual role
- API call patterns for params and responseType
- TypeScript environment variable typing (vite-env.d.ts)
- tsconfig.node.json compilation errors
- authApi.me() return type missing firstName/lastName
- 103 total UI issues identified and resolved

### Changed
- Export/Import renamed to Data Management in navigation
- All pages now wrapped in MainLayout for consistent layout

---

## [1.0.0] - 2025-12-16

### Added
- **Day 14: Production Deployment**
  - Production Dockerfiles for API and Frontend
  - docker-compose.prod.yml for orchestration
  - Nginx reverse proxy with SSL support
  - Production environment template
  - deploy.sh automated deployment script
  - DEPLOYMENT_GUIDE.md

- **Day 13: Testing & Documentation**
  - Vitest test framework setup
  - 261 unit tests across all modules
  - Integration tests for key flows
  - Security tests (OWASP compliance)
  - Swagger/OpenAPI documentation at /api-docs
  - USER_GUIDE.md
  - QA_TEST_PLAN.md
  - TEST_EXECUTION_RESULTS.md
  - COMPLIANCE_REPORT.md

- **Day 12: Integrations & Export/Import**
  - CSV/JSON export for 7 entity types
  - Bulk CSV import with validation
  - Import templates
  - Webhook system with 15 event types
  - Webhook management UI
  - ExportImportPage (Data Management)

- **Day 11: Analytics Dashboards**
  - Executive dashboard
  - Practice dashboard
  - Financial dashboard
  - Project health dashboard
  - AnalyticsPage with 4 tabs

- **Day 10: Intelligence Layer**
  - Smart resource matching algorithm
  - Skill gap analysis
  - Utilization insights
  - Resource recommendations
  - SmartSearchPage with 3 tabs

- **Day 9: Advanced Bench Management**
  - 5-tab BenchAnalysisPage (Overview, Resources, Rolloffs, Alerts, Forecast)
  - Bench cost calculation
  - 90-day forecast
  - Quick allocation modal
  - Bench alerts system

- **Day 8: Timesheet Management**
  - Weekly timesheet grid
  - Time entry per project
  - Submit/Approve workflow
  - TimesheetsPage

- **Day 7: Contract Management**
  - Contract CRUD (MSA, SOW, CR)
  - Contract lifecycle workflow
  - ContractsPage and ContractDetailPage

- **Day 6: Reporting Foundation**
  - ReportsPage with standard reports
  - Report generation endpoints

- **Day 5: Dashboard & Analytics**
  - DashboardPage with KPI cards
  - Utilization charts
  - Trend visualization

- **Day 4: Client Management**
  - Client CRUD operations
  - Contact management
  - ClientsPage

- **Day 3: Core CRUD Operations**
  - ResourcesPage with filters
  - ResourceDetailPage
  - ProjectsPage
  - AllocationsPage

- **Day 2: Authentication & Base UI**
  - JWT authentication
  - Argon2 password hashing
  - LoginPage with branded design
  - MainLayout with sidebar

- **Day 1: Foundation**
  - Turborepo monorepo structure
  - Prisma schema (20+ entities)
  - Express API with TypeScript
  - React + Vite + TailwindCSS frontend
  - Docker configuration (PostgreSQL + Redis)
  - Multi-tenant architecture

### Security
- OWASP Top 10 compliance
- SQL injection prevention (Prisma)
- XSS protection (CSP, Content-Type)
- CSRF protection (SameSite cookies)
- Rate limiting
- Helmet security headers
- JWT with short expiry (15 min)
- Refresh token rotation
- Tenant isolation on all queries

---

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| 1.1.0 | 2025-12-16 | Microsoft SSO, UI audit fixes, new pages |
| 1.0.0 | 2025-12-16 | Initial release, 14-day sprint complete |

---

*Changelog maintained by AI development assistant*

