# RMGaaS Next Actions

> Prioritized roadmap for upcoming development

---

## Priority 1: Critical Enhancements

### 1.1 RBAC Enhancements
**Status:** 🔜 Planned  
**Effort:** 3-4 days

- [ ] Hierarchical data isolation
  - Practice level access
  - Delivery level access
  - Organization level access
- [ ] Granular action permissions
  - Separate create/edit/approve/delete
  - Resource-specific permissions
- [ ] Settings access levels
  - View-only vs. modify
  - Section-specific access
- [ ] Delegation/proxy permissions
  - Temporary role assignment
  - Approval delegation
- [ ] Audit trail for permission changes

### 1.2 Role Management
**Status:** 🔜 Planned  
**Effort:** 2-3 days

- [ ] Role management UI in Settings
- [ ] Custom role creation with permission builder
- [ ] Decouple designation from role
- [ ] Role assignment workflow for new employees
- [ ] Optional auto-assignment rules (admin-configurable)

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

### 3.2 Document Management
**Status:** 🔜 Planned  
**Effort:** 4-5 days

**Storage:**
- [ ] S3/Azure Blob backend
- [ ] File upload/download API
- [ ] File type validation
- [ ] Size limits

**Version Control:**
- [ ] Version on every edit
- [ ] Version history view
- [ ] Rollback capability
- [ ] Audit trail per document

**E-Signatures:**
- [ ] DocuSign integration
- [ ] Adobe Sign integration
- [ ] Signature workflow
- [ ] Signed document storage

**Access Control:**
- [ ] Document classification levels
- [ ] Role-based access matrix
- [ ] Configurable permissions
- [ ] Time-bound access for sensitive docs

---

## Priority 4: Multi-Currency

### 4.1 Currency Management
**Status:** 🔜 Planned  
**Effort:** 2-3 days

- [ ] Currency settings in organization config
- [ ] Base currency (USD default)
- [ ] Billing currency per client
- [ ] Employee home currency
- [ ] Manual exchange rate management
- [ ] Historical rate storage
- [ ] Toggle: historical vs. current rate view

### 4.2 Financial Reports Currency
**Status:** 🔜 Planned  
**Effort:** 1-2 days

- [ ] Currency switch on all financial views
- [ ] Store exchangeRateAtTransaction
- [ ] Consistent currency display

---

## Priority 5: AI Capabilities

### 5.1 AI Agent
**Status:** 🔜 Planned  
**Effort:** 10-15 days

- [ ] Natural language command interface
- [ ] Intent recognition
- [ ] Action execution for all product functions
- [ ] Context awareness
- [ ] Conversational memory
- [ ] Approval workflows for sensitive actions

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

## Timeline Estimate

| Priority | Items | Estimated Days |
|----------|-------|----------------|
| P1 | RBAC, Roles, CTC | 7-9 days |
| P2 | HubSpot, PeopleStrong | 7-9 days |
| P3 | Invoicing, Documents | 9-12 days |
| P4 | Multi-Currency | 3-5 days |
| P5 | AI Agent, Migration | 15-22 days |
| P6 | Additional | 5-7 days |
| **Total** | | **46-64 days** |

---

*Roadmap maintained by AI development assistant*

