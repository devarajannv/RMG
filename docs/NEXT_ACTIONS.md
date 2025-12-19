# RMGaaS Next Actions

> Prioritized roadmap for upcoming development
> 
> Last Updated: December 18, 2025

---

## ✅ Recently Completed (Dec 18)

### Permission System (Frontend)
**Status:** ✅ Completed

- [x] `usePermissions` hook with React Query caching
- [x] `<Can>`, `<Cannot>` permission gate components
- [x] `<AdminOnly>`, `<ManagerOnly>` role-based gates
- [x] 50+ permission constants defined
- [x] Navigation sidebar filtered by permissions
- [x] ResourcesPage/RequestsPage actions permission-gated
- [x] Test infrastructure updated for permissions

### Real-time Notifications (WebSocket)
**Status:** ✅ Completed

- [x] WebSocket server (`ws` package) at `/ws`
- [x] JWT authentication on connection
- [x] Room-based message routing (user/tenant)
- [x] Heartbeat mechanism (30s ping, 60s timeout)
- [x] `useWebSocket` hook with auto-reconnect
- [x] `useNotifications` high-level hook
- [x] `NotificationPanel` with live updates
- [x] `NotificationBell` with badge & connection indicator
- [x] Notification service emits WebSocket events

---

## ✅ Previously Completed (Dec 17)

### Comprehensive Frontend Test Coverage
**Status:** ✅ Completed

- [x] All 18 frontend pages tested (204 tests)
- [x] MSW mock handlers for all API endpoints (~800 lines)
- [x] Test infrastructure (setup.ts, utils.tsx)
- [x] Loading and error state testing
- [x] Tab navigation testing
- [x] Form interaction testing

### Total Test Coverage
| Category | Tests | Status |
|----------|-------|--------|
| Backend API | 889 | ✅ Passing |
| Frontend UI | 204 | ✅ Passing |
| **Total** | **1,093** | **100%** |

---

## ✅ Previously Completed (Dec 16)

### Multi-Currency Support
**Status:** ✅ Completed

- [x] Currency schema (Currency, ExchangeRate tables)
- [x] Currency CRUD API (6 default currencies)
- [x] Exchange rate management API
- [x] Rate conversion API (current & historical)
- [x] Currency Settings UI tab
- [ ] Currency display toggle on financial views

### Enhanced Role Management
**Status:** ✅ Schema & Core Complete

- [x] Role hierarchy (org → delivery → practice → team)
- [x] 30+ granular permissions defined
- [x] Permission model (module/action/scope)
- [x] Role assignment audit trail
- [x] Role management UI in Settings
- [x] Custom role creation API
- [ ] Permission builder UI
- [ ] Delegation/proxy permissions

### Document Storage
**Status:** ✅ Core Complete

- [x] Document schema with versioning
- [x] File upload/download API
- [x] Version control on every edit
- [x] Access control (role/user/practice)
- [x] Access logging and audit trail
- [x] Document classification levels
- [ ] S3/Azure Blob integration
- [ ] E-signature integration (DocuSign/Adobe Sign)

### AI Agent (Phase 1)
**Status:** ✅ Query-Only Complete

- [x] Query routing architecture
- [x] Natural language query processing
- [x] Conversation tracking
- [x] Rich response formatting
- [x] Floating widget UI
- [x] Command palette (Cmd+K)
- [x] Context-aware suggestions
- [ ] Session memory expansion
- [ ] LLM API integration (currently simulated)

---

## Priority 1: Critical Enhancements

### 1.1 Workflow Builder (Visual Canvas)
**Status:** 🔴 Not Started  
**Effort:** 5-7 days
**Priority:** P0 - Blocking Writer completion

- [ ] Visual drag-and-drop canvas
- [ ] Step types: Approval, Notification, Condition, Delay
- [ ] Approver selection (role/user/dynamic)
- [ ] Condition builder (if/else based on fields)
- [ ] Parallel and sequential paths
- [ ] Preview and testing mode
- [ ] Save as template

### 1.2 RBAC Enhancements (Remaining)
**Status:** ✅ Mostly Complete  
**Effort:** 1-2 days

- [x] Granular action permissions (30+ defined)
- [x] Audit trail for permission changes
- [x] Frontend permission gating (usePermissions, Can/Cannot)
- [x] Navigation filtering by permissions
- [ ] Hierarchical data isolation in queries
- [ ] Delegation/proxy permissions

### 1.3 Role Management (Remaining)
**Status:** 🟡 Partially Complete  
**Effort:** 1 day

- [x] Role management UI in Settings
- [x] Custom role creation API
- [x] Decouple designation from role
- [ ] Permission builder UI (visual)
- [ ] Role assignment workflow for new employees
- [ ] Optional auto-assignment rules

### 1.3 CTC Access Control
**Status:** 🔜 Planned  
**Effort:** 2 days

- [ ] Block default CTC visibility
- [ ] Allow self-CTC view
- [ ] Approval workflow for others' CTC
  - 2 levels above minimum
  - Head of Finance mandatory
  - Head of Delivery/Practice mandatory
- [ ] Time-bound access (configurable, max 1 year)
- [ ] Expiry alerts and auto-revocation

---

## Priority 2: Integration Layer

### 2.1 HubSpot Integration
**Status:** 🔜 Planned  
**Effort:** 3-4 days

- [ ] HubSpot OAuth integration
- [ ] Deal-to-contract mapping
- [ ] MSA/SOW/CR document types
- [ ] Task creation for client setup
- [ ] Webhook for deal closure

### 2.2 PeopleStrong Integration
**Status:** 🔜 Planned  
**Effort:** 4-5 days

- [ ] PeopleStrong API integration
- [ ] Webhook support (if available)
- [ ] Fallback batch sync
- [ ] Sync actions:
  - New hire → auto-create resource
  - Resignation → task to RM with AI rec
  - Designation change → auto-update
  - Location transfer → auto-update
  - Exit → archive resource
- [ ] Data conflict approval workflow
- [ ] Skills: RMGaaS as master

---

## Priority 3: New Modules

### 3.1 Invoicing Module
**Status:** 🔜 Planned  
**Effort:** 5-7 days

**Core:**
- [ ] Invoice entity and schema
- [ ] Invoice types: T&M, Fixed Price, Retainer, Hybrid
- [ ] Line item management

**Automation:**
- [ ] Auto-generate from approved timesheets
- [ ] Apply contract rates (role/resource-based)
- [ ] Multi-currency conversion at invoice date

**Workflow:**
- [ ] Draft → Finance Review → Manager Approval → Sent
- [ ] Client preview option
- [ ] PDF generation

**Payments:**
- [ ] Payment tracking
- [ ] Partial payments
- [ ] Payment terms from contract
- [ ] Auto-reminders
- [ ] Overdue escalation

**Reports:**
- [ ] Revenue by client/project/practice
- [ ] Aging (30/60/90/120 days)
- [ ] DSO (Days Sales Outstanding)
- [ ] Forecast vs. Actual billing
- [ ] Unbilled hours alert

**Integrations:**
- [ ] Tally export
- [ ] QuickBooks integration
- [ ] Zoho Books integration
- [ ] GST/E-invoice compliance (India)

### 3.2 Document Management (Remaining)
**Status:** 🟡 Core Complete  
**Effort:** 2-3 days remaining

**Storage:**
- [x] Local file storage (abstracted for cloud)
- [x] File upload/download API
- [x] File type validation (via mimetype)
- [x] Size limits (50MB default)
- [ ] S3/Azure Blob backend integration

**Version Control:**
- [x] Version on every edit
- [x] Version history API
- [ ] Rollback capability
- [x] Audit trail per document

**E-Signatures:**
- [ ] DocuSign integration
- [ ] Adobe Sign integration
- [ ] Signature workflow
- [ ] Signed document storage

**Access Control:**
- [x] Document classification levels (4)
- [x] Role-based access matrix
- [x] User/practice permissions
- [x] Time-bound access support

---

## Priority 4: Multi-Currency (Remaining)

### 4.1 Currency Management
**Status:** 🟡 Core Complete  
**Effort:** 1 day remaining

- [x] Currency settings API
- [x] Base currency (USD default)
- [x] 6 default currencies (USD, INR, EUR, GBP, AUD, SGD)
- [x] Manual exchange rate management
- [x] Historical rate storage
- [x] Conversion API (current & historical)
- [ ] Billing currency per client field
- [ ] Employee home currency field
- [ ] Toggle: historical vs. current rate view UI

### 4.2 Financial Reports Currency
**Status:** 🔜 Planned  
**Effort:** 1-2 days

- [ ] Currency switch on all financial views
- [ ] Store exchangeRateAtTransaction on records
- [ ] Consistent currency display

---

## Priority 5: AI Capabilities (Remaining)

### 5.1 AI Agent
**Status:** 🟡 Phase 1 Complete  
**Effort:** 5-7 days for Phase 2

**Phase 1 (Complete):**
- [x] Natural language query interface
- [x] Query classification and routing
- [x] Rich response formatting
- [x] Conversation tracking
- [x] Floating widget + Cmd+K UI

**Phase 2 (Pending):**
- [ ] Real LLM API integration (Gemini/OpenAI)
- [ ] Write operations (with approval)
- [ ] Full context awareness
- [ ] Extended session memory

### 5.2 AI Migration Tool
**Status:** 🔜 Planned  
**Effort:** 5-7 days

- [ ] Multi-format data ingestion (CSV, Excel, JSON)
- [ ] AI-powered data scrubbing
- [ ] Automatic field mapping
- [ ] Data validation and sanitization
- [ ] Duplicate detection
- [ ] Conflict resolution UI
- [ ] Bulk migration with progress tracking

---

## Priority 6: Additional Enhancements

### 6.1 Leave & Availability
- [ ] Integration with PeopleStrong leave data
- [ ] Manual leave entry fallback
- [ ] Availability calendar
- [ ] Leave impact on allocations

### 6.2 Capacity Planning
- [ ] Demand forecasting
- [ ] Pipeline deal integration
- [ ] Skill gap projection
- [ ] Hiring recommendations

### 6.3 Subcontractors/Partners
- [ ] Partner resource management
- [ ] Different cost models
- [ ] Compliance tracking
- [ ] Partner billing

---

## Technical Debt

- [ ] Migrate webhooks from in-memory to database
- [ ] Implement email notification system
- [ ] Add request caching layer
- [ ] Optimize database queries
- [ ] Add database connection monitoring
- [ ] Implement CDN for static assets

---

## Timeline Estimate (Updated)

| Priority | Items | Original Est. | Completed | Remaining |
|----------|-------|---------------|-----------|-----------|
| P1 | RBAC, Roles, CTC | 7-9 days | 5 days | 2-3 days |
| P2 | HubSpot, PeopleStrong | 7-9 days | - | 7-9 days |
| P3 | Invoicing, Documents | 9-12 days | 3 days | 6-9 days |
| P4 | Multi-Currency | 3-5 days | 2 days | 1-2 days |
| P5 | AI Agent, Migration | 15-22 days | 4 days | 10-15 days |
| P6 | Additional | 5-7 days | - | 5-7 days |
| **Total** | | **46-64 days** | **14 days** | **32-45 days** |

---

*Roadmap maintained by AI development assistant*

