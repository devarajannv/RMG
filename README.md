# RMGaaS

> **Resource Management & Governance as a Service**  
> *THINK FORWARD*

![NewVision Software](New-Vision-2023.png)

Enterprise-grade platform for managing professional services workforce allocation, utilization, and governance.

---

## 📚 Critical Documentation

> **⚠️ AI Assistants: Read these files first!**

| Document | Purpose | Location |
|----------|---------|----------|
| **ARCHITECTURE.md** | Source of truth for all decisions | `/ARCHITECTURE.md` |
| **ALIGNMENT_TRACKER.md** | Implementation progress tracker | `/ALIGNMENT_TRACKER.md` |

### The Writer + Scribe Model

This product follows the **Writer + Scribe** architecture:

- **Writer (Core Product):** Full-featured resource management that works independently
- **Scribe (AI Layer):** AI acceleration that makes everything faster but is never required

**Key Principle:** If AI APIs go down, users remain fully productive via traditional UI.

See `ARCHITECTURE.md` for complete details.

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm 10+

### Development Setup

```bash
# 1. Clone and install dependencies
npm install

# 2. Start database and Redis
docker-compose up -d postgres redis

# 3. Navigate to API and setup environment
cd apps/api
cp .env.example .env  # Edit with your values

# 4. Run database migrations
npx prisma migrate dev --name init

# 5. Seed sample data
npm run seed

# 6. Start API server (from apps/api)
npm run dev

# 7. Start frontend (from apps/frontend in another terminal)
cd ../frontend
npm run dev
```

### Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | admin@newvision.in / Password123!@# |
| API | http://localhost:4000 | - |
| API Health | http://localhost:4000/health | - |

---

## 📋 Feature Status (Writer 100% Complete + Production Polish 50%)

### ✅ Completed Features

| Phase | Feature | Status |
|-------|---------|--------|
| 1-2 | Foundation & Setup | ✅ Complete |
| 3-4 | Core Data Management (Resources, Projects, Clients) | ✅ Complete |
| 5 | Allocation Management | ✅ Complete |
| 6 | Dashboard & Basic Reporting | ✅ Complete |
| 7 | Contract Management | ✅ Complete |
| 8 | Timesheet Management | ✅ Complete |
| 9 | Advanced Bench Management | ✅ Complete |
| 10 | Intelligence Layer (Smart Matching) | ✅ Complete |
| 11 | Advanced Analytics Dashboards | ✅ Complete |
| 12 | Export/Import & Webhooks | ✅ Complete |
| 13-14 | Testing & Production Deployment | ✅ Complete |
| Post | Multi-Currency, Roles, Documents, AI Agent | ✅ Complete |
| Post | Request Flow & Approvals | ✅ Complete |
| Post | Real-time Notifications (WebSocket) | ✅ Complete |
| Post | Frontend Permission System | ✅ Complete |
| Post | **Workflow Builder (Visual Canvas)** | ✅ Complete |
| Post | **Contract Lifecycle UI (7 components)** | ✅ Complete |
| Post | **Budget Tracking Service** | ✅ Complete |

### ⏳ Production Polish (In Progress)

| Feature | Description | Status |
|---------|-------------|--------|
| Performance Testing | Load testing, Web Vitals budgets | ✅ Complete |
| Query Optimization | N+1 detection, Redis caching | ✅ Complete |
| Docker Setup | Multi-stage builds, staging config, Makefile | ✅ Complete |
| Accessibility | WCAG 2.1 AA (ARIA utilities, accessible forms) | ✅ Complete |
| Error Handling | Error boundaries, loading states | ✅ Complete |
| E2E Testing | 10 comprehensive test suites | ⏳ Foundation only |
| Kubernetes | Deployment manifests | ❌ Not started |
| CI/CD Pipeline | GitHub Actions | ❌ Not started |
| Monitoring | Health, logging, metrics | ❌ Not started |
| Dashboard Widgets | Budget, Alerts, Pipeline, Capacity | ❌ Not started |

### 🔜 Upcoming (Scribe - AI Layer)

| Feature | Description |
|---------|-------------|
| LLM Integration | Real LLM calls (replacing simulated) |
| pgvector Search | Semantic search with embeddings |
| Onboarding Agent | AI-guided user onboarding |
| Workflow Agent | AI-assisted workflow creation |

---

## 🏗️ Project Structure

```
rmgaas/
├── apps/
│   ├── api/                    # Backend API (Express + TypeScript)
│   │   ├── prisma/             # Database schema & migrations
│   │   │   ├── schema.prisma   # Prisma schema (55 models)
│   │   │   ├── seed.ts         # Sample data seeder
│   │   │   └── seed-csv.ts     # CSV import seeder
│   │   └── src/
│   │       ├── config/         # Environment configuration
│   │       ├── lib/            # Utilities (prisma, jwt, password, redis, websocket)
│   │       ├── middleware/     # Auth, error handling, logging
│   │       └── modules/        # Feature modules (22 modules)
│   │           ├── allocations/
│   │           ├── analytics/
│   │           ├── auth/
│   │           ├── bench/
│   │           ├── clients/
│   │           ├── contracts/
│   │           ├── currency/
│   │           ├── dashboard/
│   │           ├── documents/
│   │           ├── export/
│   │           ├── import/
│   │           ├── intelligence/
│   │           ├── projects/
│   │           ├── requests/     # Includes approval-chains
│   │           ├── resources/
│   │           ├── roles/
│   │           ├── timesheets/
│   │           └── webhooks/
│   └── frontend/               # Frontend (React + Vite)
│       └── src/
│           ├── components/     # UI components
│           │   ├── agent/      # AI Agent widget & command palette
│           │   ├── layout/     # MainLayout with sidebar
│           │   ├── notifications/ # Real-time notification panel
│           │   ├── permissions/   # Can/Cannot gate components
│           │   └── ui/         # shadcn/ui components
│           ├── config/         # Environment config
│           ├── hooks/          # Custom hooks (usePermissions, useWebSocket)
│           ├── lib/            # API client, utilities
│           ├── pages/          # Route pages (20 pages)
│           └── stores/         # Zustand state
├── packages/
│   └── shared/                 # Shared TypeScript types
├── docker/                     # Docker configuration
└── docs/                       # Documentation
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | User login |
| POST | `/api/v1/auth/logout` | User logout |
| POST | `/api/v1/auth/refresh` | Refresh token |
| GET | `/api/v1/auth/me` | Get current user |

### Resources
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/resources` | List resources |
| POST | `/api/v1/resources` | Create resource |
| GET | `/api/v1/resources/:id` | Get resource |
| PATCH | `/api/v1/resources/:id` | Update resource |
| DELETE | `/api/v1/resources/:id` | Delete resource |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/projects` | List projects |
| POST | `/api/v1/projects` | Create project |
| GET | `/api/v1/projects/:id` | Get project |
| PATCH | `/api/v1/projects/:id` | Update project |

### Allocations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/allocations` | List allocations |
| POST | `/api/v1/allocations` | Create allocation |
| PATCH | `/api/v1/allocations/:id` | Update allocation |
| DELETE | `/api/v1/allocations/:id` | Delete allocation |

### Clients & Contracts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/clients` | List clients |
| POST | `/api/v1/clients` | Create client |
| GET | `/api/v1/contracts` | List contracts |
| POST | `/api/v1/contracts` | Create contract |

### Timesheets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/timesheets/weekly` | Get weekly timesheet |
| POST | `/api/v1/timesheets/save` | Save timesheet entries |
| POST | `/api/v1/timesheets/submit/:periodId` | Submit timesheet |
| POST | `/api/v1/timesheets/approve/:periodId` | Approve timesheet |

### Bench Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/bench/summary` | Bench summary |
| GET | `/api/v1/bench/resources` | Bench resources |
| GET | `/api/v1/bench/rolloffs` | Upcoming rolloffs |
| GET | `/api/v1/bench/alerts` | Bench alerts |
| GET | `/api/v1/bench/forecast` | Bench forecast |
| POST | `/api/v1/bench/quick-allocate` | Quick allocate |

### Intelligence Layer
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/intelligence/match` | Smart resource matching |
| GET | `/api/v1/intelligence/skill-gap/:projectId` | Skill gap analysis |
| GET | `/api/v1/intelligence/utilization-insights` | Utilization insights |
| GET | `/api/v1/intelligence/recommendations/:projectId` | Resource recommendations |
| GET | `/api/v1/intelligence/skill-inventory` | Skill inventory |
| POST | `/api/v1/intelligence/quick-match` | Quick skill match |
| GET | `/api/v1/intelligence/optimal-team/:projectId` | Optimal team composition |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/analytics/executive` | Executive dashboard metrics |
| GET | `/api/v1/analytics/practice` | Practice-level metrics |
| GET | `/api/v1/analytics/financial` | Financial metrics |
| GET | `/api/v1/analytics/projects` | Project health metrics |
| GET | `/api/v1/analytics/locations` | Location metrics |

### Export
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/export/resources` | Export resources (CSV/JSON) |
| GET | `/api/v1/export/projects` | Export projects |
| GET | `/api/v1/export/allocations` | Export allocations |
| GET | `/api/v1/export/bench-report` | Export bench report |
| GET | `/api/v1/export/utilization-report` | Export utilization |
| GET | `/api/v1/export/clients` | Export clients |
| GET | `/api/v1/export/skills-inventory` | Export skills |

### Import
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/import/resources` | Import resources |
| POST | `/api/v1/import/allocations` | Import allocations |
| POST | `/api/v1/import/projects` | Import projects |
| POST | `/api/v1/import/validate` | Validate import data |
| GET | `/api/v1/import/template/:type` | Get import template |

### Webhooks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/webhooks` | List webhooks |
| POST | `/api/v1/webhooks` | Create webhook |
| GET | `/api/v1/webhooks/events` | Available events |
| PATCH | `/api/v1/webhooks/:id` | Update webhook |
| DELETE | `/api/v1/webhooks/:id` | Delete webhook |
| POST | `/api/v1/webhooks/:id/test` | Test webhook |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/notifications` | List user notifications |
| GET | `/api/v1/notifications/unread-count` | Get unread count |
| PUT | `/api/v1/notifications/:id/read` | Mark as read |
| PUT | `/api/v1/notifications/mark-all-read` | Mark all as read |
| GET | `/api/v1/notifications/preferences` | Get preferences |
| PUT | `/api/v1/notifications/preferences` | Update preferences |

### WebSocket
| Protocol | Endpoint | Description |
|----------|----------|-------------|
| WS | `/ws?token=<jwt>` | Real-time notifications |

**WebSocket Events:**
- `notification` - New notification received
- `notification:count` - Unread count updated
- `request:created`, `request:updated`, `request:assigned`
- `approval:required`, `approval:completed`

---

## 📄 Frontend Pages

| Page | Route | Description |
|------|-------|-------------|
| Login | `/login` | Authentication |
| Dashboard | `/` | Overview metrics & charts |
| Resources | `/resources` | Resource list & management |
| Resource Detail | `/resources/:id` | Individual resource view |
| Projects | `/projects` | Project management |
| Allocations | `/allocations` | Allocation management |
| Clients | `/clients` | Client management |
| Contracts | `/contracts` | Contract management |
| Bench Analysis | `/bench` | Bench resources & costs |
| Smart Search | `/smart-search` | Intelligence-based search |
| Timesheets | `/timesheets` | Time entry & approval |
| Reports | `/reports` | Standard reports |
| Analytics | `/analytics` | Advanced dashboards |
| Data Management | `/data-management` | Export/Import/Webhooks |
| Settings | `/settings` | System settings |

---

## 🛠️ Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start all services in development mode |
| `npm run build` | Build all packages |
| `npm run lint` | Run ESLint |
| `npm run type-check` | TypeScript type checking |
| `npm run db:migrate` | Run database migrations |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:studio` | Open Prisma Studio |
| `docker-compose up -d` | Start Docker containers |

---

## 🎨 Brand Guidelines

| Element | Value |
|---------|-------|
| Primary Color | `#1B3A5F` (Navy Charcoal) |
| Accent Color | `#F7941D` (Orange) |
| Logo | NewVision logo in sidebar |
| Font | System fonts with Inter fallback |

---

## 🔒 Authentication

- **Method**: JWT Bearer tokens
- **Access Token Expiry**: 15 minutes
- **Refresh Token**: 7 days
- **Password Hashing**: Argon2

### Default Users (from seed)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@newvision.in | Password123!@# |
| Resource Manager | rm@newvision.in | Password123!@# |

---

## 📊 Data Model

### Core Entities

- **Tenant**: Multi-tenant isolation
- **User**: Authentication & authorization
- **Resource**: Employees/contractors
- **Project**: Work assignments
- **Client**: Customer organizations
- **Contract**: Client agreements
- **Allocation**: Resource-to-project assignments
- **Skill**: Technical competencies
- **Practice**: Business units
- **Location**: Work locations

### Key Relationships

```
Tenant
  └── Users, Resources, Projects, Clients, Contracts
  
Resource
  ├── Practice (belongs to)
  ├── Location (belongs to)
  ├── Skills (many-to-many)
  └── Allocations (one-to-many)

Project
  ├── Client (belongs to)
  ├── Contract (belongs to)
  └── Allocations (one-to-many)

Allocation
  ├── Resource (belongs to)
  └── Project (belongs to)
```

---

## 🧪 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, TailwindCSS, shadcn/ui |
| Backend | Node.js 20, Express, TypeScript |
| Database | PostgreSQL 16, Prisma ORM |
| Cache | Redis 7 |
| Validation | Zod |
| State Management | Zustand, TanStack Query |
| Charts | Recharts |
| Authentication | JWT, Argon2 |
| Testing | Vitest, React Testing Library, MSW |

---

## ✅ Testing

### Test Coverage Summary

| Category | Tests | Status |
|----------|-------|--------|
| Backend API Tests | 889 | ✅ Passing |
| Frontend UI Tests | 204 | ✅ Passing |
| **Total** | **1,093** | ✅ **100%** |

### Running Tests

```bash
# Run all tests
npm run test

# Run backend tests only
cd apps/api && npm run test

# Run frontend tests only
cd apps/frontend && npm run test

# Run tests with coverage
npm run test -- --coverage
```

### Backend Test Coverage (889 tests)

- **Resources Module**: 57 tests
- **Allocations Module**: 45 tests
- **Analytics Module**: 103 tests
- **AI Migration Module**: 79 tests
- **Currency Module**: 80 tests
- **Other Modules**: 525+ tests

### Frontend Test Coverage (204 tests)

| Page | Tests | Coverage |
|------|-------|----------|
| LoginPage | 10 | Auth flow, validation |
| DashboardPage | 12 | Metrics, charts, navigation |
| ResourcesPage | 10 | CRUD, filtering, export |
| ProjectsPage | 11 | CRUD, filtering, search |
| AllocationsPage | 20 | Timeline, creation, gantt |
| ClientsPage | 12 | CRUD, filtering |
| ContractsPage | 9 | CRUD, filtering |
| SettingsPage | 15 | Tabs, form navigation |
| AnalyticsPage | 10 | Dashboard tabs |
| BenchAnalysisPage | 14 | Bench management tabs |
| ReportsPage | 19 | Report categories, export |
| TimesheetsPage | 8 | Week navigation |
| SmartSearchPage | 9 | Search, insights tabs |
| ExportImportPage | 11 | Data management tabs |
| ResourceDetailPage | 3 | Loading, error states |
| ProjectDetailPage | 3 | Loading, error states |
| ClientDetailPage | 2 | Loading, error states |
| ContractDetailPage | 2 | Loading, error states |
| **Global Components** | 24 | Layout, shared components |

---

## 📝 Environment Variables

### API (`apps/api/.env`)

```env
DATABASE_URL=postgresql://rmgaas:rmgaas_secret@localhost:5432/rmgaas_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
COOKIE_SECRET=your-cookie-secret-change-in-production
NODE_ENV=development
PORT=4000
```

### Frontend (`apps/frontend/.env`)

```env
VITE_API_URL=http://localhost:4000/api/v1
VITE_APP_ENV=development
```

---

## 📜 License

UNLICENSED - Proprietary software of NewVision Software Pvt. Ltd.

---

*Built with ❤️ by NewVision Software*
