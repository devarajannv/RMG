# Changelog

All notable changes to RMGaaS are documented in this file.

## [Unreleased]

### Day 12 - December 16, 2025

#### Added - Export System
- CSV and JSON export for 7 data types:
  - Resources (with skills and allocations)
  - Projects (with team details)
  - Allocations
  - Bench Report
  - Utilization Report
  - Clients
  - Skills Inventory
- Export API endpoints at `/api/v1/export/*`

#### Added - Import System
- Bulk CSV import for resources, allocations, and projects
- Import validation endpoint
- Downloadable import templates
- Update existing records option
- Detailed error reporting per row
- Import API endpoints at `/api/v1/import/*`

#### Added - Webhook System
- Webhook registration and management
- 15 event types supported
- HMAC signature verification
- Retry with exponential backoff
- Delivery history tracking
- Test webhook functionality
- Webhook API endpoints at `/api/v1/webhooks/*`

#### Added - Data Management UI
- New ExportImportPage with 3 tabs
- Export tab with download buttons (CSV/JSON)
- Import tab with file upload and validation
- Webhooks tab with configuration UI
- Added "Data Management" to sidebar navigation

---

## [0.1.0] - December 15, 2025

### Day 11 - Advanced Analytics

#### Added - Analytics Service
- Executive dashboard metrics
- Practice-level analytics
- Financial metrics with bench cost analysis
- Project health dashboard
- Location metrics
- Analytics API endpoints at `/api/v1/analytics/*`

#### Added - Analytics UI
- 4-tab AnalyticsPage component
- Executive tab with KPI cards and trend charts
- Practice tab with utilization vs target comparison
- Financial tab with cost breakdown and projections
- Projects tab with health status and staffing

---

### Day 10 - Intelligence Layer

#### Added - Smart Matching
- Resource matching algorithm with weighted scoring
- Skill gap analysis per project
- Utilization insights and recommendations
- Resource recommendations engine
- Skill inventory analysis
- Quick skill-based matching
- Optimal team composition suggestions
- Intelligence API endpoints at `/api/v1/intelligence/*`

#### Added - Smart Search UI
- SmartSearchPage with 3 tabs
- Smart search with skill selection
- Utilization insights view
- Skill inventory dashboard

---

### Day 9 - Advanced Bench Management

#### Added - Bench Analysis
- 5-tab BenchAnalysisPage:
  - Overview with summary cards
  - Bench Resources list with filters
  - Upcoming Rolloffs tracking
  - Alerts dashboard
  - Forecast projections
- Quick allocation modal
- Bench cost calculations
- Bench API endpoints at `/api/v1/bench/*`

#### Changed
- Added `benchSince` field to Resource model
- Enhanced dashboard bench statistics

---

### Day 8 - Timesheet Management

#### Added - Timesheet System
- Weekly timesheet entry grid
- Timesheet periods with status workflow
- Save/Submit/Approve/Reject actions
- Daily and weekly hour totals
- Resource selection dropdown
- Week navigation
- Timesheet API endpoints at `/api/v1/timesheets/*`

---

### Day 7 - Contract Management

#### Added - Contracts
- Contract CRUD operations
- Contract status workflow
- Contract-project association
- ContractsPage listing
- ContractDetailPage view
- Contract API endpoints at `/api/v1/contracts/*`

---

### Day 6 - Dashboard & Reporting

#### Added - Dashboard
- DashboardPage with MainLayout
- Key metrics cards (resources, utilization, bench, projects)
- Practice distribution chart
- Utilization trend chart
- Recent allocations table
- Dashboard API at `/api/v1/dashboard/*`

#### Added - Reports
- ReportsPage placeholder
- Basic utilization calculations

---

### Day 5 - Allocation Management

#### Added - Allocations
- Allocation CRUD operations
- Resource-to-project mapping
- Percentage-based allocation
- Billable/non-billable tracking
- Date range management
- AllocationsPage with grid view
- Allocation API at `/api/v1/allocations/*`

---

### Days 3-4 - Core Data Management

#### Added - Resources
- Resource CRUD operations
- Skill assignment
- Practice and location association
- ResourcesPage with filters
- ResourceDetailPage
- Resource API at `/api/v1/resources/*`

#### Added - Projects
- Project CRUD operations
- Client association
- Project status management
- ProjectsPage
- Project API at `/api/v1/projects/*`

#### Added - Clients
- Client CRUD operations
- ClientsPage
- Client API at `/api/v1/clients/*`

---

### Days 1-2 - Foundation

#### Added - Project Setup
- Turborepo monorepo structure
- Express + TypeScript backend
- React + Vite + TailwindCSS frontend
- PostgreSQL with Prisma ORM
- Redis for caching
- Docker Compose configuration

#### Added - Authentication
- JWT-based authentication
- Access and refresh tokens
- Argon2 password hashing
- Login/Logout functionality
- Protected routes

#### Added - Database Schema
- Multi-tenant architecture
- 20+ entity models
- Role-based access control
- Audit logging

#### Added - UI Foundation
- shadcn/ui component library
- MainLayout with sidebar
- Brand colors and styling
- NewVision logo integration
- DEV mode badge

---

## Development Notes

### Tech Stack
- **Frontend**: React 18, Vite, TailwindCSS, shadcn/ui, Recharts
- **Backend**: Node.js 20, Express, TypeScript
- **Database**: PostgreSQL 16, Prisma ORM
- **Cache**: Redis 7
- **Auth**: JWT, Argon2

### Default Credentials
- Email: `admin@newvision.in`
- Password: `Password123!@#`

### API Base URL
- Development: `http://localhost:4000/api/v1`

### Frontend URL
- Development: `http://localhost:3000`

