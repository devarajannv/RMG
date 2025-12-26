# Changelog

All notable changes to RMGaaS are documented in this file.

## [Unreleased]

### December 26, 2025 - Writer Complete (100%)

#### Added - State Management & Streaming Infrastructure

**Notification Store** (`apps/frontend/src/stores/notificationStore.ts`)
- Zustand store for managing notification state
- `setNotifications`, `addNotification`, `markAsRead`, `markAllAsRead`
- `removeNotification`, `clearAll`
- Connection status tracking (`isConnected`)
- Panel visibility state (`isPanelOpen`, `togglePanel`)
- Max 100 notifications cached, auto-deduplication

**Settings Store** (`apps/frontend/src/stores/settingsStore.ts`)
- Persisted settings store with localStorage
- Display preferences: theme, language, dateFormat, currency, compactMode
- Notification preferences: email, bench alerts, rolloff reminders, weekly digest
- UI preferences: sidebarCollapsed, defaultPage, itemsPerPage
- Helper: `useFormattedDate()` hook for consistent date formatting

**SSE Streaming Support** (`apps/frontend/src/lib/api.ts`)
- Added `api.stream()` method for Server-Sent Events
- Supports streaming AI responses with callbacks
- `onMessage`, `onError`, `onComplete` handlers
- Returns `AbortController` for cancellation

**Store Barrel Export** (`apps/frontend/src/stores/index.ts`)
- Unified exports for all stores

#### Fixed
- TypeScript: Unused variables in authStore, ClientDetailPage
- TypeScript: Invalid property reference in test mocks

---

### December 26, 2025 - Settings Page Expansion & User Management

#### Added - Full User Management in Settings

**Backend User Service** (`apps/api/src/modules/users/user.service.ts`)
- `listUsers(tenantId, includeInactive)` - List users with roles and pagination
- `getUserById(userId, tenantId)` - Get single user with full details
- `createUser(tenantId, data)` - Create user with password hashing and role assignment
- `updateUser(userId, tenantId, data)` - Update user info
- `deleteUser(userId, tenantId)` - Soft delete user
- `toggleUserStatus(userId, tenantId)` - Toggle active/inactive status
- `assignRoleToUser(userId, roleId, assignedBy)` - Assign role to user
- `removeRoleFromUser(userId, roleId)` - Remove role from user
- `resetUserPassword(userId, tenantId, newPassword)` - Admin password reset

**Backend User Routes** (`apps/api/src/modules/users/user.routes.ts`)
- `GET /users` - List all users (with `?includeInactive=true` option)
- `GET /users/:id` - Get single user
- `POST /users` - Create user (requires `users:create` permission)
- `PUT /users/:id` - Update user (requires `users:update` permission)
- `DELETE /users/:id` - Delete user (requires `users:delete` permission)
- `PATCH /users/:id/status` - Toggle user status
- `POST /users/:id/roles` - Assign role to user
- `DELETE /users/:id/roles/:roleId` - Remove role from user
- `POST /users/:id/reset-password` - Reset user password

**Frontend Settings Page Expansion** (`apps/frontend/src/pages/SettingsPage.tsx`)
- **Users Tab**: Full CRUD for user management
  - Add User button with modal form
  - Edit user (name, email, password, status, roles)
  - Delete user with confirmation dialog
  - Toggle active/inactive status (click on status badge)
  - Role management modal (assign/remove roles)
  - Reset password dialog
  - Search users by name/email
  - Shows user avatar, email, roles, and status

- **Audit Logs Tab**: View system audit trail
  - Paginated audit log entries
  - Filter by entity type and action
  - Shows user, action, entity, timestamp
  - Expandable details for changes/metadata

- **Organization Tab**: Dynamic organization stats
  - Tenant information (name, code, status, created date)
  - User counts (total, active, inactive)
  - Resource counts (total, active, on bench)
  - Project counts (total, active, completed)
  - Client counts (total, active)
  - Storage/document count

**New API Modules Created:**
- `apps/api/src/modules/audit/` - Audit log service, controller, routes
- `apps/api/src/modules/organization/` - Organization stats service, controller, routes

**New Frontend Components:**
- `UserFormModal` - Create/edit user form with role checkboxes
- Reset Password Dialog
- User Role Management Modal

---

### December 19, 2025 - Workflow Builder (Visual Canvas)

#### Added - Complete Visual Workflow Builder Page

**Main Page** (`apps/frontend/src/pages/WorkflowBuilderPage.tsx` - ~1,437 lines)

1. **Workflow List View**
   - Displays all approval chains with status badges (Draft, Active, Archived, Deprecated)
   - Shows step count, request count, and scope (Tenant/Practice/Global)
   - Expandable cards to preview workflow steps
   - Search by name/code and filter by status
   - Actions: Edit, Delete, Duplicate, Activate/Deactivate, Archive

2. **Workflow Editor**
   - Create new workflows or edit existing ones
   - Form validation for required fields (code, name, at least one step)
   - Workflow details: Code (uppercase), Name, Description, Scope
   - Save/Cancel with loading states

3. **Drag-and-Drop Step Builder**
   - Add, delete, and reorder approval steps using `motion/react` Reorder
   - Visual step cards showing step number, name, approver type, and mode
   - Settings button to open configuration panel
   - Delete button per step

4. **Step Configuration Panel (3 Tabs)**
   - **Basic Tab:**
     - Step name and instructions
     - Approver type selection (Role/User/Dynamic) with visual cards
     - Role/User dropdown based on approver type
     - Approval mode (Any, All, Majority, First Response)
   - **Advanced Tab:**
     - Optional step toggle
     - Allow delegation toggle
     - Skip if unresolvable toggle
     - Conflict resolution (Rejection Wins, Approval Wins, Majority Wins)
   - **Timing & SLA Tab:**
     - SLA hours setting
     - Auto-approve after hours
     - Reminder configuration (first after, interval, max reminders)
     - Escalation settings (after hours, to role/user)

**Tests** (`apps/frontend/src/pages/WorkflowBuilderPage.test.tsx` - 12 tests)
- Renders workflow list
- Shows search input and create button
- Displays workflow status badge and step count
- Opens editor when create clicked
- Shows empty state when no workflows
- Validates required fields
- Adds new steps
- Shows step configuration panel
- Can cancel and return to list

**App Integration** (`apps/frontend/src/App.tsx`)
- Replaced `WorkflowsPlaceholder` with `WorkflowBuilderPage`
- Route `/workflows` now renders full workflow builder

**API Integration:**
- Uses existing `/api/v1/approval-chains` endpoints
- GET `/approval-chains` - List with filters
- POST `/approval-chains` - Create with steps
- PUT `/approval-chains/:id` - Update
- DELETE `/approval-chains/:id` - Delete

**Permission Integration:**
- Create button wrapped in `<Can permission={PERMISSIONS.SETTINGS_UPDATE}>`
- Edit/Delete actions permission-gated

---

### December 18, 2025 - Real-time Notifications (WebSocket)

#### Added - WebSocket Infrastructure for Live Updates

**Backend Changes:**
1. **WebSocket Server** (`apps/api/src/lib/websocket.ts`)
   - WebSocket server attached to Express HTTP server at `/ws` path
   - JWT authentication on connection via URL query parameter
   - Room-based message routing (per-user and per-tenant)
   - Heartbeat mechanism (30s ping, 60s timeout for stale connections)
   - Methods: `sendToUser()`, `sendToUsers()`, `broadcastToTenant()`, `isUserOnline()`
   - 15+ event types defined in `WS_EVENTS` constant

2. **JWT Enhancement** (`apps/api/src/lib/jwt.ts`)
   - Added `verifyToken()` function for WebSocket authentication
   - Returns `{ userId, tenantId }` or null if invalid

3. **Server Integration** (`apps/api/src/index.ts`)
   - HTTP server wrapper for WebSocket support
   - WebSocket manager initialization on startup
   - Graceful shutdown handling for WebSocket connections
   - Added ws dependency (`ws` + `@types/ws`)

4. **Notification Service Integration** (`apps/api/src/modules/requests/notification.service.ts`)
   - Emits `NOTIFICATION` event when notification created
   - Emits `NOTIFICATION_COUNT` event with updated unread count
   - Supports both single and bulk notifications via WebSocket

**Frontend Changes:**
5. **WebSocket Hook** (`apps/frontend/src/hooks/useWebSocket.ts`)
   - `useWebSocket()` - Low-level connection management with auto-reconnect
   - `useNotifications()` - High-level hook for notification subscriptions
   - Auto-connect when user is authenticated
   - 5 reconnection attempts with 3s interval
   - Event type constants matching backend

6. **Notification Panel** (`apps/frontend/src/components/notifications/NotificationPanel.tsx`)
   - Live notification feed with real-time updates
   - Mark as read / Mark all read functionality
   - Click to navigate to action URL
   - Visual notification type styling (color + icon)
   - `NotificationBell` component with animated unread badge
   - Green dot indicator for WebSocket connection status

7. **MainLayout Update** (`apps/frontend/src/components/layout/MainLayout.tsx`)
   - Replaced mock notification panel with real `NotificationPanel`
   - Replaced static bell icon with `NotificationBell` component

**WebSocket Event Types:**
- `notification` - New notification received
- `notification:read` - Notification marked as read
- `notification:count` - Unread count updated
- `request:created`, `request:updated`, `request:status_changed`, `request:assigned`
- `approval:required`, `approval:completed`, `approval:rejected`
- `resource:updated`, `resource:allocation_changed`
- `system:announcement`

---

### December 18, 2025 - Permission System (Frontend)

#### Added - Comprehensive Frontend Permission System

**Components Created:**
1. **usePermissions Hook** (`apps/frontend/src/hooks/usePermissions.ts`)
   - React Query based permission fetching with 5-minute caching
   - `can` object with boolean flags for common permissions
   - `hasPermission(permission)` - Check single permission
   - `hasRole(role)` - Check user role
   - `canAccessModule(module)` - Check module access
   - 50+ permission constants defined (PERMISSIONS object)
   - Helper functions exported for use outside React

2. **Can/Cannot Components** (`apps/frontend/src/components/permissions/Can.tsx`)
   - `<Can permission="...">` - Show children if permission granted
   - `<Cannot permission="...">` - Show children if permission denied
   - `<CanAccess anyPermission={[...]}/>` - Multiple permission check
   - `<AdminOnly>`, `<ManagerOnly>` - Role-based gates
   - `ifCan` HOC for wrapping components with permission checks

**Files Updated:**
3. **MainLayout Navigation** (`apps/frontend/src/components/layout/MainLayout.tsx`)
   - NavItem interface extended with `permissions` and `roles` properties
   - `filteredNavSections` filters navigation based on user permissions
   - Workflow Builder requires admin role
   - Settings requires settings:read permission

4. **ResourcesPage** (`apps/frontend/src/pages/ResourcesPage.tsx`)
   - Add Resource button wrapped in `<Can permission={PERMISSIONS.RESOURCES_CREATE}>`
   - Edit/Delete actions permission-gated in dropdown menu

5. **RequestsPage** (`apps/frontend/src/pages/RequestsPage.tsx`)
   - New Request button wrapped in `<Can permission={PERMISSIONS.REQUESTS_CREATE}>`

**Test Infrastructure:**
6. **Test Utils** (`apps/frontend/src/test/utils.tsx`)
   - QueryClient pre-populated with admin permissions for testing
   - Ensures permission queries resolve immediately in tests

7. **Test Setup** (`apps/frontend/src/test/setup.ts`)
   - Auth store initialized with mock user before tests
   - Prevents permission queries from failing

8. **Mock Handlers** (`apps/frontend/src/test/mocks/handlers.ts`)
   - Added permissions array to mock user response
   - Added `/api/v1/auth/permissions` handler

**Permission Format:** `module:action:scope`
- Examples: `resources:create`, `resources:read:team`, `workflows:manage`
- Scope levels: `own`, `team`, `practice`, `org`

---

### December 17, 2025 - Inactive Resource Handling

#### Added - Comprehensive Inactive/Former Employee Management

**Backend Changes:**
1. **Dashboard Metrics Update** (`apps/api/src/modules/dashboard/dashboard.service.ts`)
   - `total` resource count now shows only ACTIVE employees (was showing all)
   - Added new `inactive` count field to DashboardMetrics
   - Dashboard displays: total (active), inactive, onBench, onNotice

2. **Resource API Default Filter** (`apps/api/src/modules/resources/resource.controller.ts`)
   - Default status filter changed from all to `['ACTIVE']` only
   - Added `includeInactive=true` query parameter to fetch all resources when needed
   - All resource dropdowns (allocations, managers) now show only active employees by default

3. **Resource Status Change Validation** (`apps/api/src/modules/resources/resource.service.ts`)
   - Cannot mark a resource as INACTIVE if they have active/upcoming allocations
   - Error message: "Cannot mark resource as INACTIVE. They have X active/upcoming allocation(s). Please end or reassign their allocations first."

4. **Allocation Validation** (`apps/api/src/modules/allocations/allocation.service.ts`)
   - Enhanced error message when trying to allocate inactive resources
   - Error: "Resource is not active (status: INACTIVE). Only active resources can be allocated to projects."
   - Applies to both create and bulk allocation operations

**Frontend Changes:**
5. **Resources Page Toggle** (`apps/frontend/src/pages/ResourcesPage.tsx`)
   - Added "Show Former Employees" toggle switch in filters section
   - Toggle is OFF by default (shows only active)
   - Visual distinction for inactive/former employees:
     - Reduced opacity (60%)
     - Gray background
     - "Former" badge next to employee name
   - Status badge shows "Former" instead of "Inactive" for better UX

**Data Impact:**
- Active employees: 655
- Inactive/Former employees: 854
- Total in database: 1,509 (from CSV import)

**User Experience:**
- Clean, active-focused views by default across the entire application
- Easy toggle to see former employees when needed (historical data, rehiring)
- Clear visual indication when viewing former employees
- Prevents accidental allocation of former employees
- Proper workflow for offboarding (must reassign allocations first)

---

### December 17, 2025 - UI Bug Fixes

#### Fixed - Authentication & Page Rendering Issues
- **Login Page Flash**: Fixed auth store hydration issue where login page would flash and reload
  - Added `hasHydrated` state to auth store
  - Added immediate hydration on store initialization
  - App now waits for hydration before rendering protected components
  
- **Resources Page Crash**: Fixed "Objects are not valid as a React child" error
  - Skills API returns nested objects `{skill: {name: 'X'}}` not flat strings
  - Added `getSkillName()` and `getSkillNames()` helper functions
  - Updated skills display in table to extract skill names correctly
  
- **Resources Page Missing Sidebar**: Added MainLayout wrapper to ResourcesPage
  - Page was missing the sidebar navigation
  - Wrapped entire page content in `<MainLayout>` component
  
- **Data Management Navigation**: Fixed sidebar link mismatch
  - Sidebar linked to `/export-import` but route was `/data-management`
  - Updated MainLayout.tsx to use correct `/data-management` path

#### Files Modified
- `apps/frontend/src/stores/authStore.ts` - Added hasHydrated state and immediate hydration
- `apps/frontend/src/App.tsx` - Added AuthenticatedAgentWidgets component with hydration check
- `apps/frontend/src/components/AgentWidget.tsx` - Added auth check before API calls
- `apps/frontend/src/pages/ResourcesPage.tsx` - Fixed skills rendering, added MainLayout
- `apps/frontend/src/components/layout/MainLayout.tsx` - Fixed Data Management link

---

### December 17, 2025 - Comprehensive Frontend Test Coverage

#### Added - Complete Frontend Test Suite (204 tests across 18 files)

**New Test Files Created:**
| Page | Test File | Tests |
|------|-----------|-------|
| SettingsPage | `SettingsPage.test.tsx` | 15 tests |
| AnalyticsPage | `AnalyticsPage.test.tsx` | 10 tests |
| BenchAnalysisPage | `BenchAnalysisPage.test.tsx` | 14 tests |
| ReportsPage | `ReportsPage.test.tsx` | 19 tests |
| TimesheetsPage | `TimesheetsPage.test.tsx` | 8 tests |
| SmartSearchPage | `SmartSearchPage.test.tsx` | 9 tests |
| ExportImportPage | `ExportImportPage.test.tsx` | 11 tests |
| ResourceDetailPage | `ResourceDetailPage.test.tsx` | 3 tests |
| ProjectDetailPage | `ProjectDetailPage.test.tsx` | 3 tests |
| ClientDetailPage | `ClientDetailPage.test.tsx` | 2 tests |
| ContractDetailPage | `ContractDetailPage.test.tsx` | 2 tests |

**Test Coverage Includes:**
- Page rendering and title verification
- Tab navigation and switching (Settings, Analytics, BenchAnalysis, etc.)
- Category filtering (Reports page)
- Loading states and spinners
- Error states and recovery
- Button availability and interactions
- Form element presence
- Navigation between pages

**Mock Handlers Added:**
- Bench endpoints: `/bench/summary`, `/bench/resources`, `/bench/rolloffs`, `/bench/alerts`, `/bench/forecast`
- Timesheets endpoints: `/timesheets/weekly`, `/timesheets/save`, `/timesheets/submit`
- Analytics endpoints: `/analytics/executive`, `/analytics/practice`, `/analytics/financial`, `/analytics/projects`

**Total Frontend Tests: 204 (from 108 → 204, +96 new tests)**

---

### December 17, 2025 - Currency Bug Fix & Functional Tests

#### Fixed - Currency Dropdown Bug
- **Issue**: Currency dropdown loaded but selecting currencies did nothing
- **Root Cause**: Frontend called wrong API endpoints
  - `/currency` instead of `/currency/currencies`
  - `/currency/convert` instead of `/currency/exchange-rates/convert`
- **Files Fixed**:
  - `apps/frontend/src/pages/DashboardPage.tsx` (lines 200, 219)
  - `apps/frontend/src/pages/ClientDetailPage.tsx` (lines 81, 96)
  - `apps/frontend/src/pages/AnalyticsPage.tsx` (lines 171, 195)

#### Added - DashboardPage Functional Tests (24 tests)
- Created `apps/frontend/src/pages/DashboardPage.test.tsx`
- Tests verify actual API integration, not just UI rendering
- Currency selector tests:
  - Loads currencies from `/currency/currencies`
  - Calls `/currency/exchange-rates/convert` on currency change
  - Displays exchange rate for non-base currencies
  - Updates financial values when currency changes
- Dashboard data tests:
  - Loads metrics from `/dashboard/metrics`
  - Loads utilization trend from `/dashboard/utilization-trend`
  - Loads practice utilization from `/dashboard/practice-utilization`
  - Loads capacity forecast from `/dashboard/capacity-forecast`
- Refresh functionality tests
- Error handling with Try Again button
- All chart sections render correctly

#### Added - MSW Handler Updates
- Added dashboard endpoint handlers in `apps/frontend/src/test/mocks/handlers.ts`:
  - `GET /dashboard/metrics`
  - `GET /dashboard/utilization-trend`
  - `GET /dashboard/practice-utilization`
  - `GET /dashboard/capacity-forecast`
  - `POST /currency/exchange-rates/convert`
- Updated mock currencies to use INR as base currency (matches production)

#### Documentation
- Created `docs/FUNCTIONAL_TEST_TODO.md` - Detailed progress tracking
- Created `docs/CONTINUE_FUNCTIONAL_TESTS_PROMPT.md` - Continuation prompt for next session

**Total Frontend Tests: 65 (41 existing + 24 new DashboardPage tests)**

---

### December 17, 2025 - Frontend Test Suite Rebuild

#### Added - Real Frontend Integration Tests
- Purged fake test suite (~2000 lines of `expect(true).toBe(true)` tests)
- Installed MSW (Mock Service Worker) for API mocking
- Installed @testing-library/user-event for realistic interactions
- Created comprehensive test infrastructure:
  - `vitest.config.ts` with jsdom environment
  - `src/test/setup.ts` with MSW server lifecycle
  - `src/test/mocks/handlers.ts` (~600 lines covering all API endpoints)
  - `src/test/mocks/server.ts` for MSW server
  - `src/test/utils.tsx` with renderWithProviders helper
- 41 real integration tests across 6 pages:
  - ResourcesPage: 13 tests (rendering, CRUD modal, search, filter, delete)
  - ProjectsPage: 6 tests (rendering, add modal, form fields, cancel)
  - ClientsPage: 6 tests (rendering, add modal, form fields, cancel)
  - AllocationsPage: 6 tests (rendering, add modal, form fields, cancel)
  - ContractsPage: 7 tests (rendering, add modal, form fields, cancel, search)
  - SettingsPage: 3 tests (rendering, tabs navigation)

#### Fixed
- Dialog component now has `role="dialog"` and `aria-modal="true"` for accessibility
- Mock data structure mismatches in Contract (added `currency`, `_count.projects`)
- Added missing API endpoint handlers (`/allocations/rolloffs`, `/auth/refresh`)
- ContractsPage stats endpoint structure (`byStatus['ACTIVE']` pattern)

#### Discovered (Documented for Future Fix)
- SettingsPage API bug: Currency/Roles queries incorrectly expect raw arrays

---

### Post Day 14 - December 16, 2025

#### Added - Microsoft 365 SSO Integration
- MSAL Node backend (`@azure/msal-node`)
- MSAL Browser frontend (`@azure/msal-browser`)
- OAuth 2.0 Authorization Code flow
- User auto-provisioning on first SSO login
- Existing user account linking by email
- Microsoft SSO button on login page
- SSO API endpoints:
  - `GET /api/v1/auth/microsoft/status` - Check SSO configuration
  - `GET /api/v1/auth/microsoft` - Initiate OAuth flow
  - `GET /api/v1/auth/microsoft/callback` - Handle OAuth callback
  - `POST /api/v1/auth/microsoft/token` - Token exchange for SPAs
- `microsoftId` field added to User model
- Setup documentation (`docs/MICROSOFT_SSO_SETUP.md`)

#### Added - Comprehensive Test Suite
- Microsoft SSO unit tests (8 tests)
- Microsoft SSO integration tests (36 tests)
- Security tests (51 OWASP-focused tests)
- Auth integration tests (22 tests)
- Resource integration tests (45 tests)
- Allocation integration tests (48 tests)
- Functional test script (`scripts/run-functional-tests.sh`)
- **Total: 261 automated tests**

#### Added - Compliance Documentation
- QA Test Plan (`docs/QA_TEST_PLAN.md`)
- Data Flow Audit (`docs/DATA_FLOW_AUDIT.md`)
- Test Execution Results (`docs/TEST_EXECUTION_RESULTS.md`)
- Compliance Report (`docs/COMPLIANCE_REPORT.md`)

#### Fixed
- Invalid UUID now returns HTTP 400 (was 500)
- User provisioning `isNewUser` logic corrected

---

### Day 14 - December 16, 2025

#### Added - Production Deployment
- Multi-stage Docker builds for API and frontend
- Production Docker Compose configuration
- Nginx reverse proxy with SSL/TLS support
- Rate limiting configuration
- Gzip compression
- Security headers
- Deployment automation script (`scripts/deploy.sh`)
- Backup and restore procedures
- Health check endpoints
- Production environment template
- Deployment guide (`docs/DEPLOYMENT_GUIDE.md`)

---

### Day 13 - December 16, 2025

#### Added - Testing Framework
- Vitest configuration with Prisma mocks
- Unit tests for auth service (11 tests)
- Unit tests for intelligence service (14 tests)
- Unit tests for export service (12 tests)
- Unit tests for import service (14 tests)
- Test setup with environment mocking

#### Added - API Documentation
- OpenAPI 3.0 specification
- Swagger UI at `/api-docs`
- JSDoc comments on all controllers
- Request/response schema documentation

#### Added - User Documentation
- User guide (`docs/USER_GUIDE.md`)
- Feature documentation
- Quick start guide
- FAQ section

---

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

## [0.1.0] - December 15-16, 2025

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
- **Auth**: JWT, Argon2, Microsoft SSO (MSAL)
- **Testing**: Vitest, Supertest
- **API Docs**: Swagger/OpenAPI

### Default Credentials
- Email: `admin@newvision.in`
- Password: `Password123!@#`

### Available Personas
| Role | Email |
|------|-------|
| Super Admin | admin@newvision.in |
| Resource Manager | resource.manager@newvision.in |
| Practice Head | practice.head@newvision.in |
| Project Manager | project.manager@newvision.in |
| HR Manager | hr.manager@newvision.in |
| Finance | finance@newvision.in |
| Team Lead | team.lead@newvision.in |
| Resource | resource@newvision.in |

### API Base URL
- Development: `http://localhost:4000/api/v1`
- API Docs: `http://localhost:4000/api-docs`

### Frontend URL
- Development: `http://localhost:3000`

### Test Suite
- **Total Tests**: 261
- **Unit Tests**: 51
- **Integration Tests**: 166
- **Security Tests**: 44

### Microsoft SSO
- Requires Azure AD app registration
- See `docs/MICROSOFT_SSO_SETUP.md` for setup
